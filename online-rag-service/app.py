from typing import List, Optional, Dict, Any
from typing import Union
import os
import pymysql  # 提前导入，避免运行时错误
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

# 工具函数移到顶部，避免干扰路由注册
def chunk_text(text: str, size: int, overlap: int) -> List[str]:
    # 对文本进行简单的按字符数分片（不考虑语义）
    # 确保输入文本非空
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

# 初始化 FastAPI 实例
app = FastAPI(title="RAG Service", version="0.1")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化嵌入模型
embedder = Embedder(model_name=MODEL_NAME)

# 为每个用户创建独立的VectorStore实例的字典
user_stores = {}

# 为指定用户获取或创建VectorStore实例
def get_user_store(user: str) -> VectorStore:
    if user not in user_stores:
        user_stores[user] = VectorStore(embedder=embedder, user_id=user)
        print(f"[APP] 为用户 {user} 创建了专属向量存储")
    return user_stores[user]

# Pydantic 模型定义（集中放在一起，便于维护）
class IngestRaw(BaseModel):
    source: str = Field('raw', description="来源：raw 或 db")
    title: str = Field(..., description="标题")
    category: str = Field(..., description="类别")
    text: str = Field(..., description="文本内容")
    keywords: Optional[str] = None
    chunkSize: int = 500
    chunkOverlap: int = 50
    user: str = Field(..., description="用户标识")

class IngestDB(BaseModel):
    source: str = Field('db', description="来源：raw 或 db")
    ids: List[int] = Field(..., description="要同步的数据库ID列表")
    user: str = Field(..., description="用户标识")

class HybridSearchReq(BaseModel):
    q: str = Field(..., description="查询文本") 
    topK: int = Field(5, description="返回的结果数量")
    category: Optional[str] = None
    alpha: float = 0.7
    beta: float = 0.3
    user: str = Field(..., description="用户标识")

class SearchReq(BaseModel):
    q: str = Field(..., description="查询文本") 
    topK: int = Field(5, description="返回的结果数量")
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

# 接口定义（按功能分类，装饰器紧贴函数）
@app.post("/rag/health", response_model=Dict[str, Any])
def health(req: HealthReq) -> Dict[str, Any]:
    """健康检查接口"""
    if req.user == '':
        return {"code": 0, "message": "OK", "data": {"model": MODEL_NAME}}
    # 补充完整的返回逻辑，避免语法风险
    return {"code": 0, "message": "OK", "user": req.user, "data": {"model": MODEL_NAME}}

@app.post("/rag/ingest", response_model=Dict[str, Any])
def ingest( req: Union[IngestRaw, IngestDB]):
    """数据入库接口（支持raw文本/数据库ID）"""
    # 从payload中获取user
    user = req.user
    if not user:
        raise HTTPException(status_code=400, detail="参数 user 不能为空")
    # 获取用户的VectorStore实例
    user_store = get_user_store(user)
    if isinstance(req, IngestRaw):
        # 处理 Raw 模式
        if req.source != 'raw': 
            # 这是一个防御性检查，因为 Pydantic 可能已经根据字段匹配了
            pass 
            
        chunks = chunk_text(req.text, req.chunkSize, req.chunkOverlap)
        metas = [{
            'title': req.title,
            'category': req.category,
            'keywords': req.keywords or '',
            'content': c,
            'user': user
        } for c in chunks]
        
        try:
            user_store.add_texts(chunks, metas)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"向量入库失败: {e}")
        return {"code": 0, "message": "OK", "data": {"ingested": len(chunks)}}

    elif isinstance(req, IngestDB):
        # 处理 DB 模式
        # ... (这里放入你原来的 DB 处理逻辑) ...
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
        # 理论上 FastAPI 验证通过后不会走到这里
        raise HTTPException(status_code=400, detail="无效的请求参数")


@app.post("/rag/search", response_model=Dict[str, Any])
def search(req: SearchReq):
    """纯向量检索接口"""
    if not req.q:
        raise HTTPException(status_code=400, detail="参数 q 不能为空")
    user_store = get_user_store(req.user)
    try:
        res = user_store.search(req.q, topK=req.topK, category=req.category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"向量检索失败: {e}")
    return {"code": 0, "message": "OK", "user": req.user, "data": res}

@app.post("/rag/hybrid-search", response_model=Dict[str, Any])
def hybrid_search(req: HybridSearchReq):
    """混合检索接口（向量+关键词）"""
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

@app.post("/rag/sync-db", response_model=Dict[str, Any])
def sync_db(req: SyncDBReq):
    """批量同步数据库内容到向量库"""
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

@app.post("/rag/delete-by-title", response_model=Dict[str, Any])
def delete_by_title(req: DeleteByTitleReq):
    """根据标题删除用户向量库中的内容"""
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

@app.post("/rag/delete-by-category", response_model=Dict[str, Any])
def delete_by_category(req: DeleteByCategoryReq):
    """根据类别删除用户向量库中的内容"""
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

