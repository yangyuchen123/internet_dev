"""
Agent和MCP工具发现服务
用于从数据库获取agent信息和MCP工具发现
"""
import httpx
import mysql.connector
from typing import Dict, List, Any, Optional
from fastapi import HTTPException
import os

class AgentDiscoveryService:
    """Agent和MCP工具发现服务"""
    
    def __init__(self, plugin_server_url: str = "http://localhost:3000"):
        self.plugin_server_url = plugin_server_url
        self.client = httpx.AsyncClient()
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', '3306')),
            'user': os.getenv('DB_USER', 'test_user'),
            'password': os.getenv('DB_PASSWORD', '12345678'),
            'database': os.getenv('DB_NAME', 'ai_agent_db')
        }
    
    async def discover_agents(self) -> List[Dict[str, Any]]:
        """
        从数据库获取所有可用的agent
        
        Returns:
            List[Dict]: agent列表，包含id、name、category、url、connect_type等信息
        """
        try:
            # 连接数据库
            connection = mysql.connector.connect(**self.db_config)
            cursor = connection.cursor(dictionary=True)
            
            # 查询所有公开的agent
            query = """
                SELECT id, name, description, avatar, category, url, connect_type, 
                       is_tested, is_public, created_at, updated_at
                FROM agent 
                WHERE is_public = 1 
                ORDER BY updated_at DESC
            """
            cursor.execute(query)
            agents = cursor.fetchall()
            
            # 关闭数据库连接
            cursor.close()
            connection.close()
            
            # 格式化数据以匹配原有接口
            formatted_agents = []
            for agent in agents:
                formatted_agents.append({
                    "id": agent["id"],
                    "name": agent["name"],
                    "description": agent["description"],
                    "avatar": agent["avatar"],
                    "category": agent["category"],
                    "url": agent["url"],
                    "connectType": agent["connect_type"],
                    "isTested": bool(agent["is_tested"]),
                    "isPublic": bool(agent["is_public"]),
                    "createdAt": agent["created_at"].isoformat() if agent["created_at"] else None,
                    "updatedAt": agent["updated_at"].isoformat() if agent["updated_at"] else None
                })
            
            return formatted_agents
        except Exception as e:
            raise HTTPException(500, f"从数据库获取agent列表失败: {str(e)}")
    
    async def get_agent_by_id(self, agent_id: int) -> Dict[str, Any]:
        """
        根据agent_id获取单个agent的详细信息
        
        Args:
            agent_id: agent ID
            
        Returns:
            Dict: agent详细信息
        """
        try:
            # 连接数据库
            connection = mysql.connector.connect(**self.db_config)
            cursor = connection.cursor(dictionary=True)
            
            # 查询指定agent
            query = """
                SELECT id, name, description, avatar, category, url, connect_type, 
                       is_tested, is_public, created_at, updated_at
                FROM agent 
                WHERE id = %s
            """
            cursor.execute(query, (agent_id,))
            agent = cursor.fetchone()
            
            # 关闭数据库连接
            cursor.close()
            connection.close()
            
            if not agent:
                raise HTTPException(404, f"未找到ID为 {agent_id} 的agent")
            
            # 格式化数据
            formatted_agent = {
                "id": agent["id"],
                "name": agent["name"],
                "description": agent["description"],
                "avatar": agent["avatar"],
                "category": agent["category"],
                "url": agent["url"],
                "connectType": agent["connect_type"],
                "isTested": bool(agent["is_tested"]),
                "isPublic": bool(agent["is_public"]),
                "createdAt": agent["created_at"].isoformat() if agent["created_at"] else None,
                "updatedAt": agent["updated_at"].isoformat() if agent["updated_at"] else None
            }
            
            return formatted_agent
        except Exception as e:
            raise HTTPException(500, f"获取agent信息失败: {str(e)}")
    
    async def discover_mcp_tools(self, client_id: str) -> List[Dict[str, Any]]:
        """
        发现指定MCP客户端的所有可用工具
        
        Args:
            client_id: MCP客户端ID
            
        Returns:
            List[Dict]: 工具列表，包含name、description、inputSchema等信息
        """
        try:
            # 执行listTools操作
            operation = {
                "type": "listTools"
            }
            
            response = await self.client.post(
                f"{self.plugin_server_url}/mcp-client/{client_id}/operation",
                json={"operation": operation}
            )
            
            if response.status_code == 200:
                data = response.json()
                tools = data.get("data", {}).get("result", {}).get("tools", [])
                return tools
            else:
                raise HTTPException(response.status_code, f"获取MCP工具列表失败: {response.text}")
        except Exception as e:
            raise HTTPException(500, f"发现MCP工具失败: {str(e)}")
    
    async def get_agent_tools(self, agent_id: int) -> List[Dict[str, Any]]:
        """
        获取指定agent的所有可用工具
        
        Args:
            agent_id: agent ID
            
        Returns:
            List[Dict]: 工具列表
        """
        # 这里需要根据agent的具体实现来获取工具
        # 目前假设每个agent都通过MCP客户端提供工具
        try:
            # 首先尝试连接到agent对应的MCP客户端
            client_id = f"agent_{agent_id}"
            
            # 这里需要根据agent的类型和配置来构建MCP连接
            # 暂时返回空列表，实际实现需要根据agent配置来连接
            return []
        except Exception as e:
            raise HTTPException(500, f"获取agent工具失败: {str(e)}")
    
    async def discover_all_available_tools(self) -> Dict[str, Any]:
        """
        发现所有可用的工具（包括agent工具和MCP工具）
        
        Returns:
            Dict: 包含agents和mcp_tools的工具字典
        """
        try:
            agents = await self.discover_agents()
            
            # 获取所有已连接的MCP客户端
            response = await self.client.get(f"{self.plugin_server_url}/mcp-client")
            mcp_clients = []
            
            if response.status_code == 200:
                data = response.json()
                mcp_clients = data.get("data", {}).get("clients", [])
            
            # 为每个MCP客户端获取工具
            mcp_tools = {}
            for client in mcp_clients:
                if client.get("connected"):
                    client_id = client.get("clientId")
                    try:
                        tools = await self.discover_mcp_tools(client_id)
                        mcp_tools[client_id] = {
                            "client_id": client_id,
                            "tools": tools
                        }
                    except Exception as e:
                        print(f"获取MCP客户端 {client_id} 的工具失败: {e}")
            
            return {
                "agents": agents,
                "mcp_tools": mcp_tools
            }
        except Exception as e:
            raise HTTPException(500, f"发现所有可用工具失败: {str(e)}")
    
    async def close(self):
        """关闭HTTP客户端"""
        await self.client.aclose()

# 全局agent发现服务实例
# 在Docker环境中使用容器名，本地开发使用localhost
import os
plugin_server_host = os.getenv("PLUGIN_SERVER_URL")
if not plugin_server_host:
    # 检查是否在Docker环境中（通过检查环境变量或文件系统）
    if os.path.exists("/.dockerenv"):
        plugin_server_host = "http://plugin-server:3000"
    else:
        plugin_server_host = "http://localhost:3000"

agent_discovery_service = AgentDiscoveryService(plugin_server_url=plugin_server_host)