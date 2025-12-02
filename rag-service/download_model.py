#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
模型自动下载脚本
用于从HuggingFace下载预训练模型到本地目录
"""

import os
import sys
import argparse
import logging
from huggingface_hub import snapshot_download, HfApi
from tqdm import tqdm
import time

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('download_model.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# 支持的默认模型列表
DEFAULT_MODELS = {
    'zh-small': 'BAAI/bge-small-zh-v1.5',
    'zh-base': 'BAAI/bge-base-zh-v1.5',
    'zh-large': 'BAAI/bge-large-zh-v1.5',
    'en-small': 'BAAI/bge-small-en-v1.5',
    'en-base': 'BAAI/bge-base-en-v1.5',
    'en-large': 'BAAI/bge-large-en-v1.5'
}

def ensure_directory(path):
    """确保目录存在"""
    try:
        os.makedirs(path, exist_ok=True)
        logger.info(f"确保目录存在: {path}")
        return True
    except Exception as e:
        logger.error(f"创建目录失败: {str(e)}")
        return False

def check_directory_permission(path):
    """检查目录权限"""
    try:
        # 测试写权限
        test_file = os.path.join(path, '.permission_test')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        logger.info(f"目录权限检查通过: {path}")
        return True
    except Exception as e:
        logger.error(f"目录权限不足: {str(e)}")
        return False

def check_disk_space(path, required_gb=2):
    """检查磁盘空间是否足够"""
    try:
        # 获取磁盘空间信息
        free_bytes = os.statvfs(path).f_bfree * os.statvfs(path).f_frsize
        free_gb = free_bytes / (1024 ** 3)
        
        if free_gb >= required_gb:
            logger.info(f"磁盘空间检查通过: 可用 {free_gb:.2f} GB, 需求 {required_gb} GB")
            return True
        else:
            logger.warning(f"磁盘空间不足: 可用 {free_gb:.2f} GB, 需求 {required_gb} GB")
            return False
    except Exception as e:
        logger.error(f"检查磁盘空间失败: {str(e)}")
        return False

def download_model(model_id, save_dir, token=None, force_download=False):
    """
    从HuggingFace下载模型
    
    Args:
        model_id: HuggingFace模型ID
        save_dir: 保存目录
        token: HuggingFace访问令牌（私有模型需要）
        force_download: 是否强制重新下载
    """
    try:
        # 检查目录
        if not ensure_directory(save_dir):
            return False
        
        if not check_directory_permission(save_dir):
            return False
        
        # 对于大型模型，检查更多磁盘空间
        required_space = 5 if 'large' in model_id else 2
        if not check_disk_space(save_dir, required_space):
            logger.warning(f"磁盘空间可能不足，继续下载...")
        
        logger.info(f"开始下载模型: {model_id}")
        logger.info(f"保存目录: {save_dir}")
        
        start_time = time.time()
        
        # 使用snapshot_download下载模型
        downloaded_path = snapshot_download(
            repo_id=model_id,
            local_dir=save_dir,
            token=token,
            force_download=force_download,
            resume_download=True,
            ignore_patterns=["*.safetensors", "*.onnx"] if 'large' not in model_id else None  # 可选忽略大文件
        )
        
        end_time = time.time()
        download_time = end_time - start_time
        
        logger.info(f"模型下载完成: {model_id}")
        logger.info(f"下载耗时: {download_time:.2f} 秒")
        logger.info(f"模型保存路径: {downloaded_path}")
        
        # 验证下载结果
        if verify_model_download(save_dir):
            logger.info(f"模型验证成功: {model_id}")
            return True
        else:
            logger.error(f"模型验证失败: {model_id}")
            return False
            
    except KeyboardInterrupt:
        logger.info("下载被用户中断")
        return False
    except Exception as e:
        logger.error(f"下载模型失败: {str(e)}")
        logger.exception("详细错误信息:")
        return False

def verify_model_download(model_dir):
    """验证模型下载是否完整"""
    required_files = [
        'config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'vocab.txt',
        'modules.json'
    ]
    
    missing_files = []
    for file in required_files:
        file_path = os.path.join(model_dir, file)
        if not os.path.exists(file_path):
            missing_files.append(file)
    
    # 检查是否存在权重文件
    has_weight_file = any(os.path.exists(os.path.join(model_dir, f)) for f in 
                         ['pytorch_model.bin', 'model.safetensors'])
    
    if missing_files or not has_weight_file:
        logger.warning(f"缺少必要文件: {missing_files}")
        if not has_weight_file:
            logger.warning("未找到模型权重文件")
        return False
    
    # 检查Pooling目录
    pooling_dir = os.path.join(model_dir, '1_Pooling')
    if os.path.exists(pooling_dir) and os.path.isdir(pooling_dir):
        pooling_config = os.path.join(pooling_dir, 'config.json')
        if not os.path.exists(pooling_config):
            logger.warning("缺少Pooling配置文件")
    
    return True

def list_available_models():
    """列出可用的模型配置"""
    print("可用的预配置模型:")
    for key, model_id in DEFAULT_MODELS.items():
        print(f"  {key}: {model_id}")

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='从HuggingFace下载预训练模型')
    
    parser.add_argument(
        '--model', '-m',
        type=str,
        help='模型名称或ID (可以是预配置别名或完整的HuggingFace模型ID)'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        default='./model',
        help='模型保存目录 (默认: ./model)'
    )
    
    parser.add_argument(
        '--token', '-t',
        type=str,
        default=None,
        help='HuggingFace访问令牌 (私有模型需要)'
    )
    
    parser.add_argument(
        '--force',
        action='store_true',
        help='强制重新下载模型'
    )
    
    parser.add_argument(
        '--list',
        action='store_true',
        help='列出所有可用的预配置模型'
    )
    
    args = parser.parse_args()
    
    # 如果请求列出模型
    if args.list:
        list_available_models()
        return
    
    # 如果没有指定模型
    if not args.model:
        print("错误: 必须指定模型名称或ID")
        print("使用 --list 查看可用的预配置模型")
        parser.print_help()
        return
    
    # 解析模型ID
    model_id = DEFAULT_MODELS.get(args.model, args.model)
    save_dir = os.path.abspath(args.output)
    
    print(f"模型下载任务开始")
    print(f"模型: {model_id}")
    print(f"保存目录: {save_dir}")
    
    # 执行下载
    success = download_model(model_id, save_dir, args.token, args.force)
    
    if success:
        print(f"\n✓ 模型下载成功!")
        print(f"模型已保存至: {save_dir}")
        print(f"使用方法: 设置环境变量 RAG_MODEL_NAME={save_dir}")
        sys.exit(0)
    else:
        print(f"\n✗ 模型下载失败!")
        print(f"请查看日志文件了解详细信息: download_model.log")
        sys.exit(1)

if __name__ == "__main__":
    main()