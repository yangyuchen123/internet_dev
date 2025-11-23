from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer


class Embedder:
    def __init__(self, model_name: str = 'BAAI/bge-small-zh-v1.5'):
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)

    def dimension(self) -> int:
        try:
            return self.model.get_sentence_embedding_dimension()
        except Exception:
            emb = self.model.encode(['测试'], normalize_embeddings=True)
            return int(emb.shape[1])

    def encode(self, texts: List[str]) -> np.ndarray:
        return self.model.encode(texts, normalize_embeddings=True)