import json
import os
import threading
import time
from typing import Dict, List, Any, Optional

import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct, SearchRequest, Filter, FieldCondition, MatchValue


class VectorStore:
    def __init__(self, embedder, index_path: str, meta_path: str):
        self.embedder = embedder
        self.index_path = index_path
        self.meta_path = meta_path
        self.lock = threading.Lock()
        
        # 使用Qdrant本地存储
        self.client = QdrantClient(path=os.path.dirname(index_path))
        
        # 集合名称基于索引路径生成，确保每个用户有独立的集合
        self.collection_name = os.path.basename(index_path).replace('.faiss', '')
        
        # 确保集合存在
        self._ensure_collection()
        
        # 不再需要单独的meta文件，元数据存储在Qdrant的points中
        self.meta: List[Dict[str, Any]] = []

    def _ensure_collection(self):
        # 创建集合（如果不存在）
        try:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config={"size": self.embedder.dimension(), "distance": "Cosine"}
            )
        except Exception:
            # 集合可能已存在
            pass

    def _load(self):
        # Qdrant会自动加载数据，这里不需要额外的加载逻辑
        pass

    def save(self):
        # Qdrant会自动保存数据，这里不需要额外的保存逻辑
        print(f"[VectorStore] 数据已自动保存到Qdrant")

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
                # 使用时间戳和索引作为唯一ID
                point_id = f"{int(time.time())}_{i}_{before_count}"
                points.append(PointStruct(id=point_id, vector=vec.tolist(), payload=meta))
            
            # 添加到Qdrant
            self.client.upsert(collection_name=self.collection_name, points=points)
            
            # 记录添加后的索引大小
            after_count = self.count()
            print(f"[VectorStore] 索引更新: 从 {before_count} 条增加到 {after_count} 条记录")
        
            # 保存更改（Qdrant自动保存）
            print(f"[VectorStore] 数据已保存到Qdrant")

    def search(self, q: str, topK: int = 5, category: Optional[str] = None):
        qv = self.embedder.encode([q])
        qv = np.asarray(qv, dtype='float32')
        
        # 构建过滤条件
        filters = None
        if category:
            filters = Filter(
                must=[FieldCondition(key="category", match=MatchValue(value=category))]
            )
        
        # 在Qdrant中搜索
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=qv[0].tolist(),
            limit=topK,
            query_filter=filters
        )
        
        res = []
        for result in results:
            item = dict(result.payload)
            item['score_vec'] = float(result.score)
            res.append(item)
        return res
    
    def delete_by_title(self, title: str) -> int:
        """
        根据标题删除向量库中的内容
        
        Args:
            title: 要删除的标题
            
        Returns:
            删除的记录数量
        """
        print(f"[VectorStore] 开始删除标题为 '{title}' 的记录")
        if not title:
            print(f"[VectorStore] 标题为空，不执行删除")
            return 0
            
        with self.lock:
            # 获取所有匹配标题的点
            filter_condition = Filter(
                must=[FieldCondition(key="title", match=MatchValue(value=title))]
            )
            
            # 搜索匹配的点
            matches = self.client.search(
                collection_name=self.collection_name,
                query_vector=[0.0] * self.embedder.dimension(),  # 任意向量，我们只需要过滤
                limit=1000,  # 设置一个足够大的限制
                query_filter=filter_condition
            )
            
            deleted_count = len(matches)
            print(f"[VectorStore] 找到匹配的标题记录数量: {deleted_count}")
            
            # 删除匹配的点
            if deleted_count > 0:
                point_ids = [match.id for match in matches]
                self.client.delete(collection_name=self.collection_name, points_selector=point_ids)
                print(f"[VectorStore] 已删除标题为 '{title}' 的 {deleted_count} 条记录")
            
            return deleted_count
    
    def delete_by_category(self, category: str) -> int:
        """
        根据类别删除向量库中的内容
        
        Args:
            category: 要删除的类别
            
        Returns:
            删除的记录数量
        """
        print(f"[VectorStore] 开始删除类别为 '{category}' 的记录")
        if not category:
            print(f"[VectorStore] 类别为空，不执行删除")
            return 0
            
        with self.lock:
            # 获取所有匹配类别的点
            filter_condition = Filter(
                must=[FieldCondition(key="category", match=MatchValue(value=category))]
            )
            
            # 搜索匹配的点
            matches = self.client.search(
                collection_name=self.collection_name,
                query_vector=[0.0] * self.embedder.dimension(),  # 任意向量，我们只需要过滤
                limit=1000,  # 设置一个足够大的限制
                query_filter=filter_condition
            )
            
            deleted_count = len(matches)
            print(f"[VectorStore] 找到匹配的类别记录数量: {deleted_count}")
            
            # 删除匹配的点
            if deleted_count > 0:
                point_ids = [match.id for match in matches]
                self.client.delete(collection_name=self.collection_name, points_selector=point_ids)
                print(f"[VectorStore] 已删除类别为 '{category}' 的 {deleted_count} 条记录")
            
            return deleted_count