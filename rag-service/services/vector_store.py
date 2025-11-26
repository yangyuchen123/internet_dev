import json
import os
import threading
from typing import Dict, List, Any, Optional

import faiss
import numpy as np


class VectorStore:
    def __init__(self, embedder, index_path: str, meta_path: str):
        self.embedder = embedder
        self.index_path = index_path
        self.meta_path = meta_path
        self.lock = threading.Lock()
        self.index = None
        self.meta: List[Dict[str, Any]] = []

        self._ensure_dirs()
        self._load()

    def _ensure_dirs(self):
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        os.makedirs(os.path.dirname(self.meta_path), exist_ok=True)

    def _load(self):
        dim = self.embedder.dimension()
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            self.index = faiss.IndexFlatIP(dim)

        if os.path.exists(self.meta_path):
            with open(self.meta_path, 'r', encoding='utf-8') as f:
                self.meta = json.load(f)
        else:
            self.meta = []

    def save(self):
        with self.lock:
            print(f"[VectorStore] 开始保存数据...")
            print(f"[VectorStore] 保存向量索引到: {os.path.abspath(self.index_path)}")
            faiss.write_index(self.index, self.index_path)
            
            print(f"[VectorStore] 保存元数据到: {os.path.abspath(self.meta_path)}")
            print(f"[VectorStore] 元数据记录数量: {len(self.meta)}")
            with open(self.meta_path, 'w', encoding='utf-8') as f:
                json.dump(self.meta, f, ensure_ascii=False, indent=2)
            
            # 验证保存是否成功
            if os.path.exists(self.index_path):
                index_size = os.path.getsize(self.index_path) / 1024 / 1024  # 转换为MB
                print(f"[VectorStore] 向量索引保存成功，文件大小: {index_size:.2f} MB")
            
            if os.path.exists(self.meta_path):
                meta_size = os.path.getsize(self.meta_path) / 1024  # 转换为KB
                print(f"[VectorStore] 元数据保存成功，文件大小: {meta_size:.2f} KB")

    def count(self) -> int:
        try:
            return int(self.index.ntotal)
        except Exception:
            return len(self.meta)

    def add_texts(self, texts: List[str], metas: List[Dict[str, Any]]):
        assert len(texts) == len(metas), 'texts 与 metas 长度需一致'
        
        # 记录数据存储的详细信息
        print(f"[VectorStore] 开始添加数据: {len(texts)} 条记录")
        print(f"[VectorStore] 向量维度: {self.embedder.dimension()}")
        print(f"[VectorStore] 索引文件路径: {os.path.abspath(self.index_path)}")
        print(f"[VectorStore] 元数据文件路径: {os.path.abspath(self.meta_path)}")
        
        # 记录部分元数据样例用于调试
        if metas:
            print(f"[VectorStore] 元数据示例: {json.dumps(metas[0], ensure_ascii=False, indent=2)}")
            if len(metas) > 1:
                print(f"[VectorStore] 最后一条元数据示例: {json.dumps(metas[-1], ensure_ascii=False, indent=2)}")
        
        vecs = self.embedder.encode(texts)
        vecs = np.asarray(vecs, dtype='float32')
        
        with self.lock:
            # 记录添加前的索引大小
            before_count = self.index.ntotal
            self.index.add(vecs)
            self.meta.extend(metas)
            # 记录添加后的索引大小
            after_count = self.index.ntotal
            print(f"[VectorStore] 索引更新: 从 {before_count} 条增加到 {after_count} 条记录")
        
        self.save()
        print(f"[VectorStore] 数据已保存到磁盘")

    def search(self, q: str, topK: int = 5, category: Optional[str] = None, user: Optional[str] = None):
        qv = self.embedder.encode([q])
        qv = np.asarray(qv, dtype='float32')
        D, I = self.index.search(qv, topK)
        res = []
        for score, idx in zip(D[0].tolist(), I[0].tolist()):
            if idx < 0 or idx >= len(self.meta):
                continue
            item = dict(self.meta[idx])
            # 检查用户权限，如果提供了user参数且不匹配，则跳过
            if user and item.get('user') and item.get('user') != user:
                continue
            if category and item.get('category') and item.get('category') != category:
                continue
            item['score_vec'] = float(score)
            res.append(item)
        return res