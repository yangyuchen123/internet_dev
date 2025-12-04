import json
import os
import threading
import time
from typing import Dict, List, Any, Optional

import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct, SearchRequest, Filter, FieldCondition, MatchValue

# 导入配置
from config import QDRANT_CONFIG


class VectorStore:
    def __init__(self, embedder, user_id: Optional[str] = None):
        self.embedder = embedder
        self.lock = threading.Lock()
        # 保留user_id参数以便在元数据中使用，但不再用于集合命名
        self.user_id = user_id
        
        # 使用Qdrant服务
        self.client = QdrantClient(
            host=QDRANT_CONFIG['host'],
            port=QDRANT_CONFIG['port']
        )
        
        # 所有用户共享同一个集合
        self.collection_name = QDRANT_CONFIG.get('collection_name', 'knowledge_base')
        print(f"[VectorStore] 使用共享集合: {self.collection_name}")
        
        # 确保集合存在
        self._ensure_collection()


    def _ensure_collection(self):
        # 创建集合（如果不存在）
        try:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config={"size": self.embedder.dimension(), "distance": "Cosine"}
            )
            print(f"[VectorStore] 已创建集合: {self.collection_name}")
        except Exception as e:
            # 集合可能已存在
            print(f"[VectorStore] 集合 {self.collection_name} 可能已存在或创建失败: {str(e)}")


    def count(self, user: str = None, category: str = None) -> int:
        try:
            # 构建过滤条件
            filter_conditions = []
            if user:
                filter_conditions.append({"key": "user", "match": {"value": user}})
            if category:
                filter_conditions.append({"key": "category", "match": {"value": category}})
            
            # 如果有过滤条件，则使用过滤查询
            if filter_conditions:
                filter_condition = {"must": filter_conditions}
                return self.client.count(collection_name=self.collection_name, filter=filter_condition).count
            else:
                # 无过滤条件，返回所有记录数
                return self.client.count(collection_name=self.collection_name).count
        except Exception:
            return 0

    def add_texts(self, texts: List[str], metas: List[Dict[str, Any]]):
        assert len(texts) == len(metas), 'texts 与 metas 长度需一致'
        
        # 记录数据存储的详细信息
        print(f"[VectorStore] 开始添加数据: {len(texts)} 条记录")
        print(f"[VectorStore] 向量维度: {self.embedder.dimension()}")
        print(f"[VectorStore] Qdrant集合: {self.collection_name}")
        
        # 记录部分元数据样例用于调试
        if metas:
            print(f"[VectorStore] 元数据示例: {json.dumps(metas[0], ensure_ascii=False, indent=2)}")
            if len(metas) > 1:
                print(f"[VectorStore] 最后一条元数据示例: {json.dumps(metas[-1], ensure_ascii=False, indent=2)}")
        
        # 从元数据中提取用户信息（只需要第一个用户信息用于统计）
        user = None
        if metas and 'user' in metas[0]:
            user = metas[0]['user']
        
        vecs = self.embedder.encode(texts)
        vecs = np.asarray(vecs, dtype='float32')
        
        with self.lock:
            # 记录添加前的索引大小（传递用户参数）
            before_count = self.count(user=user)
            
            # 准备要添加的点
            points = []
            for i, (vec, meta) in enumerate(zip(vecs, metas)):
                # 使用自增整数作为唯一ID
                point_id = before_count + i + 1
                points.append(PointStruct(id=point_id, vector=vec.tolist(), payload=meta))
            
            # 添加到Qdrant
            self.client.upsert(collection_name=self.collection_name, points=points)
            
            # 记录添加后的索引大小（传递用户参数）
            after_count = self.count(user=user)
            print(f"[VectorStore] 索引更新: 从 {before_count} 条增加到 {after_count} 条记录")
        
            # 保存更改（Qdrant自动保存）
            print(f"[VectorStore] 数据已保存到Qdrant")

    def search(self, q: str, topK: int = 5, category: Optional[str] = None, user: str = None) -> List[Dict]:
        """
        在Qdrant中检索相似文本 (使用 query_points 的修正版)
        """
        # 生成查询向量
        qv = self.embedder.encode([q])
        qv = np.asarray(qv, dtype='float32')
        
        # 构建过滤条件
        conditions = []
        # 添加用户过滤条件，确保用户只能访问自己的数据
        if user:
            conditions.append(FieldCondition(key="user", match=MatchValue(value=user)))
        # 添加类别过滤条件
        if category:
            conditions.append(FieldCondition(key="category", match=MatchValue(value=category)))
        
        filters = Filter(must=conditions) if conditions else None

        
        # 使用 query_points (确定你的客户端有这个方法)
        results = self.client.query_points(
            collection_name=self.collection_name,
            query=qv[0].tolist(),  # 在 query_points 中参数名通常是 query
            query_filter=filters,
            limit=topK,
            with_payload=True,
            with_vectors=False
        )
        
        # 格式化结果
        res = []
        # --- 核心修复：必须访问 .points 属性 ---
        # query_points 返回的是一个对象，包含 points 列表
        points_list = results.points 
        
        for result in points_list:
            item = dict(result.payload)
            item['score_vec'] = float(result.score)
            res.append(item)
            
        return res
    
    
    def delete_by_title(self, title: str, user: str = None) -> int:
        """根据标题直接删除 (优化版)"""
        print(f"[VectorStore] 开始删除标题为 '{title}' 的记录，用户: {user}")
        if not title:
            return 0
            
        with self.lock:
            # 1. 构建过滤器
            conditions = [FieldCondition(key="title", match=MatchValue(value=title))]
            # 添加用户过滤条件，确保用户只能删除自己的数据
            if user:
                conditions.append(FieldCondition(key="user", match=MatchValue(value=user)))
            
            filter = Filter(must=conditions)
            
            # 2. 直接按条件删除 (原子操作，更快)
            # 注意：delete 操作通常返回 UpdateResult，不直接包含删除行数
            # 如果非常需要知道删除了多少条，必须先 count，但这会降低性能。
            # 这里我们假设只要不报错就是成功。
            try:
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=filter
                    #points=Filter(must=[FieldCondition(key=’rand_number’, range=Range(gte=0.7))])
                )
                print(f"[VectorStore] 已执行删除标题 '{title}' 的操作")
                return 1 # 返回 1 表示操作成功提交
            except Exception as e:
                print(f"[VectorStore] 删除失败: {e}")
                return 0

    def delete_by_category(self, category: str, user: str = None) -> int:
        """根据类别直接删除 (优化版)"""
        print(f"[VectorStore] 开始删除类别为 '{category}' 的记录，用户: {user}")
        if not category:
            return 0
            
        with self.lock:
            conditions = [FieldCondition(key="category", match=MatchValue(value=category))]
            # 添加用户过滤条件，确保用户只能删除自己的数据
            if user:
                conditions.append(FieldCondition(key="user", match=MatchValue(value=user)))
            
            filter = Filter(must=conditions)
            
            try:
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=filter
                )
                print(f"[VectorStore] 已执行删除类别 '{category}' 的操作")
                return 1
            except Exception as e:
                print(f"[VectorStore] 删除失败: {e}")
                return 0