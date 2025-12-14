# MCP客户端自动连接器

## 概述

MCP客户端自动连接器是一个Python库，提供了自动连接插件系统MCP客户端的功能。它支持智能环境检测、自动重连机制和完整的错误处理。

## 功能特性

- ✅ **智能环境检测**：自动识别Docker环境和本地开发环境
- ✅ **自动重连机制**：支持配置最大重试次数和重试延迟
- ✅ **完整的错误处理**：详细的日志记录和异常处理
- ✅ **异步支持**：基于asyncio的异步操作
- ✅ **上下文管理器**：支持async with语法
- ✅ **多客户端管理**：支持同时管理多个MCP客户端连接

## 安装依赖

```bash
pip install aiohttp
```

## 快速开始

### 基本用法

```python
import asyncio
from mcp_auto_connector import MCPAutoConnector

async def main():
    # 使用自动连接器
    async with MCPAutoConnector() as connector:
        # 连接MCP客户端
        result = await connector.connect_mcp_client(
            client_id="my-client-001",
            server_url="https://api.example.com/mcp",
            bearer_token="your-token-here",
            initialize_operations=[
                {"type": "ping"},
                {"type": "listTools"}
            ]
        )
        print(f"连接成功: {result}")

asyncio.run(main())
```

### 高级用法

```python
import asyncio
from mcp_auto_connector import MCPAutoConnector

async def advanced_example():
    # 手动指定插件服务器URL
    async with MCPAutoConnector("http://custom-plugin-server:3000") as connector:
        
        # 连接多个客户端
        client_configs = [
            {
                "client_id": "deepseek-client",
                "server_url": "https://api.deepseek.com/chat",
                "bearer_token": "deepseek-token",
                "client_info": {"name": "deepseek-mcp", "version": "1.0.0"}
            },
            {
                "client_id": "weather-client", 
                "server_url": "https://api.weather.com/tools",
                "headers": {"X-API-Key": "weather-key"}
            }
        ]
        
        # 批量连接
        for config in client_configs:
            try:
                result = await connector.connect_mcp_client(**config)
                print(f"客户端 {config['client_id']} 连接成功")
            except Exception as e:
                print(f"客户端 {config['client_id']} 连接失败: {e}")
        
        # 执行MCP操作
        operation = {
            "type": "callTool",
            "name": "chat",
            "arguments": {"message": "Hello, world!"}
        }
        
        try:
            result = await connector.execute_mcp_operation("deepseek-client", operation)
            print(f"操作执行成功: {result}")
        except Exception as e:
            print(f"操作执行失败: {e}")
        
        # 列出所有连接的客户端
        clients = await connector.list_connected_clients()
        print(f"已连接客户端: {clients}")

asyncio.run(advanced_example())
```

## API参考

### MCPAutoConnector类

#### 构造函数

```python
MCPAutoConnector(plugin_server_url: str = None)
```

- `plugin_server_url`: 插件服务器URL，如果为None则自动检测

#### 主要方法

##### connect_mcp_client

```python
async def connect_mcp_client(
    client_id: str,
    server_url: str,
    server_headers: Dict[str, str] = None,
    bearer_token: str = None,
    client_info: Dict[str, str] = None,
    initialize_operations: List[Dict[str, Any]] = None,
    max_retries: int = 3,
    retry_delay: float = 1.0
) -> Dict[str, Any]
```

连接MCP客户端。

##### disconnect_mcp_client

```python
async def disconnect_mcp_client(client_id: str) -> Dict[str, Any]
```

断开MCP客户端连接。

##### execute_mcp_operation

```python
async def execute_mcp_operation(
    client_id: str, 
    operation: Dict[str, Any]
) -> Dict[str, Any]
```

执行MCP操作。

##### list_connected_clients

```python
async def list_connected_clients() -> Dict[str, Any]
```

列出所有已连接的MCP客户端。

## 环境检测

自动连接器支持以下环境检测：

- **Docker环境**: 检测`/.dockerenv`文件，使用`http://plugin-server:3000`
- **本地环境**: 使用`http://localhost:3000`

## 错误处理

自动连接器提供完整的错误处理机制：

- 连接失败时自动重试（可配置重试次数）
- 详细的日志记录
- 异常信息包含完整的错误上下文

## 测试

运行测试脚本：

```bash
python test_mcp_auto_connector.py
```

## 集成示例

### 与工作流系统集成

```python
from mcp_auto_connector import MCPAutoConnector
from manager.workflow_manager import create_dynamic_agent_node_config

async def integrate_with_workflow():
    """与工作流系统集成示例"""
    async with MCPAutoConnector() as connector:
        
        # 连接MCP客户端
        await connector.connect_mcp_client(
            client_id="workflow-agent-001",
            server_url="https://api.deepseek.com/chat",
            bearer_token="your-token"
        )
        
        # 创建工作流节点配置
        node_config = create_dynamic_agent_node_config(
            client_id="workflow-agent-001",
            tool_name="chat",
            parameters={"message": "Hello from workflow"}
        )
        
        print(f"工作流节点配置创建成功: {node_config}")
```

## 故障排除

### 常见问题

1. **连接失败**：检查插件服务器是否运行
2. **认证失败**：验证bearer token或API密钥
3. **网络问题**：检查网络连接和防火墙设置

### 调试模式

启用详细日志：

```python
import logging
logging.getLogger("mcp_auto_connector").setLevel(logging.DEBUG)
```

## 许可证

本项目基于MIT许可证开源。

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。