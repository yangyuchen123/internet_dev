# 工具调用功能使用指南

## 概述

本项目已实现了工具调用功能，目前支持解一元二次方程的工具。AI可以根据用户的请求自动调用这些工具来完成特定任务。

## 现有工具

### 1. 二次方程求解工具

**名称**: `solve_quadratic_equation`

**功能**: 解一元二次方程，可以处理形如 `ax² + bx + c = 0` 的方程

**参数**: 
- `equation`: 要解的二次方程，可以是以下两种格式：
  - `a,b,c` 格式（如：`1,-2,1`）
  - `ax² + bx + c = 0` 格式（如：`x² - 2x + 1 = 0`）

**使用示例**:
```
用户: 请解这个二次方程：x² + 3x + 2 = 0
AI: [工具调用] 解二次方程 x² + 3x + 2 = 0
工具结果: 方程 1.0x² + 3.0x + 2.0 = 0 的解为：
x1 = -1.000000
x2 = -2.000000
```

## 使用方法

### 1. 通过API使用

您可以创建一个包含LLM节点的工作流，然后向工作流发送请求：

```bash
curl -X POST http://localhost:8000/api/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_config": {
      "nodes": [
        {
          "id": "llm_step",
          "type": "llm_node"
        }
      ],
      "edges": [
        {
          "source": "START",
          "target": "llm_step"
        },
        {
          "source": "llm_step",
          "target": "END"
        }
      ]
    },
    "initial_state": {
      "messages": [
        ["user", "请解这个二次方程：x² - 4x + 3 = 0"]
      ]
    }
  }'
```

### 2. 直接调用节点函数

```python
from nodes import node_llm

# 测试用例
test_case = {
    "messages": [("user", "请解这个二次方程：x² + 3x + 2 = 0")]
}

result = node_llm(test_case)
print(result)
```

## 扩展新工具

如果您想要添加更多工具，可以按照以下步骤操作：

### 1. 创建工具实现

在 `tools/` 目录下创建新的工具文件，例如 `tools/calculator_tool.py`：

```python
def calculate(expression: str) -> str:
    """
    简单计算器工具
    参数: expression - 数学表达式字符串
    返回: 计算结果的字符串表示
    """
    try:
        # 安全计算数学表达式
        result = eval(expression)
        return f"计算结果: {result}"
    except Exception as e:
        return f"计算错误: {str(e)}"

# 工具元数据
tool_metadata = {
    "name": "calculate",
    "description": "简单计算器工具，可以计算基本的数学表达式",
    "parameters": {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "要计算的数学表达式"
            }
        },
        "required": ["expression"]
    }
}
```

### 2. 更新LLM节点

在 `nodes/llm_node.py` 中添加新工具：

```python
# 导入新工具
from tools.calculator_tool import calculate, tool_metadata as calculator_metadata
from pydantic import BaseModel, Field

# 定义新工具的参数模型
class CalculatorArgs(BaseModel):
    """计算器工具的参数模型"""
    expression: str = Field(..., description='要计算的数学表达式')

# 创建新工具
calculator_tool = StructuredTool.from_function(
    func=calculate,
    name="calculate",
    description="简单计算器工具，可以计算基本的数学表达式",
    args_schema=CalculatorArgs
)

# 更新工具列表
tools = [quadratic_tool, calculator_tool]
```

### 3. 测试新工具

创建测试脚本验证新工具：

```python
from nodes import node_llm

# 测试新工具
test_case = {
    "messages": [("user", "请计算 2 + 3 * 4")]
}

result = node_llm(test_case)
print(result)
```

## 注意事项

1. **安全性**：在实现新工具时，需要特别注意安全性，避免潜在的安全漏洞（如代码注入）。

2. **参数验证**：确保对工具的输入参数进行严格验证，防止无效输入导致的错误。

3. **错误处理**：为工具添加完善的错误处理机制，确保在出现问题时能返回友好的错误信息。

4. **文档**：为每个工具提供清晰的文档和使用示例，便于用户理解和使用。

## 技术实现

本项目使用了以下技术来实现工具调用功能：

- **LangChain**：提供了工具调用的核心功能和接口
- **Pydantic**：用于定义工具的参数模型，确保类型安全
- **通义千问**：作为LLM模型，用于理解用户请求并决定是否调用工具

## 未来规划

1. 添加更多实用工具（如计算器、日期处理、天气查询等）
2. 实现工具调用的历史记录功能
3. 支持多工具组合使用
4. 添加工具权限管理功能

---

如果您有任何问题或需要帮助，请随时联系项目维护者。
