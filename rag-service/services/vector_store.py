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
            faiss.write_index(self.index, self.index_path)
            with open(self.meta_path, 'w', encoding='utf-8') as f:
                json.dump(self.meta, f, ensure_ascii=False, indent=2)

    def count(self) -> int:
        try:
            return int(self.index.ntotal)
        except Exception:
            return len(self.meta)

    def add_texts(self, texts: List[str], metas: List[Dict[str, Any]]):
        assert len(texts) == len(metas), 'texts 与 metas 长度需一致'
        vecs = self.embedder.encode(texts)
        vecs = np.asarray(vecs, dtype='float32')
        with self.lock:
            self.index.add(vecs)
            self.meta.extend(metas)
        self.save()

    def search(self, q: str, topK: int = 5, category: Optional[str] = None):
        qv = self.embedder.encode([q])
        qv = np.asarray(qv, dtype='float32')
        D, I = self.index.search(qv, topK)
        res = []
        for score, idx in zip(D[0].tolist(), I[0].tolist()):
            if idx < 0 or idx >= len(self.meta):
                continue
            item = dict(self.meta[idx])
            if category and item.get('category') and item.get('category') != category:
                continue
            item['score_vec'] = float(score)
            res.append(item)
        return res