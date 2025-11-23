from typing import List, Optional, Dict, Any

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    # 优先按包导入（若已安装为 rag_service 包）
    from rag_service.config import INDEX_PATH, META_PATH, MODEL_NAME, DB_CONFIG
    from rag_service.services.embedder import Embedder
    from rag_service.services.vector_store import VectorStore
    from rag_service.services.db import like_search
    from rag_service.services.hybrid_search import merge_results
except ImportError:
    # 回退为本地相对导入（当前目录运行）
    from config import INDEX_PATH, META_PATH, MODEL_NAME, DB_CONFIG
    from services.embedder import Embedder
    from services.vector_store import VectorStore
    from services.db import like_search
    from services.hybrid_search import merge_results

# 数据库连接函数
def get_db_connection():
    return pymysql.connect(
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        database=DB_CONFIG['database'],
        cursorclass=pymysql.cursors.DictCursor
    )

# 确保导入pymysql
try:
    import pymysql
except ImportError:
    pass  # 假设services.db中已处理pymysql导入


app = FastAPI(title="RAG Service", version="0.1")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

embedder = Embedder(model_name=MODEL_NAME)
store = VectorStore(embedder=embedder, index_path=INDEX_PATH, meta_path=META_PATH)


class IngestRaw(BaseModel):
    source: str = Field('raw', description="来源：raw 或 db")
    title: str
    category: str
    text: str
    keywords: Optional[str] = None
    chunkSize: int = 500
    chunkOverlap: int = 50


class IngestDB(BaseModel):
    source: str = Field('db', description="来源：raw 或 db")
    ids: List[int]


class HybridSearchReq(BaseModel):
    q: str
    topK: int = 5
    category: Optional[str] = None
    alpha: float = 0.7
    beta: float = 0.3


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"code": 0, "message": "OK", "data": {"index_count": store.count(), "model": MODEL_NAME}}


def chunk_text(text: str, size: int, overlap: int) -> List[str]:
    text = (text or '').strip()
    if not text:
        return []
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + size, n)
        chunks.append(text[start:end])
        start = start + size - overlap
        if start < 0:
            break
    return chunks


@app.post("/ingest")
def ingest(payload: Dict[str, Any]):
    source = payload.get('source', 'raw')
    if source == 'raw':
        try:
            req = IngestRaw(**payload)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"参数错误: {e}")
        chunks = chunk_text(req.text, req.chunkSize, req.chunkOverlap)
        metas = [{
            'title': req.title,
            'category': req.category,
            'keywords': req.keywords or '',
            'content': c
        } for c in chunks]
        try:
            store.add_texts(chunks, metas)
        except Exception as e:
            # 捕获底层入库错误（如 faiss/文件写入/模型编码异常），返回明确错误信息
            raise HTTPException(status_code=500, detail=f"向量入库失败: {e}")
        return {"code": 0, "message": "OK", "data": {"ingested": len(chunks)}}
    elif source == 'db':
        try:
            req = IngestDB(**payload)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"参数错误: {e}")
        # 从 DB 获取内容，按记录入库（不再分片假设 DB 已分片）
        texts, metas = [], []
        # 简化：逐个 id 做单条 LIKE 检索的近似（真实应按 id 精确查询）
        for kid in req.ids:
            kw = like_search(str(kid), None, 1)
            if not kw:
                continue
            item = kw[0]
            text = item.get('content') or ''
            texts.append(text)
            metas.append({
                'id': item.get('id'),
                'title': item.get('title'),
                'category': item.get('category'),
                'keywords': item.get('keywords'),
                'source': item.get('source'),
                'content': text
            })
        if not texts:
            return {"code": 0, "message": "OK", "data": {"ingested": 0}}
        store.add_texts(texts, metas)
        return {"code": 0, "message": "OK", "data": {"ingested": len(texts)}}
    else:
        raise HTTPException(status_code=400, detail="不支持的 source")


@app.get("/search")
def search(q: str, topK: int = 5, category: Optional[str] = None):
    if not q:
        raise HTTPException(status_code=400, detail="参数 q 不能为空")
    res = store.search(q, topK=topK, category=category)
    return {"code": 0, "message": "OK", "data": res}


@app.post("/hybrid-search")
def hybrid_search(req: HybridSearchReq):
    if not req.q:
        raise HTTPException(status_code=400, detail="参数 q 不能为空")
    # 多取一些候选，避免两路各自去重后导致信息缺失
    vec_res = store.search(req.q, topK=max(req.topK * 2, req.topK), category=req.category)
    try:
        kw_res = like_search(req.q, req.category, topK=max(req.topK * 2, req.topK))
    except Exception as e:
        # 当数据库不可用时，关键词检索回退为空集合，保证接口仍可用
        kw_res = []
    merged = merge_results(vec_res, kw_res, alpha=req.alpha, beta=req.beta)
    return {"code": 0, "message": "OK", "data": merged[:req.topK]}


@app.post("/sync-db")
def sync_db(category: Optional[str] = None, limit: int = 1000):
    # 从 DB 批量读取构建索引（简单示例：按 LIKE 拉取全部）
    kw_res = like_search('', category, topK=limit)  # 空查询返回全部（实现上可能不支持，实际请改为全量 select）
    texts = [i.get('content', '') for i in kw_res]
    metas = [{
        'id': i.get('id'), 'title': i.get('title'), 'category': i.get('category'),
        'keywords': i.get('keywords'), 'source': i.get('source'), 'content': i.get('content', '')
    } for i in kw_res]
    if not texts:
        return {"code": 0, "message": "OK", "data": {"ingested": 0}}
    store.add_texts(texts, metas)
    return {"code": 0, "message": "OK", "data": {"ingested": len(texts)}}
