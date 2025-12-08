# Work Stream - LangGraph 工作流引擎

简体中文说明文档 — 一个基于 LangGraph 的动态工作流引擎，用于构建和执行 AI 代理工作流。

## 📁 目录结构

```
├── work_stream/
│   ├── fastapi_langgraph.py   # 核心工作流引擎和API实现
│   ├── models/
│   │   └── workflow_models.py # 工作流配置模型定义
│   ├── nodes/
│   │   ├── __init__.py        # 节点函数导出
│   │   ├── llm_node.py        # LLM 节点实现
│   │   ├── condition_node.py  # 条件节点实现
│   │   ├── quadratic_equation.py # 数学计算节点
│   │   └── text_processing.py # 文本处理节点
│   ├── tools/
│   │   └── quadratic_solver_tool.py # 工具函数
│   ├── requirements.txt       # 项目依赖
│   └── README.md              # 本文件
```

## 🚀 项目简介

Work Stream 是一个基于 LangGraph 的动态工作流引擎，提供了 RESTful API 接口，允许前端应用动态创建、验证和执行 AI 代理工作流。它支持多种节点类型和条件路由，可以灵活构建复杂的 AI 工作流。

## ✨ 主要功能

- **动态工作流构建** - 根据 JSON 配置动态构建工作流
- **多节点类型支持** - LLM 节点、条件节点、搜索节点、文本处理节点等
- **条件路由** - 基于用户意图或其他条件动态路由工作流
- **RESTful API** - 提供完整的 API 接口供前端调用
- **工作流验证** - 在执行前验证工作流配置的有效性
- **实时执行** - 异步执行工作流并返回结果

## 🔧 快速开始

### 安装依赖

```bash
cd work_stream
pip install -r requirements.txt
```

### 启动服务

```bash
python fastapi_langgraph.py
```

服务将在 `http://localhost:8000` 启动。

### API 文档

服务启动后，可以通过以下地址访问 API 文档：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 📖 API 端点

### 获取可用节点类型

```
GET /api/nodes
```

返回系统中所有可用的节点类型及其描述。

**响应示例：**
```json
{
  "llm_node": "生成AI回复的LLM节点",
  "classify_input": "分类节点：决定用户意图（如天气查询或闲聊）",
  "handle_search": "搜索节点：处理天气查询请求",
  "handle_chat": "闲聊节点：处理普通对话请求",
  "uppercase_node": "将最后一条消息转换为大写",
  "lowercase_node": "将最后一条消息转换为小写",
  "quadratic_equation_node": "解一元二次方程的节点"
}
```

### 验证工作流配置

```
POST /api/workflows/validate
```

验证工作流配置的有效性。

**请求示例：**
```json
{
  "nodes": [
    {"id": "classifier", "type": "classify_input"},
    {"id": "chat", "type": "llm_node"},
    {"id": "search", "type": "handle_search"}
  ],
  "edges": [
    {"source": "START", "target": "classifier"},
    {
      "source": "classifier",
      "target": "",
      "is_condition": true,
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
```

**响应示例：**
```json
{
  "message": "工作流配置有效"
}
```

### 执行工作流

```
POST /api/workflows/execute
```

执行工作流并返回结果。

**请求示例：**
```json
{
  "workflow_config": {
    "nodes": [
      {"id": "classifier", "type": "classify_input"},
      {"id": "chat", "type": "llm_node"},
      {"id": "search", "type": "handle_search"}
    ],
    "edges": [
      {"source": "START", "target": "classifier"},
      {
        "source": "classifier",
        "target": "",
        "is_condition": true,
        "route_function": "decide_next_node",
        "path_map": {
          "chat": "chat",
          "search": "search"
        }
      },
      {"source": "chat", "target": "END"},
      {"source": "search", "target": "END"}
    ]
  },
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
```

**响应示例：**
```json
{
  "message": "工作流执行成功",
  "result": {
    "messages": [
      {
        "type": "human",
        "content": "北京今天的天气怎么样？"
      },
      {
        "type": "ai",
        "content": "北京今天晴，温度15-25℃..."
      }
    ],
    "context": {
      "question": "北京今天的天气怎么样？"
    },
    "intent": "search"
  }
}
```

### 测试工作流

```
POST /api/workflows/test
```

测试一个简单的工作流执行。

## 📋 工作流配置格式

### 节点配置 (NodeConfig)

| 字段 | 类型 | 描述 | 必需 |
|------|------|------|------|
| id | string | 节点唯一标识符 | ✅ |
| type | string | 节点类型（必须是系统支持的节点类型之一） | ✅ |

### 边配置 (EdgeConfig)

| 字段 | 类型 | 描述 | 必需 |
|------|------|------|------|
| source | string | 源节点ID或"START" | ✅ |
| target | string | 目标节点ID或"END" | ✅ |
| is_condition | boolean | 是否为条件边 | ❌ (默认: false) |
| route_function | string | 路由函数名称（条件边必需） | ❌ |
| path_map | Dict[str, str] | 路由映射表（条件边必需） | ❌ |

### 工作流配置 (WorkflowConfig)

| 字段 | 类型 | 描述 | 必需 |
|------|------|------|------|
| nodes | List[NodeConfig] | 节点配置列表 | ✅ |
| edges | List[EdgeConfig] | 边配置列表 | ✅ |

### 工作流执行请求 (WorkflowExecutionRequest)

| 字段 | 类型 | 描述 | 必需 |
|------|------|------|------|
| workflow_config | WorkflowConfig | 工作流配置 | ✅ |
| initial_state | Dict[str, Any] | 初始状态 | ✅ |

## 🎯 状态定义

工作流的状态包含以下字段：

| 字段 | 类型 | 描述 |
|------|------|------|
| messages | List[BaseMessage] | 消息列表（包含用户消息和AI回复） |
| context | Dict[str, Any] | 上下文信息 |
| intent | string | 用户意图（由分类节点设置） |

## 🚀 前端集成示例

以下是一个简单的前端集成示例，展示如何创建、验证和执行工作流：

```javascript
// 获取可用节点类型
async function getAvailableNodes() {
  const response = await fetch('http://localhost:8000/api/nodes');
  return response.json();
}

// 验证工作流配置
async function validateWorkflow(config) {
  const response = await fetch('http://localhost:8000/api/workflows/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });
  return response.json();
}

// 执行工作流
async function executeWorkflow(executionRequest) {
  const response = await fetch('http://localhost:8000/api/workflows/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(executionRequest)
  });
  return response.json();
}

// 使用示例
async function runWorkflowExample() {
  // 1. 获取可用节点
  const nodes = await getAvailableNodes();
  console.log('可用节点:', nodes);
  
  // 2. 创建工作流配置
  const workflowConfig = {
    "nodes": [
      {"id": "classifier", "type": "classify_input"},
      {"id": "chat", "type": "llm_node"}
    ],
    "edges": [
      {"source": "START", "target": "classifier"},
      {
        "source": "classifier",
        "target": "",
        "is_condition": true,
        "route_function": "decide_next_node",
        "path_map": {
          "chat": "chat",
          "search": "chat"
        }
      },
      {"source": "chat", "target": "END"}
    ]
  };
  
  // 3. 验证工作流配置
  const validationResult = await validateWorkflow(workflowConfig);
  console.log('配置验证结果:', validationResult);
  
  // 4. 执行工作流
  const executionRequest = {
    "workflow_config": workflowConfig,
    "initial_state": {
      "messages": [
        {"type": "human", "content": "你好！"
        }
      ],
      "context": {},
      "intent": ""
    }
  };
  
  const executionResult = await executeWorkflow(executionRequest);
  console.log('执行结果:', executionResult);
}

// 运行示例
runWorkflowExample();
```

## 📝 扩展节点

要添加新的节点类型，需要：

1. 在 `nodes/` 目录中实现节点函数
2. 在 `fastapi_langgraph.py` 的 `NODE_REGISTRY` 中注册新节点

例如，添加一个新的节点类型：

```python
# 在 nodes/my_new_node.py 中实现节点函数
def my_new_node(state):
    # 节点逻辑实现
    return state

# 在 fastapi_langgraph.py 中注册节点
from nodes import my_new_node

NODE_REGISTRY = {
    # 现有节点...
    "my_new_node": my_new_node
}
```

## 🧪 测试

项目包含多个测试脚本，可以使用以下命令运行：

```bash
# 测试工作流配置验证
python test_llm.py

# 测试工作流执行
python test_workflow_execution.py
```

## 🔧 贡献代码

### 分支管理

- 提交前请创建分支：`feature/xxx` 或 `fix/xxx`
- 提交说明清晰简短，包含变更目的与影响范围

### 贡献指南

- 欢迎提交 Issue 与 Pull Request
- 在 PR 中描述测试步骤与预期行为

## 📞 联系与许可

- **许可证**：请查看仓库根目录下的 `LICENSE` 文件

---

*如有问题，请参考脚本内的详细提示或提交 Issue*