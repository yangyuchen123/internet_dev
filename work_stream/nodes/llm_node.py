from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool, StructuredTool
from pydantic import BaseModel, Field
import os
import json

# 导入工具
from tools.quadratic_solver_tool import solve_quadratic_equation, tool_metadata

# 定义工具参数模型
class QuadraticEquationArgs(BaseModel):
    """解二次方程工具的参数模型"""
    equation: str = Field(..., description='要解的二次方程，可以是 "a,b,c" 格式或 "ax² + bx + c = 0" 格式')

# 将函数转换为结构化工具
def _solve_quadratic_equation_wrapper(equation: str) -> str:
    """解一元二次方程的工具包装器"""
    return solve_quadratic_equation(equation)

# 创建LangChain工具
quadratic_tool = StructuredTool.from_function(
    func=_solve_quadratic_equation_wrapper,
    name="solve_quadratic_equation",
    description="解一元二次方程的工具，可以处理形如 ax² + bx + c = 0 的方程",
    args_schema=QuadraticEquationArgs
)

# 工具列表
tools = [quadratic_tool]

async def node_llm(state: Dict[str, Any]):
    """LLM 节点：使用通义千问生成AI回复，支持工具调用"""
    try:
        # 获取最后一条用户消息
        last_msg = state["messages"][-1]
        if isinstance(last_msg, tuple):
            user_content = last_msg[1]
        else:
            user_content = last_msg.content
            
        # 检查API密钥是否存在
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return {"messages": [("ai", "错误：未设置 OPENAI_API_KEY 环境变量。请在 .env 文件中添加您的API密钥。")]}
        
        # 初始化通义千问模型，添加工具
        llm = ChatOpenAI(
            model="qwen-turbo",
            api_key=api_key,
            base_url=os.getenv("OPENAI_API_BASE", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        )
        
        # 将LLM与工具绑定
        llm_with_tools = llm.bind_tools(tools)
        
        # 调用模型生成回复
        response = llm_with_tools.invoke([HumanMessage(content=user_content)])
        
        # 处理工具调用
        if hasattr(response, 'tool_calls') and response.tool_calls:
            tool_call = response.tool_calls[0]
            if tool_call['name'] == 'solve_quadratic_equation':
                # 执行工具调用
                equation = tool_call['args']['equation']
                result = solve_quadratic_equation(equation)
                # 将工具调用结果添加到消息中（使用与response相同的格式）
                return {"messages": [response, ("ai", result)]}
        
        return {"messages": [response]}
    except Exception as e:
        # 如果LLM调用失败，返回详细错误信息
        error_msg = f"LLM调用失败: {str(e)}"
        # 添加调试信息
        error_msg += "\n请检查："
        error_msg += "\n1. API密钥是否正确设置在 .env 文件中"
        error_msg += "\n2. 网络连接是否正常"
        error_msg += "\n3. 模型名称是否正确"
        return {"messages": [("ai", error_msg)]}
