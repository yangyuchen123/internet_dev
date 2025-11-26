#!/usr/bin/env python3
"""
测试用户隔离的知识库功能
"""

import sys
import os
import traceback

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("当前目录:", os.getcwd())
print("Python路径:", sys.path)

try:
    from services.vector_store import VectorStore
    from services.embedder import Embedder
    from config import MODEL_NAME
    print("成功导入模块")
except Exception as e:
    print(f"导入模块失败: {e}")
    traceback.print_exc()
    sys.exit(1)

def test_user_isolation():
    print("=== 测试用户隔离的知识库功能 ===")
    
    # 创建嵌入模型
    embedder = Embedder(model_name=MODEL_NAME)
    
    # 为两个不同用户创建独立的VectorStore实例
    user1_store = VectorStore(
        embedder=embedder, 
        index_path="test_index_user1.faiss", 
        meta_path="test_meta_user1.json"
    )
    
    user2_store = VectorStore(
        embedder=embedder, 
        index_path="test_index_user2.faiss", 
        meta_path="test_meta_user2.json"
    )
    
    # 为用户1添加文档
    print("\n1. 为用户1添加文档...")
    user1_chunks = [
        "用户1的知识库内容1",
        "用户1的知识库内容2"
    ]
    user1_metas = [
        {"title": "用户1的文档1", "category": "test", "content": "用户1的知识库内容1", "user": "user1"},
        {"title": "用户1的文档2", "category": "test", "content": "用户1的知识库内容2", "user": "user1"}
    ]
    user1_store.add_texts(user1_chunks, user1_metas)
    
    # 为用户2添加文档
    print("\n2. 为用户2添加文档...")
    user2_chunks = [
        "用户2的知识库内容1",
        "用户2的知识库内容2"
    ]
    user2_metas = [
        {"title": "用户2的文档1", "category": "test", "content": "用户2的知识库内容1", "user": "user2"},
        {"title": "用户2的文档2", "category": "test", "content": "用户2的知识库内容2", "user": "user2"}
    ]
    user2_store.add_texts(user2_chunks, user2_metas)
    
    # 测试用户1搜索
    print("\n3. 用户1搜索 '知识库'...")
    user1_results = user1_store.search("知识库", topK=5, user="user1")
    print(f"用户1搜索结果: {len(user1_results)} 条")
    for i, result in enumerate(user1_results):
        print(f"  {i+1}. {result['title']} - {result['user']}")
    
    # 测试用户2搜索
    print("\n4. 用户2搜索 '知识库'...")
    user2_results = user2_store.search("知识库", topK=5, user="user2")
    print(f"用户2搜索结果: {len(user2_results)} 条")
    for i, result in enumerate(user2_results):
        print(f"  {i+1}. {result['title']} - {result['user']}")
    
    # 测试交叉搜索（用户1尝试获取用户2的内容）
    print("\n5. 用户1尝试搜索用户2的内容...")
    cross_results = user1_store.search("知识库", topK=5, user="user2")
    print(f"交叉搜索结果: {len(cross_results)} 条")
    
    # 清理测试文件
    print("\n6. 清理测试文件...")
    import os
    for file in ["test_index_user1.faiss", "test_meta_user1.json", "test_index_user2.faiss", "test_meta_user2.json"]:
        if os.path.exists(file):
            os.remove(file)
            print(f"  删除文件: {file}")
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    test_user_isolation()
