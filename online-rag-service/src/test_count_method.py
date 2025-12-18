#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试vector_store.py中的count方法修复
"""

import sys
import os

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.vector_store import VectorStore
from services.embedder import Embedder

def test_count_method():
    """测试count方法的修复效果"""
    print("=== 测试count方法修复 ===")
    
    # 初始化嵌入器和向量存储
    embedder = Embedder()
    vector_store = VectorStore(embedder)
    
    # 先添加一些测试数据
    print("\n0. 添加测试数据...")
    test_texts = [
        "人工智能是计算机科学的一个分支",
        "机器学习是人工智能的重要技术",
        "深度学习是机器学习的一个子领域",
        "自然语言处理是AI的重要应用",
        "计算机视觉也是AI的重要应用"
    ]
    test_metas = [
        {"user": "test_user", "category": "AI", "title": "AI介绍"},
        {"user": "test_user", "category": "AI", "title": "机器学习"},
        {"user": "test_user", "category": "AI", "title": "深度学习"},
        {"user": "test_user", "category": "AI", "title": "自然语言处理"},
        {"user": "another_user", "category": "Technology", "title": "计算机视觉"}
    ]
    
    vector_store.add_texts(test_texts, test_metas)
    print("   测试数据添加完成")
    
    # 1. 测试无过滤条件的count
    print("\n1. 测试无过滤条件的count...")
    total_count = vector_store.count()
    print(f"   总记录数: {total_count}")
    
    # 2. 测试按用户过滤的count
    print("\n2. 测试按用户过滤的count...")
    test_user_count = vector_store.count(user="test_user")
    print(f"   用户'test_user'的记录数: {test_user_count}")
    
    # 3. 测试按类别过滤的count
    print("\n3. 测试按类别过滤的count...")
    ai_category_count = vector_store.count(category="AI")
    print(f"   类别'AI'的记录数: {ai_category_count}")
    
    # 4. 测试同时按用户和类别过滤的count
    print("\n4. 测试同时按用户和类别过滤的count...")
    combined_count = vector_store.count(user="test_user", category="AI")
    print(f"   用户'test_user'且类别'AI'的记录数: {combined_count}")
    
    # 5. 测试不存在的用户和类别
    print("\n5. 测试不存在的用户和类别...")
    non_existent_user_count = vector_store.count(user="non_existent_user")
    print(f"   用户'non_existent_user'的记录数: {non_existent_user_count}")
    
    non_existent_category_count = vector_store.count(category="non_existent_category")
    print(f"   类别'non_existent_category'的记录数: {non_existent_category_count}")
    
    print("\n=== count方法测试完成 ===")
    
    # 验证count方法是否正常工作
    expected_test_user_count = 4  # test_user有4条记录
    expected_ai_category_count = 4  # AI类别有4条记录
    expected_combined_count = 4  # test_user且AI类别有4条记录
    
    if (total_count >= 5 and 
        test_user_count == expected_test_user_count and 
        ai_category_count == expected_ai_category_count and 
        combined_count == expected_combined_count and
        non_existent_user_count == 0 and
        non_existent_category_count == 0):
        print("✅ count方法修复测试通过！")
        return True
    else:
        print("❌ count方法修复测试失败！")
        print(f"   预期: test_user记录数={expected_test_user_count}, 实际={test_user_count}")
        print(f"   预期: AI类别记录数={expected_ai_category_count}, 实际={ai_category_count}")
        print(f"   预期: 组合过滤记录数={expected_combined_count}, 实际={combined_count}")
        return False

if __name__ == "__main__":
    test_count_method()