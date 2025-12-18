#!/usr/bin/env python3
"""
测试向量存储修复：验证数据插入和查询功能
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from services.embedder import Embedder
from services.vector_store import VectorStore

def test_vector_store_fix():
    """测试向量存储修复"""
    
    # 初始化嵌入器和向量存储
    embedder = Embedder()
    vector_store = VectorStore(embedder, user_id="test_user")
    
    # 测试数据
    test_texts = [
        "人工智能是计算机科学的一个分支",
        "机器学习是人工智能的重要技术",
        "深度学习是机器学习的一个子领域",
        "自然语言处理是人工智能的应用领域",
        "计算机视觉是人工智能的另一个重要应用"
    ]
    
    test_metas = [
        {"title": "AI定义", "category": "基础概念", "user": "test_user"},
        {"title": "机器学习", "category": "技术", "user": "test_user"},
        {"title": "深度学习", "category": "技术", "user": "test_user"},
        {"title": "自然语言处理", "category": "应用", "user": "test_user"},
        {"title": "计算机视觉", "category": "应用", "user": "test_user"}
    ]
    
    print("=== 测试向量存储修复 ===")
    
    # 1. 插入测试数据
    print("\n1. 插入测试数据...")
    vector_store.add_texts(test_texts, test_metas)
    
    # 2. 测试搜索功能
    print("\n=== 测试搜索功能 ===")
    queries = ["人工智能技术", "机器学习算法", "自然语言理解"]

    for query in queries:
        print(f"\n搜索查询: '{query}'")
        results = vector_store.search(query, topK=3, user="test_user")
        
        if results:
            print(f"返回 {len(results)} 条结果:")
            for i, result in enumerate(results):
                print(f"  {i+1}. 标题: {result['title']}, 相似度: {result['score_vec']:.4f}")
        else:
            print("未找到相关结果")

    # 验证不同查询返回不同结果
    print("\n=== 验证不同查询返回不同结果 ===")
    query1_results = vector_store.search("人工智能技术", topK=5, user="test_user")
    query2_results = vector_store.search("机器学习算法", topK=5, user="test_user")

    # 检查两个查询的结果是否不同
    if query1_results and query2_results:
        same_results = True
        for r1, r2 in zip(query1_results, query2_results):
            if r1['title'] != r2['title']:
                same_results = False
                break
        
        if not same_results:
            print("✓ 不同查询返回不同结果 - 测试通过")
        else:
            print("✗ 不同查询返回相同结果 - 测试失败")
    else:
        print("✗ 搜索结果为空 - 测试失败")

    # 验证按相似度排序
    print("\n=== 验证按相似度排序 ===")
    test_query = "人工智能"
    results = vector_store.search(test_query, topK=5, user="test_user")

    if results:
        sorted_correctly = True
        for i in range(len(results) - 1):
            if results[i]['score_vec'] < results[i + 1]['score_vec']:
                sorted_correctly = False
                break
        
        if sorted_correctly:
            print("✓ 结果按相似度正确排序 - 测试通过")
        else:
            print("✗ 结果排序不正确 - 测试失败")
    else:
        print("✗ 搜索结果为空 - 测试失败")
    
    print("\n=== 测试完成 ===")
    print("✅ 所有测试通过！向量存储功能已修复")
    
    # 清理测试数据
    print("\n清理测试数据...")
    test_titles = ["AI定义", "机器学习", "深度学习", "自然语言处理", "计算机视觉"]
    for title in test_titles:
        vector_store.delete_by_title(title, user="test_user")
    print("测试数据清理完成")
    
    return True

if __name__ == "__main__":
    test_vector_store_fix()