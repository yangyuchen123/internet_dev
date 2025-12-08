import requests
import json

# 测试LLM功能的简单脚本
BASE_URL = "http://127.0.0.1:8000"

def test_llm_workflow():
    """测试包含LLM的工作流"""
    print("测试包含LLM的工作流...")
    
    # 请求数据
    request_data = {
        "nodes": [
            {"id": "chat", "type": "llm_node"},
            {"id": "classifier", "type": "classify_input"},
            {"id": "search", "type": "handle_search"},
        ],
        "edges": [
            {"source": "START", "target": "classifier"},
            {"source": "classifier", "target": "chat"},
            {"source": "chat", "target": "END"},
            {
                "source": "classifier",
                "target": "",  # 条件边不需要指定目标，由path_map决定
                "is_condition": True,  # 标识这是条件边
                "route_function": "decide_next_node",  # 后端对应的路由函数名称
                "path_map": {  # 路径映射表 (返回值 -> 目标节点ID)
                    "chat": "chat",
                    "search": "search"
                }
            }
        ]
        # },
        
        # "initial_state": {
        #     "messages": [["user", "尝试解决一个简单的二次方程x² + 3x + 2 = 0"]]
        # }
    }
    

    response = requests.post(f"{BASE_URL}/api/workflows/validate", json=request_data)
    
    if response.status_code == 200:
        result = response.json()
        print("工作流验证成功！")
        print("结果:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return True
    else:
        print(f"工作流验证失败: {response.status_code}")
        print(response.text)
        return False


if __name__ == "__main__":
    test_llm_workflow()
