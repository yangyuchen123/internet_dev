from typing import Dict, Any, Literal
from langchain_core.messages import BaseMessage

# 分类节点：决定用户意图
async def classify_input(state: Dict[str, Any]) -> Dict[str, Any]:
    """分类节点：决定用户意图"""
    messages = state.get("messages", [])
    if messages:
        last_message = messages[-1]
        content = last_message.content if isinstance(last_message, BaseMessage) else last_message[1]
        
        # 更新context字段而不是question字段
        state["context"] = {"question": content, **state.get("context", {})}
        
        # 使用intent字段而不是classification字段
        if "天气" in content:
            state["intent"] = "search"
        else:
            state["intent"] = "chat"
    return state

# 路由函数：根据分类结果决定去哪
async def decide_next_node(state: Dict[str, Any]):
    """路由函数：根据分类结果决定去哪"""
    # 使用intent字段而不是classification字段
    return state.get("intent", "chat") 

# 搜索节点
async def handle_search(state: Dict[str, Any]) -> Dict[str, Any]:
    """搜索节点"""
    # 从context字段获取question
    question = state.get("context", {}).get("question", "")
    response = f"正在搜索关于 '{question}' 的天气信息..."
    
    # 更新context字段，添加response
    updated_context = {"response": response, **state.get("context", {})}
    
    # 由于使用了 add_messages reducer，只需要返回增量的消息
    return {**state, "messages": [("ai", response)], "context": updated_context}

# 闲聊节点
async def handle_chat(state: Dict[str, Any]) -> Dict[str, Any]:
    """闲聊节点"""
    # 从context字段获取question
    question = state.get("context", {}).get("question", "")
    response = f"让我们聊聊关于 '{question}' 的话题吧！"
    
    # 更新context字段，添加response
    updated_context = {"response": response, **state.get("context", {})}
    
    # 由于使用了 add_messages reducer，只需要返回增量的消息
    return {**state, "messages": [("ai", response)], "context": updated_context}