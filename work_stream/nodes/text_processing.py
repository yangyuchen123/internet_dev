from typing import Dict, Any

def node_uppercase(state: Dict[str, Any]):
    """大写转换节点：将最后一条消息转换为大写"""
    last_msg = state["messages"][-1][1] if isinstance(state["messages"][-1], tuple) else state["messages"][-1].content
    return {"messages": [("ai", last_msg.upper())]}


def node_lowercase(state: Dict[str, Any]):
    """小写转换节点：将最后一条消息转换为小写"""
    last_msg = state["messages"][-1][1] if isinstance(state["messages"][-1], tuple) else state["messages"][-1].content
    return {"messages": [("ai", last_msg.lower())]}
