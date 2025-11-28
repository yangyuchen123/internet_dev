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

# 为每个用户创建独立的VectorStore实例的字典
user_stores = {}

# 为指定用户获取或创建VectorStore实例
def get_user_store(user: str) -> VectorStore:
    if user not in user_stores:
        # 为每个用户创建独立的索引和元数据路径
        user_index_path = os.path.join(os.path.dirname(INDEX_PATH), f"index_{user}.faiss")
        user_meta_path = os.path.join(os.path.dirname(META_PATH), f"meta_{user}.json")
        user_stores[user] = VectorStore(embedder=embedder, index_path=user_index_path, meta_path=user_meta_path)
    return user_stores[user]


class IngestRaw(BaseModel):
    source: str = Field('raw', description="来源：raw 或 db")
    title: str
    category: str
    text: str
    keywords: Optional[str] = None
    chunkSize: int = 500
    chunkOverlap: int = 50
    user: str = Field(..., description="用户标识")


class IngestDB(BaseModel):
    source: str = Field('db', description="来源：raw 或 db")
    ids: List[int]
    user: str = Field(..., description="用户标识")


class HybridSearchReq(BaseModel):
    q: str
    topK: int = 5
    category: Optional[str] = None
    alpha: float = 0.7
    beta: float = 0.3
    user: str = Field(..., description="用户标识")


class SearchReq(BaseModel):
    q: str
    topK: int = 5
    category: Optional[str] = None
    user: str = Field(..., description="用户标识")


class SyncDBReq(BaseModel):
    category: Optional[str] = None
    limit: int = 1000
    user: str = Field(..., description="用户标识")


class HealthReq(BaseModel):
    user: str = Field(..., description="用户标识")


class DeleteByTitleReq(BaseModel):
    user: str = Field(..., description="用户标识")
    title: str = Field(..., description="要删除的标题")


class DeleteByCategoryReq(BaseModel):
    user: str = Field(..., description="用户标识")
    category: str = Field(..., description="要删除的类别")


@app.post("/rag/health")
def health(req: HealthReq) -> Dict[str, Any]:
    user_store = get_user_store(req.user)
    return {"code": 0, "message": "OK", "data": {"index_count": user_store.count(), "model": MODEL_NAME}}


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


@app.post("/rag/ingest")
def ingest(payload: Dict[str, Any]):
    # 从payload中获取user
    user = payload.get('user')
    if not user:
        raise HTTPException(status_code=400, detail="参数 user 不能为空")
    # 获取用户的VectorStore实例
    user_store = get_user_store(user)
    
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
            'content': c,
            'user': user  # 添加用户信息到元数据
        } for c in chunks]
        try:
            user_store.add_texts(chunks, metas)
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
            kw = like_search(str(kid), None, 1, user)
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
                'content': text,
                'user': user  # 添加用户信息到元数据
            })
        if not texts:
            return {"code": 0, "message": "OK", "data": {"ingested": 0}}
        user_store.add_texts(texts, metas)
        return {"code": 0, "message": "OK", "data": {"ingested": len(texts)}}
    else:
        raise HTTPException(status_code=400, detail="不支持的 source")


@app.post("/rag/search")
def search(req: SearchReq):
    if not req.q:
        raise HTTPException(status_code=400, detail="参数 q 不能为空")
    user_store = get_user_store(req.user)
    res = user_store.search(req.q, topK=req.topK, category=req.category)
    return {"code": 0, "message": "OK", "data": res}


@app.post("/rag/hybrid-search")
def hybrid_search(req: HybridSearchReq):
    if not req.q:
        raise HTTPException(status_code=400, detail="参数 q 不能为空")
    # 获取用户的VectorStore实例
    user_store = get_user_store(req.user)
    # 多取一些候选，避免两路各自去重后导致信息缺失
    vec_res = user_store.search(req.q, topK=max(req.topK * 2, req.topK), category=req.category)
    try:
        kw_res = like_search(req.q, req.category, topK=max(req.topK * 2, req.topK), user=req.user)
    except Exception as e:
        # 当数据库不可用时，关键词检索回退为空集合，保证接口仍可用
        kw_res = []
    merged = merge_results(vec_res, kw_res, alpha=req.alpha, beta=req.beta)
    return {"code": 0, "message": "OK", "data": merged[:req.topK]}


@app.post("/rag/sync-db")
def sync_db(req: SyncDBReq):
    # 获取用户的VectorStore实例
    user_store = get_user_store(req.user)
    # 从 DB 批量读取构建索引（简单示例：按 LIKE 拉取全部）
    kw_res = like_search('', req.category, topK=req.limit, user=req.user)  # 空查询返回全部（实现上可能不支持，实际请改为全量 select）
    texts = [i.get('content', '') for i in kw_res]
    metas = [{
        'title': i.get('title'), 'category': i.get('category'),
        'keywords': i.get('keywords'), 'content': i.get('content', ''),
        'user': req.user  # 添加用户信息到元数据
    } for i in kw_res]
    if not texts:
        return {"code": 0, "message": "OK", "data": {"ingested": 0}}
    user_store.add_texts(texts, metas)
    return {"code": 0, "message": "OK", "data": {"ingested": len(texts)}}


@app.post("/rag/delete-by-title")
def delete_by_title(req: DeleteByTitleReq):
    """
    根据标题删除用户向量库中的内容
    """
    print(f"[API] 收到删除请求，用户: {req.user}，标题: {req.title}")
    try:
        user_store = get_user_store(req.user)
        print(f"[API] 获取用户存储成功")
        deleted_count = user_store.delete_by_title(req.title)
        print(f"[API] 删除操作完成，删除数量: {deleted_count}")
        return {"code": 0, "message": "OK", "data": {"deleted": deleted_count}}
    except Exception as e:
        print(f"[API] 删除失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除失败: {e}")


@app.post("/rag/delete-by-category")
def delete_by_category(req: DeleteByCategoryReq):
    """
    根据类别删除用户向量库中的内容
    """
    print(f"[API] 收到删除请求，用户: {req.user}，类别: {req.category}")
    try:
        user_store = get_user_store(req.user)
        print(f"[API] 获取用户存储成功")
        deleted_count = user_store.delete_by_category(req.category)
        print(f"[API] 删除操作完成，删除数量: {deleted_count}")
        return {"code": 0, "message": "OK", "data": {"deleted": deleted_count}}
    except Exception as e:
        print(f"[API] 删除失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除失败: {e}")
