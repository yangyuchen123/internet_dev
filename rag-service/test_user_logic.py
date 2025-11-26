#!/usr/bin/env python3
"""
简单测试用户隔离逻辑
"""

import sys
import os
import json

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("=== 测试用户隔离逻辑 ===")

# 测试用户存储目录创建逻辑
print("\n1. 测试用户存储目录创建逻辑...")
try:
    from config import INDEX_PATH, META_PATH
    print(f"INDEX_PATH: {INDEX_PATH}")
    print(f"META_PATH: {META_PATH}")
    
    # 模拟为不同用户创建索引路径
    user1_index_path = os.path.join(os.path.dirname(INDEX_PATH), f"index_user1.faiss")
    user1_meta_path = os.path.join(os.path.dirname(META_PATH), f"meta_user1.json")
    
    user2_index_path = os.path.join(os.path.dirname(INDEX_PATH), f"index_user2.faiss")
    user2_meta_path = os.path.join(os.path.dirname(META_PATH), f"meta_user2.json")
    
    print(f"用户1索引路径: {user1_index_path}")
    print(f"用户1元数据路径: {user1_meta_path}")
    print(f"用户2索引路径: {user2_index_path}")
    print(f"用户2元数据路径: {user2_meta_path}")
    
    # 确保目录存在
    os.makedirs(os.path.dirname(user1_index_path), exist_ok=True)
    print("用户索引目录创建成功")
    
except Exception as e:
    print(f"错误: {e}")
    sys.exit(1)

# 测试元数据中的用户字段
print("\n2. 测试元数据用户字段...")
user1_meta = {
    "title": "测试文档",
    "category": "test",
    "content": "测试内容",
    "user": "user1"
}

user2_meta = {
    "title": "测试文档", 
    "category": "test",
    "content": "测试内容",
    "user": "user2"
}

print(f"用户1元数据: {json.dumps(user1_meta, ensure_ascii=False)}")
print(f"用户2元数据: {json.dumps(user2_meta, ensure_ascii=False)}")

# 测试用户过滤逻辑
print("\n3. 测试用户过滤逻辑...")
# 模拟搜索结果过滤
all_results = [
    {"title": "文档1", "user": "user1"},
    {"title": "文档2", "user": "user2"},
    {"title": "文档3", "user": "user1"}
]

print(f"所有结果: {json.dumps(all_results, ensure_ascii=False)}")

# 用户1的过滤结果
user1_results = [r for r in all_results if r.get('user') == 'user1']
print(f"用户1的结果: {json.dumps(user1_results, ensure_ascii=False)}")

# 用户2的过滤结果  
user2_results = [r for r in all_results if r.get('user') == 'user2']
print(f"用户2的结果: {json.dumps(user2_results, ensure_ascii=False)}")

print("\n=== 测试完成 ===")
