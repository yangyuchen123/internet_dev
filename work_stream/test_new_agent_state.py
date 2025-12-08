from typing import Dict, Any, List, Annotated
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph.message import add_messages
from langgraph.channels import update_dict

# 导入更新后的节点函数
from nodes.condition_node import classify_input, decide_next_node, handle_search, handle_chat

# 定义与项目中一致的AgentState
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    context: Annotated[Dict[str, Any], update_dict]
    intent: str

# 测试函数
async def test_new_agent_state():
    print("=== 测试新的AgentState定义 ===")
    
    # 创建初始状态
    initial_state: AgentState = {
        "messages": [HumanMessage(content="北京今天的天气怎么样？")],
        "context": {},
        "intent": ""
    }
    
    print("初始状态:")
    print(f"  messages: {[msg.content for msg in initial_state['messages']]}")
    print(f"  context: {initial_state['context']}")
    print(f"  intent: {initial_state['intent']}")
    
    # 测试分类节点
    print("\n1. 测试分类节点 (classify_input):")
    classified_state = await classify_input(initial_state.copy())
    print(f"  intent: {classified_state['intent']}")
    print(f"  context: {classified_state['context']}")
    
    # 测试路由函数
    print("\n2. 测试路由函数 (decide_next_node):")
    next_node = await decide_next_node(classified_state)
    print(f"  下一个节点: {next_node}")
    
    # 测试搜索节点
    print("\n3. 测试搜索节点 (handle_search):")
    search_state = await handle_search(classified_state.copy())
    print(f"  messages: {[msg.content for msg in search_state['messages']]}")
    print(f"  context: {search_state['context']}")
    
    # 测试闲聊场景
    print("\n=== 测试闲聊场景 ===")
    chat_initial_state: AgentState = {
        "messages": [HumanMessage(content="你好，最近怎么样？")],
        "context": {},
        "intent": ""
    }
    
    chat_classified_state = await classify_input(chat_initial_state.copy())
    print(f"  intent: {chat_classified_state['intent']}")
    
    chat_state = await handle_chat(chat_classified_state.copy())
    print(f"  messages: {[msg.content for msg in chat_state['messages']]}")
    print(f"  context: {chat_state['context']}")

# 运行测试
if __name__ == "__main__":
    import asyncio
    asyncio.run(test_new_agent_state())