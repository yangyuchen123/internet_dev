import os
import os.path as osp

# 尝试加载环境变量文件
# 首先尝试加载.env.docker（Docker环境）
docker_env_file = osp.join(osp.dirname(__file__), '.env.docker')
if os.path.exists(docker_env_file):
    try:
        with open(docker_env_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip() and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    # 移除可能的引号
                    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                        value = value[1:-1]
                    os.environ[key] = value
    except Exception as e:
        print(f"Failed to load .env.docker: {e}")

# 简化的配置文件
BASE_DIR = osp.dirname(__file__)

# 数据相关配置
DATA_DIR = os.getenv('RAG_DATA_DIR', osp.join(BASE_DIR, 'data', 'kb'))
INDEX_PATH = os.getenv('RAG_INDEX_PATH', osp.join(DATA_DIR, 'index.faiss'))
META_PATH = os.getenv('RAG_META_PATH', osp.join(DATA_DIR, 'meta.json'))

# 模型配置 - 根据环境使用不同的默认路径
# Docker环境默认使用/app/model，本地环境使用原始路径
# 从环境变量中获取模型名称，若不存在则使用默认值
MODEL_NAME = os.getenv('RAG_MODEL_NAME', r'.\model')

# 数据库配置
DB_CONFIG = {
    'host': os.getenv('RAG_DB_HOST', 'localhost'),
    'port': int(os.getenv('RAG_DB_PORT', '3306')),
    'user': os.getenv('RAG_DB_USER', 'root'),
    'password': os.getenv('RAG_DB_PASS', 'root'),
    'database': os.getenv('RAG_DB_NAME', 'mental_health')
}

# 服务配置
SERVICE_CONFIG = {
    'host': '0.0.0.0',
    'port': 8000, 
    'log_level': 'info'
}