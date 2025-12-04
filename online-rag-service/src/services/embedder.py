from typing import List
import numpy as np
import dashscope
from config import DASHSCOPE_API_KEY


class Embedder:
    def __init__(self, model_name: str = "text-embedding-v1"):
        self.model_name = model_name
        # 设置DashScope API密钥
        dashscope.api_key = DASHSCOPE_API_KEY
        if not dashscope.api_key:
            raise RuntimeError("DASHSCOPE_API_KEY 未设置")
    
    def dimension(self) -> int:
        # DashScope text-embedding-v1 模型的维度是1536
        return 1536

    def encode(self, texts: List[str]) -> np.ndarray:
        # 使用DashScope API获取embedding
        response = dashscope.TextEmbedding.call(
            model=self.model_name,
            input=texts
        )
        if response.status_code == 200:
            embeddings = [item['embedding'] for item in response.output['embeddings']]
            return np.array(embeddings, dtype='float32')
        else:
            raise Exception(f"Embedding failed: {response.code} - {response.message}")