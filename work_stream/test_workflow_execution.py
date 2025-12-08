import requests
import json

# 测试LLM功能的完整脚本
BASE_URL = "http://127.0.0.1:8000"

def test_workflow_execution():
    """测试工作流执行功能"""
    print("=== 测试工作流执行功能 ===")
    
    # 1. 首先测试工作流配置验证
    print("\n1. 测试工作流配置验证:")
    
    # 工作流配置
    workflow_config = {
        "nodes": [
            {"id": "classifier", "type": "classify_input"},
            {"id": "chat", "type": "llm_node"},
            {"id": "search", "type": "handle_search"},
        ],
        "edges": [
            {"source": "START", "target": "classifier"},
            {
                "source": "classifier",
                "target": "",
                "is_condition": True,
                "route_function": "decide_next_node",
                "path_map": {
                    "chat": "chat",
                    "search": "search"
                }
            },
            {"source": "chat", "target": "END"},
            {"source": "search", "target": "END"}
        ]
    }
    
    # 发送验证请求
    validate_response = requests.post(f"{BASE_URL}/api/workflows/validate", json=workflow_config)
    
    if validate_response.status_code == 200:
        print("✅ 工作流配置验证成功")
    else:
        print(f"❌ 工作流配置验证失败: {validate_response.status_code}")
        print(validate_response.text)
        return False
    
    # 2. 测试工作流执行
    print("\n2. 测试工作流执行:")
    
    # 测试天气查询场景
    print("\n   a) 测试天气查询场景:")
    execution_request = {
        "workflow_config": workflow_config,
        "initial_state": {
            "messages": [
                {
                    "type": "human",
                    "content": "北京今天的天气怎么样？"
                }
            ],
            "context": {},
            "intent": ""
        }
    }
    
    execution_response = requests.post(f"{BASE_URL}/api/workflows/execute", json=execution_request)
    
    if execution_response.status_code == 200:
        result = execution_response.json()
        print("✅ 工作流执行成功")
        print(f"   执行结果: {json.dumps(result['result'], indent=4, ensure_ascii=False)}")
    else:
        print(f"❌ 工作流执行失败: {execution_response.status_code}")
        print(execution_response.text)
        return False
    
    # 测试闲聊场景
    print("\n   b) 测试闲聊场景:")
    chat_execution_request = {
        "workflow_config": workflow_config,
        "initial_state": {
            "messages": [
                {
                    "type": "human",
                    "content": "解二元一次方程x² + 3x + 2 = 0"
                }
            ],
            "context": {},
            "intent": ""
        }
    }
    
    chat_execution_response = requests.post(f"{BASE_URL}/api/workflows/execute", json=chat_execution_request)
    
    if chat_execution_response.status_code == 200:
        chat_result = chat_execution_response.json()
        print("✅ 工作流执行成功")
        print(f"   执行结果: {json.dumps(chat_result['result'], indent=4, ensure_ascii=False)}")
    else:
        print(f"❌ 工作流执行失败: {chat_execution_response.status_code}")
        print(chat_execution_response.text)
        return False
    
    print("\n=== 所有测试通过！===")
    return True

if __name__ == "__main__":
    test_workflow_execution()