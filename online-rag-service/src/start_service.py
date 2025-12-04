import os
import sys
import logging
import traceback

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("service.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("rag_service")

def main():
    try:
        logger.info("Starting RAG service...")
        logger.info(f"Current directory: {os.getcwd()}")
        logger.info(f"Python path: {sys.path}")
        
        # 尝试导入必要的模块
        logger.info("Importing modules...")
        from fastapi import FastAPI
        import uvicorn
        
        # 导入配置
        logger.info("Importing config...")
        from config import SERVICE_CONFIG, DATA_DIR
        # 创建必要的目录
        os.makedirs(DATA_DIR, exist_ok=True)
        
        # 确认 app 模块可以正常导入
        logger.info("Importing app module...")
        import app
        logger.info(f"App imported successfully: {app}")
        
        # 启动服务
        logger.info("Starting uvicorn server...")
        uvicorn.run(
            "app:app",
            host=SERVICE_CONFIG['host'],
            port=SERVICE_CONFIG['port'],
            log_level=SERVICE_CONFIG['log_level'],
            reload=False
        )
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        logger.error(traceback.format_exc())
        print(f"Import error: {e}")
        print(traceback.format_exc())
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        logger.error(traceback.format_exc())
        print(f"Unexpected error: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    print("Starting RAG service with error handling...")
    main()