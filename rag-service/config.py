import os
import os.path as osp


# 基础路径
BASE_DIR = osp.dirname(__file__)

# 数据配置 - 使用当前文件夹下的data/kb
DATA_DIR = os.getenv('RAG_DATA_DIR', osp.join(BASE_DIR, 'data', 'kb'))
INDEX_PATH = os.getenv('RAG_INDEX_PATH', osp.join(DATA_DIR, 'index.faiss'))
META_PATH = os.getenv('RAG_META_PATH', osp.join(DATA_DIR, 'meta.json'))

# 确保数据目录存在
os.makedirs(DATA_DIR, exist_ok=True)

# 配置项
MODEL_NAME = os.getenv('RAG_MODEL_NAME', r'.\model')

DB_CONFIG = {
    'host': os.getenv('RAG_DB_HOST', 'localhost'),
    'port': int(os.getenv('RAG_DB_PORT', '3306')),
    'user': os.getenv('RAG_DB_USER', 'demo_user'),
    'password': os.getenv('RAG_DB_PASS', 'demo_pass_123'),
    'database': os.getenv('RAG_DB_NAME', 'demo_db')
}

SERVICE_CONFIG = {
    'host': '0.0.0.0',
    'port': 8000,
    'log_level': 'info'
}