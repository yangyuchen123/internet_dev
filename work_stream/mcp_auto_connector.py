#!/usr/bin/env python3
"""
MCP客户端自动连接器

这个脚本提供了自动连接插件系统MCP客户端的功能，支持智能环境检测和自动重连机制。
"""

import os
import sys
import json
import asyncio
import aiohttp
import logging
from typing import Dict, Any, Optional, List
from urllib.parse import urljoin

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("mcp_auto_connector")


class MCPAutoConnector:
    """MCP客户端自动连接器"""
    
    def __init__(self, plugin_server_url: str = None):
        """
        初始化自动连接器
        
        Args:
            plugin_server_url: 插件服务器URL，如果为None则自动检测
        """
        self.plugin_server_url = plugin_server_url or self._detect_plugin_server_url()
        self.session = None
        self.connected_clients = {}
        
    def _detect_plugin_server_url(self) -> str:
        """
        自动检测插件服务器URL
        
        Returns:
            插件服务器URL
        """
        # 检查是否在Docker环境中
        if os.path.exists("/.dockerenv"):
            # Docker环境中使用容器名
            return "http://plugin-server:3000"
        else:
            # 本地开发环境使用localhost
            return "http://localhost:3000"
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        await self.connect_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.close_session()
    
    async def connect_session(self):
        """创建HTTP会话"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
            logger.info(f"创建HTTP会话，目标服务器: {self.plugin_server_url}")
    
    async def close_session(self):
        """关闭HTTP会话"""
        if self.session:
            await self.session.close()
            self.session = None
            logger.info("HTTP会话已关闭")
    
    async def connect_mcp_client(
        self, 
        client_id: str, 
        server_url: str,
        server_headers: Dict[str, str] = None,
        bearer_token: str = None,
        client_info: Dict[str, str] = None,
        initialize_operations: List[Dict[str, Any]] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ) -> Dict[str, Any]:
        """
        自动连接MCP客户端
        
        Args:
            client_id: 客户端唯一标识
            server_url: MCP服务器URL
            server_headers: 服务器请求头
            bearer_token: Bearer令牌
            client_info: 客户端信息
            initialize_operations: 初始化操作列表
            max_retries: 最大重试次数
            retry_delay: 重试延迟（秒）
            
        Returns:
            连接结果
        """
        await self.connect_session()
        
        # 构建服务器配置
        server_config = {
            "url": server_url,
            "headers": server_headers or {},
        }
        
        if bearer_token:
            server_config["bearerToken"] = bearer_token
        
        if client_info:
            server_config["client"] = client_info
        
        # 构建请求体
        request_body = {
            "clientId": client_id,
            "server": server_config
        }
        
        if initialize_operations:
            request_body["initialize"] = {
                "operations": initialize_operations
            }
        
        # 重试机制
        for attempt in range(max_retries):
            try:
                url = urljoin(self.plugin_server_url, "/mcp-client/connect")
                
                logger.info(f"尝试连接MCP客户端 (尝试 {attempt + 1}/{max_retries}): {client_id}")
                
                async with self.session.post(url, json=request_body) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.connected_clients[client_id] = {
                            "server_config": server_config,
                            "connection_info": result.get("data", {}).get("connection", {})
                        }
                        logger.info(f"MCP客户端连接成功: {client_id}")
                        return result
                    else:
                        error_text = await response.text()
                        logger.warning(f"MCP客户端连接失败 (状态码 {response.status}): {error_text}")
                        
                        if attempt < max_retries - 1:
                            logger.info(f"等待 {retry_delay} 秒后重试...")
                            await asyncio.sleep(retry_delay)
                        else:
                            raise Exception(f"MCP客户端连接失败: {error_text}")
                            
            except Exception as e:
                logger.error(f"连接MCP客户端时发生错误: {str(e)}")
                
                if attempt < max_retries - 1:
                    logger.info(f"等待 {retry_delay} 秒后重试...")
                    await asyncio.sleep(retry_delay)
                else:
                    raise
        
        raise Exception("达到最大重试次数，连接失败")
    
    async def disconnect_mcp_client(self, client_id: str) -> Dict[str, Any]:
        """
        断开MCP客户端连接
        
        Args:
            client_id: 客户端唯一标识
            
        Returns:
            断开结果
        """
        if client_id not in self.connected_clients:
            logger.warning(f"客户端 {client_id} 未连接")
            return {"message": "客户端未连接"}
        
        try:
            url = urljoin(self.plugin_server_url, f"/mcp-client/{client_id}/disconnect")
            
            async with self.session.post(url) as response:
                if response.status == 200:
                    result = await response.json()
                    del self.connected_clients[client_id]
                    logger.info(f"MCP客户端断开成功: {client_id}")
                    return result
                else:
                    error_text = await response.text()
                    raise Exception(f"断开MCP客户端失败: {error_text}")
                    
        except Exception as e:
            logger.error(f"断开MCP客户端时发生错误: {str(e)}")
            raise
    
    async def execute_mcp_operation(
        self, 
        client_id: str, 
        operation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        执行MCP操作
        
        Args:
            client_id: 客户端唯一标识
            operation: MCP操作
            
        Returns:
            操作结果
        """
        if client_id not in self.connected_clients:
            raise Exception(f"客户端 {client_id} 未连接")
        
        try:
            url = urljoin(self.plugin_server_url, f"/mcp-client/{client_id}/operation")
            
            request_body = {
                "operation": operation
            }
            
            async with self.session.post(url, json=request_body) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"MCP操作执行成功: {operation.get('type', 'unknown')}")
                    return result
                else:
                    error_text = await response.text()
                    raise Exception(f"执行MCP操作失败: {error_text}")
                    
        except Exception as e:
            logger.error(f"执行MCP操作时发生错误: {str(e)}")
            raise
    
    async def list_connected_clients(self) -> Dict[str, Any]:
        """
        列出所有已连接的MCP客户端
        
        Returns:
            客户端列表
        """
        try:
            url = urljoin(self.plugin_server_url, "/mcp-client")
            
            async with self.session.get(url) as response:
                if response.status == 200:
                    result = await response.json()
                    return result
                else:
                    error_text = await response.text()
                    raise Exception(f"获取MCP客户端列表失败: {error_text}")
                    
        except Exception as e:
            logger.error(f"获取MCP客户端列表时发生错误: {str(e)}")
            raise


async def example_usage():
    """示例用法"""
    print("=== MCP客户端自动连接器示例 ===")
    
    # 1. 创建自动连接器
    async with MCPAutoConnector() as connector:
        
        # 2. 连接MCP客户端
        try:
            # 示例：连接DeepSeek Chat MCP服务器
            client_id = "workstream-deepseek-001"
            server_url = "https://api.deepseek.com/chat/completions"  # 示例URL
            
            # 初始化操作（可选）
            initialize_operations = [
                {
                    "type": "ping"
                },
                {
                    "type": "listTools"
                }
            ]
            
            # 客户端信息
            client_info = {
                "name": "workstream-mcp-client",
                "version": "1.0.0"
            }
            
            # 连接MCP客户端
            result = await connector.connect_mcp_client(
                client_id=client_id,
                server_url=server_url,
                client_info=client_info,
                initialize_operations=initialize_operations
            )
            
            print(f"✓ MCP客户端连接成功: {client_id}")
            print(f"   连接信息: {json.dumps(result.get('data', {}), indent=2, ensure_ascii=False)}")
            
            # 3. 执行MCP操作示例
            try:
                # 示例：调用聊天工具
                operation = {
                    "type": "callTool",
                    "name": "chat",
                    "arguments": {
                        "message": "Hello, how are you?"
                    }
                }
                
                operation_result = await connector.execute_mcp_operation(client_id, operation)
                print(f"✓ MCP操作执行成功: {operation['type']}")
                print(f"   操作结果: {json.dumps(operation_result.get('data', {}), indent=2, ensure_ascii=False)}")
                
            except Exception as e:
                print(f"✗ MCP操作执行失败: {str(e)}")
            
            # 4. 列出所有连接的客户端
            try:
                clients_list = await connector.list_connected_clients()
                print(f"✓ 已连接MCP客户端列表:")
                print(f"   {json.dumps(clients_list.get('data', {}), indent=2, ensure_ascii=False)}")
                
            except Exception as e:
                print(f"✗ 获取客户端列表失败: {str(e)}")
            
            # 5. 断开连接
            try:
                disconnect_result = await connector.disconnect_mcp_client(client_id)
                print(f"✓ MCP客户端断开成功: {client_id}")
                
            except Exception as e:
                print(f"✗ 断开MCP客户端失败: {str(e)}")
                
        except Exception as e:
            print(f"✗ MCP客户端连接失败: {str(e)}")
    
    print("=== 示例结束 ===")


if __name__ == "__main__":
    # 运行示例
    asyncio.run(example_usage())