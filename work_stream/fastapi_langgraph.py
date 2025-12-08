from typing import TypedDict, Annotated, List, Dict, Any
from fastapi import FastAPI, HTTPException
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages

from langchain_core.messages import BaseMessage
from dotenv import load_dotenv
import os

# 导入节点和工具
from nodes import node_llm, node_uppercase, node_lowercase, node_quadratic_equation, classify_input, decide_next_node, handle_search, handle_chat
from models import NodeConfig, EdgeConfig, WorkflowConfig, WorkflowExecutionRequest

# 加载环境变量
load_dotenv()

# 创建FastAPI应用
app = FastAPI(
    title="LangGraph 工作流 API",
    description="接收JSON数据并生成相应的LangGraph工作流",
    version="1.0.0"
)
def update_dict(dict1: Dict, dict2: Dict) -> Dict:
    return {**dict1, **dict2}

# 1. 定义状态
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    context: Annotated[Dict[str, Any], update_dict]
    intent: str


# 辅助函数：打印状态，方便测试
def print_state(state: AgentState) -> None:
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
        else:
            print(f"  {value}")
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
def build_graph_from_config(config: WorkflowConfig):
    """根据配置构建LangGraph工作流"""
    workflow = StateGraph(AgentState)
    
    # 动态添加节点
    for node in config.nodes:
        if node.type not in NODE_REGISTRY:
            raise HTTPException(400, f"未知节点类型: {node.type}")
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

# 5. API 端点

@app.get("/api/nodes", response_model=Dict[str, str])
async def get_available_nodes():
    """获取可用的节点类型"""
    node_descriptions = {
        "llm_node": "生成AI回复的LLM节点",
        "uppercase_node": "将最后一条消息转换为大写",
        "lowercase_node": "将最后一条消息转换为小写",
        "quadratic_equation_node": "解一元二次方程的节点，支持格式：a,b,c 或 ax² + bx + c = 0",
        "classify_input": "分类节点：决定用户意图（如天气查询或闲聊）",
        "handle_search": "搜索节点：处理天气查询请求",
        "handle_chat": "闲聊节点：处理普通对话请求"
    }
    return node_descriptions

@app.post("/api/workflows/validate")
async def validate_workflow(workflow_config: WorkflowConfig):
    """验证工作流配置"""
    try:
        # 尝试构建工作流以验证配置
        build_graph_from_config(workflow_config)
        return {"message": "工作流配置有效"}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"工作流配置无效: {str(e)}")

@app.post("/api/workflows/execute", response_model=Dict[str, Any])
async def execute_workflow(execution_request: WorkflowExecutionRequest):
    """执行工作流"""
    try:
        # 构建工作流
        app_workflow = build_graph_from_config(execution_request.workflow_config)
        
        # 执行工作流（使用异步API）
        result = await app_workflow.ainvoke(execution_request.initial_state)
        
        return {
            "message": "工作流执行成功",
            "result": result
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"工作流执行失败: {str(e)}")

@app.post("/api/workflows/test", response_model=Dict[str, Any])
async def test_simple_workflow():
    """测试简单工作流的执行"""
    # 创建一个简单的工作流配置
    simple_config = WorkflowConfig(
        nodes=[
            NodeConfig(id="step1", type="llm_node"),
            NodeConfig(id="step2", type="uppercase_node")
        ],
        edges=[
            EdgeConfig(source="START", target="step1"),
            EdgeConfig(source="step1", target="step2"),
            EdgeConfig(source="step2", target="END")
        ]
    )
    
    # 执行工作流
    try:
        app_workflow = build_graph_from_config(simple_config)
        initial_state = {"messages": [("user", "hello world")]}
        result = app_workflow.invoke(initial_state)
        
        return {
            "message": "测试工作流执行成功",
            "workflow_config": simple_config.model_dump(),
            "initial_state": initial_state,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"测试工作流执行失败: {str(e)}")

# 6. 主程序入口
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
