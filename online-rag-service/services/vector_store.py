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
    def __init__(self, embedder,  user_id: Optional[str] = None):
        self.embedder = embedder
        self.lock = threading.Lock()
        self.user_id = user_id
        
        # 使用Qdrant服务
        self.client = QdrantClient(
            host=QDRANT_CONFIG['host'],
            port=QDRANT_CONFIG['port']
        )
        
        # 动态生成集合名称，支持多用户空间
        base_collection_name = QDRANT_CONFIG.get('collection_name', 'knowledge_base')
        if user_id:
            # 为特定用户创建专用集合
            self.collection_name = f"{base_collection_name}_{user_id}"
            print(f"[VectorStore] 使用用户专属集合: {self.collection_name}")
        else:
            # 使用默认集合
            self.collection_name = base_collection_name
            print(f"[VectorStore] 使用默认集合: {self.collection_name}")
        
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


    def count(self) -> int:
        try:
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
        
        vecs = self.embedder.encode(texts)
        vecs = np.asarray(vecs, dtype='float32')
        
        with self.lock:
            # 记录添加前的索引大小
            before_count = self.count()
            
            # 准备要添加的点
            points = []
            for i, (vec, meta) in enumerate(zip(vecs, metas)):
                # 使用自增整数作为唯一ID
                point_id = before_count + i + 1
                points.append(PointStruct(id=point_id, vector=vec.tolist(), payload=meta))
            
            # 添加到Qdrant
            self.client.upsert(collection_name=self.collection_name, points=points)
            
            # 记录添加后的索引大小
            after_count = self.count()
            print(f"[VectorStore] 索引更新: 从 {before_count} 条增加到 {after_count} 条记录")
        
            # 保存更改（Qdrant自动保存）
            print(f"[VectorStore] 数据已保存到Qdrant")

    def search(self, q: str, topK: int = 5, category: Optional[str] = None) -> List[Dict]:
        """
        在Qdrant中检索相似文本 (使用 query_points 的修正版)
        """
        # 生成查询向量
        qv = self.embedder.encode([q])
        qv = np.asarray(qv, dtype='float32')
        
        # 构建过滤条件
        filters = None
        if category:
            filters = Filter(
                must=[FieldCondition(key="category", match=MatchValue(value=category))]
            )
        
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
    
    
    def delete_by_title(self, title: str) -> int:
        """根据标题直接删除 (优化版)"""
        print(f"[VectorStore] 开始删除标题为 '{title}' 的记录")
        if not title:
            return 0
            
        with self.lock:
            # 1. 构建过滤器
            filter = Filter(
                must=[FieldCondition(key="title", match=MatchValue(value=title))]
            )
            
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

    def delete_by_category(self, category: str) -> int:
        """根据类别直接删除 (优化版)"""
        print(f"[VectorStore] 开始删除类别为 '{category}' 的记录")
        if not category:
            return 0
            
        with self.lock:
            filter = Filter(
                must=[FieldCondition(key="category", match=MatchValue(value=category))]
            )
            
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