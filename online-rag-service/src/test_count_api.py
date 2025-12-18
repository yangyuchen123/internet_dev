#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试/rag/count API接口
"""

import sys
import os
import requests
import json

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import SERVICE_CONFIG

def test_count_api():
    """测试/rag/count API接口"""
    print("=== 测试/rag/count API接口 ===")
    
    # API基础URL
    base_url = f"http://localhost:8000"
    
    # 测试不同的count请求场景
    test_cases = [
        {
            "name": "无过滤条件",
            "data": {"user": "test_user"}
        },
        {
            "name": "按类别过滤",
            "data": {"user": "test_user", "category": "AI"}
        },
        {
            "name": "不存在的类别",
            "data": {"user": "test_user", "category": "non_existent_category"}
        },
        {
            "name": "不存在的用户",
            "data": {"user": "non_existent_user"}
        }
    ]
    
    all_passed = True
    
    for test_case in test_cases:
        print(f"\n测试场景: {test_case['name']}")
        print(f"请求数据: {json.dumps(test_case['data'], ensure_ascii=False)}")
        
        try:
            response = requests.post(
                f"{base_url}/rag/count",
                json=test_case['data'],
                timeout=10
            )
            
            print(f"响应状态码: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"响应数据: {json.dumps(result, ensure_ascii=False, indent=2)}")
                
                # 验证响应格式
                if (result.get('code') == 0 and 
                    result.get('message') == 'OK' and 
                    'data' in result and 
                    'count' in result['data']):
                    print("✅ 格式验证通过")
                else:
                    print("❌ 格式验证失败")
                    all_passed = False
                    
            else:
                print(f"❌ 请求失败: {response.text}")
                all_passed = False
                
        except requests.exceptions.ConnectionError:
            print("❌ 连接失败 - 请确保服务正在运行")
            all_passed = False
        except requests.exceptions.Timeout:
            print("❌ 请求超时")
            all_passed = False
        except Exception as e:
            print(f"❌ 请求异常: {e}")
            all_passed = False
    
    print("\n=== API测试完成 ===")
    
    if all_passed:
        print("✅ 所有测试场景通过！")
    else:
        print("❌ 部分测试场景失败！")
    
    return all_passed

def test_health_check():
    """测试健康检查接口"""
    print("\n=== 测试健康检查接口 ===")
    
    base_url = f"http://localhost:8000"
    
    try:
        response = requests.post(
            f"{base_url}/rag/health",
            json={"user": "test_user"},
            timeout=5
        )
        
        print(f"健康检查响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"健康检查响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
            return True
        else:
            print(f"健康检查失败: {response.text}")
            return False
            
    except Exception as e:
        print(f"健康检查异常: {e}")
        return False

if __name__ == "__main__":
    # 先测试健康检查接口
    print("\n=== 开始健康检查 ===")
    if test_health_check():
        # 健康检查通过后测试count接口
        test_count_api()
    else:
        print("\n⚠️  服务未启动，请先启动服务：")
        print("python start_service.py")