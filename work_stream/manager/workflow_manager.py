from typing import Dict, Any, List, TypedDict, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph, START, END, add_messages
from fastapi import HTTPException

# 导入节点函数
from nodes import (
    node_llm,
    node_uppercase,
    node_lowercase,
    node_quadratic_equation,
    classify_input,
    decide_next_node,
    handle_search,
    handle_chat
)
from models.workflow_models import WorkflowConfig
from manager.agent_manager import agent_manager
from manager.agent_discovery import agent_discovery_service

def update_dict(dict1: Dict, dict2: Dict) -> Dict:
    return {**dict1, **dict2}

# 1. 定义状态
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    context: Annotated[Dict[str, Any], update_dict]
    intent: str


# 辅助函数：打印状态，方便测试
def print_state_messages(state: AgentState) -> None:
    """
    打印状态的辅助函数，用于测试和调试
    
    Args:
        state: 要打印的状态对象
    """
    print("=== State 内容 ===")
    for key, value in state.items():
        print(f"{key}:")
        if key == "messages":
            for i, msg in enumerate(value):
                print(f"  [{i}] {msg}")

    print("==================")


# 2. 定义功能注册表 (Node Registry)
NODE_REGISTRY = {
    "chat": node_llm,
    "llm_node": node_llm,
    "uppercase_node": node_uppercase,
    "lowercase_node": node_lowercase,
    "quadratic_equation_node": node_quadratic_equation,
    "classify_input": classify_input,
    "handle_search": handle_search,
    "handle_chat": handle_chat
}

#  定义路由注册表
ROUTER_REGISTRY = {
    "decide_next_node": decide_next_node,
}



# 4. 工作流构建函数
async def build_graph_from_config(config: WorkflowConfig):
    """根据配置构建LangGraph工作流"""
    workflow = StateGraph(AgentState)
    
    # 动态添加节点
    for node in config.nodes:
        if node.type == "mcp_agent":
            # 检查是否是MCP Agent节点（格式：mcp://client_id/tool_name）
            if node.id.startswith("mcp://"):
                # 解析MCP Agent信息
                mcp_parts = node.id.split("/")
                if len(mcp_parts) < 4:
                    raise HTTPException(400, f"MCP Agent节点格式错误: {node.id}，正确格式应为 mcp://client_id/tool_name")
                
                client_id = mcp_parts[2]
                tool_name = mcp_parts[3]
                
                # 检查MCP客户端连接是否存在
                if client_id not in agent_manager.mcp_client_connections:
                    raise HTTPException(400, f"MCP客户端连接 '{client_id}' 不存在")
                
                # 动态创建MCP Agent节点函数
                async def create_mcp_node_func(state: AgentState, client_id=client_id, tool_name=tool_name):
                    # 从状态中提取参数
                    kwargs = state.get("context", {}).get("params", {})
                    
                    # 构建MCP操作
                    operation = {
                        "type": "callTool",
                        "name": tool_name,
                        "arguments": kwargs
                    }
                    
                    # 执行MCP操作
                    try:
                        result = agent_manager.mcp_client.execute_mcp_operation(client_id, operation)
                        # 返回正确的状态格式，确保符合AgentState的定义
                        return {
                            "context": {**state.get("context", {}), "mcp_result": result}, 
                            "messages": state.get("messages", [])
                        }
                    except Exception as e:
                        # 返回错误信息到context中
                        return {
                            "context": {**state.get("context", {}), "error": str(e)}, 
                            "messages": state.get("messages", [])
                        }
                
                # 添加MCP节点到工作流
                workflow.add_node(node.id, create_mcp_node_func)
            else:
                raise HTTPException(400, f"未知节点类型: {node.type}")
        elif node.type == "dynamic_agent":
            # 处理动态agent节点
            await _add_dynamic_agent_node(workflow, node)
        else:
            workflow.add_node(node.id, NODE_REGISTRY[node.type])
            
    # 动态添加连线
    for edge in config.edges:
        if edge.is_condition:
            # 动态获取路由函数
            router = ROUTER_REGISTRY.get(edge.route_function)
            if not router:
                raise HTTPException(400, f"未知路由函数: {edge.route_function}")
            
            # 必须提供 map: { "search": "实际的节点ID", "chat": "实际的节点ID" }
            if not edge.path_map:
                raise HTTPException(400, "条件边必须包含 path_map")
                
            workflow.add_conditional_edges(
                edge.source,
                router,
                edge.path_map 
            )
        else:
            # 处理 START/END 的特殊情况
            src = START if edge.source == "START" else edge.source
            tgt = END if edge.target == "END" else edge.target
            workflow.add_edge(src, tgt)
            
    return workflow.compile()


async def _add_dynamic_agent_node(workflow: StateGraph, node_config):
    """
    添加动态agent节点到工作流
    
    Args:
        workflow: 工作流图
        node_config: 节点配置
    """
    if not node_config.agent_id and not node_config.client_id:
        raise HTTPException(400, "动态agent节点必须指定agent_id或client_id")
    
    if not node_config.tool_name:
        raise HTTPException(400, "动态agent节点必须指定tool_name")
    
    # 动态创建agent节点函数
    async def create_dynamic_agent_node_func(state: AgentState):
        # 从状态中提取参数，合并节点配置参数
        state_params = state.get("context", {}).get("params", {})
        kwargs = {**state_params, **node_config.parameters}
        
        # 构建MCP操作
        operation = {
            "type": "callTool",
            "name": node_config.tool_name,
            "arguments": kwargs
        }
        
        # 执行MCP操作
        try:
            if node_config.client_id:
                # 使用指定的MCP客户端
                if node_config.client_id not in agent_manager.mcp_client_connections:
                    raise HTTPException(400, f"MCP客户端连接 '{node_config.client_id}' 不存在")
                
                result = agent_manager.mcp_client.execute_mcp_operation(node_config.client_id, operation)
            elif node_config.agent_id:
                # 使用agent对应的MCP客户端
                # client_id直接使用agent_id，因为它们是同一个字段
                client_id = str(node_config.agent_id)
                if client_id not in agent_manager.mcp_client_connections:
                    # 尝试动态连接agent
                    await _connect_agent_mcp_client(node_config.agent_id, client_id)
                
                result = agent_manager.mcp_client.execute_mcp_operation(client_id, operation)
            else:
                raise HTTPException(400, "无法确定使用哪个MCP客户端")
            
            # 返回正确的状态格式
            return {
                "context": {**state.get("context", {}), "agent_result": result}, 
                "messages": state.get("messages", [])
            }
        except Exception as e:
            # 返回错误信息到context中
            return {
                "context": {**state.get("context", {}), "error": str(e)}, 
                "messages": state.get("messages", [])
            }
    
    # 添加动态agent节点到工作流
    workflow.add_node(node_config.id, create_dynamic_agent_node_func)


async def _connect_agent_mcp_client(agent_id: int, client_id: str):
    """
    连接agent对应的MCP客户端，从数据库获取agent信息
    
    Args:
        agent_id: agent ID
        client_id: 客户端ID
    """
    try:
        # 从数据库获取agent详细信息
        agent = await agent_discovery_service.get_agent_by_id(agent_id)
        
        if not agent:
            raise HTTPException(404, f"未找到ID为 {agent_id} 的agent")
        
        # 根据agent信息构建MCP连接配置
        # 优先使用agent配置中的URL，否则根据环境自动选择
        agent_url = agent.get("url")
        if agent_url:
            # 如果agent配置中有URL，直接使用
            server_url = agent_url
        else:
            # 否则根据环境自动选择地址
            import os
            if os.path.exists("/.dockerenv"):
                # Docker环境中使用容器名
                server_url = "http://plugin-server:3000"
            else:
                # 本地开发环境使用localhost
                server_url = "http://localhost:3000"
        
        # 构建server_config
        server_config = {
            "url": server_url,
            "headers": {},
            "bearerToken": ""
        }
        
        # 建立MCP连接，使用从数据库获取的URL
        await agent_manager.connect_mcp_client(
            client_id=client_id,
            server_config=server_config
        )
        
    except Exception as e:
        raise HTTPException(500, f"连接agent MCP客户端失败: {str(e)}")


async def discover_available_agents_and_tools():
    """
    发现所有可用的agent和MCP工具
    
    Returns:
        Dict: 包含agents和mcp_tools的字典
    """
    try:
        return await agent_discovery_service.discover_all_available_tools()
    except Exception as e:
        raise HTTPException(500, f"发现可用agent和工具失败: {str(e)}")


def create_dynamic_agent_node_config(agent_id: int = None, 
                                   client_id: str = None, 
                                   tool_name: str = None, 
                                   node_id: str = None,
                                   parameters: Dict[str, Any] = None):
    """
    创建动态agent节点配置
    
    Args:
        agent_id: agent ID
        client_id: MCP客户端ID
        tool_name: 工具名称
        node_id: 节点ID（可选，自动生成）
        parameters: 节点参数
        
    Returns:
        NodeConfig: 节点配置对象
    """
    if not agent_id and not client_id:
        raise HTTPException(400, "必须指定agent_id或client_id")
    
    if not tool_name:
        raise HTTPException(400, "必须指定tool_name")
    
    # 生成节点ID
    if not node_id:
        if client_id:
            node_id = f"mcp://{client_id}/{tool_name}"
        else:
            # 直接使用agent_id作为节点ID的一部分，因为client_id与agent_id是同一个字段
            node_id = f"mcp://{agent_id}/{tool_name}"
    
    return NodeConfig(
        id=node_id,
        type="dynamic_agent",
        agent_id=agent_id,
        client_id=client_id,
        tool_name=tool_name,
        parameters=parameters or {}
    )
