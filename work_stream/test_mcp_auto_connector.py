#!/usr/bin/env python3
"""
MCP自动连接器测试脚本

这个脚本测试MCP客户端自动连接器的基本功能。
"""

import asyncio
import json
from mcp_auto_connector import MCPAutoConnector


async def test_basic_connection():
    """测试基本连接功能"""
    print("=== 测试基本连接功能 ===")
    
    try:
        async with MCPAutoConnector() as connector:
            # 测试连接到本地插件服务器
            client_id = "test-basic-connection"
            
            # 使用本地插件服务器作为测试目标
            server_url = "http://localhost:3000"
            
            # 尝试连接
            result = await connector.connect_mcp_client(
                client_id=client_id,
                server_url=server_url,
                initialize_operations=[
                    {"type": "ping"}
                ]
            )
            
            print(f"✓ 基本连接测试成功")
            print(f"   响应状态: {result.get('message', 'Unknown')}")
            
            # 断开连接
            await connector.disconnect_mcp_client(client_id)
            print(f"✓ 断开连接成功")
            
    except Exception as e:
        print(f"✗ 基本连接测试失败: {str(e)}")
        print("   注意：如果插件服务器未运行，这个测试会失败")


async def test_environment_detection():
    """测试环境检测功能"""
    print("\n=== 测试环境检测功能 ===")
    
    # 测试自动URL检测
    connector = MCPAutoConnector()
    detected_url = connector._detect_plugin_server_url()
    
    print(f"检测到的插件服务器URL: {detected_url}")
    
    # 测试手动指定URL
    custom_connector = MCPAutoConnector("http://custom-server:3000")
    print(f"手动指定的插件服务器URL: {custom_connector.plugin_server_url}")
    
    print("✓ 环境检测功能测试完成")


async def test_error_handling():
    """测试错误处理功能"""
    print("\n=== 测试错误处理功能 ===")
    
    try:
        async with MCPAutoConnector() as connector:
            # 测试无效的服务器URL
            client_id = "test-error-handling"
            
            try:
                await connector.connect_mcp_client(
                    client_id=client_id,
                    server_url="http://invalid-server:9999",
                    max_retries=1  # 减少重试次数以加快测试
                )
                print("✗ 错误处理测试失败：应该抛出异常")
                
            except Exception as e:
                print(f"✓ 错误处理测试成功：正确捕获异常")
                print(f"   异常信息: {str(e)}")
                
    except Exception as e:
        print(f"✗ 错误处理测试失败: {str(e)}")


async def test_client_management():
    """测试客户端管理功能"""
    print("\n=== 测试客户端管理功能 ===")
    
    try:
        async with MCPAutoConnector() as connector:
            # 测试连接多个客户端
            client_ids = ["test-client-1", "test-client-2"]
            
            for client_id in client_ids:
                try:
                    await connector.connect_mcp_client(
                        client_id=client_id,
                        server_url="http://localhost:3000",
                        initialize_operations=[{"type": "ping"}]
                    )
                    print(f"✓ 客户端连接成功: {client_id}")
                    
                except Exception as e:
                    print(f"✗ 客户端连接失败: {client_id} - {str(e)}")
            
            # 测试列出客户端
            try:
                clients_list = await connector.list_connected_clients()
                print(f"✓ 获取客户端列表成功")
                print(f"   客户端数量: {len(clients_list.get('data', {}).get('clients', []))}")
                
            except Exception as e:
                print(f"✗ 获取客户端列表失败: {str(e)}")
            
            # 清理：断开所有客户端
            for client_id in client_ids:
                try:
                    await connector.disconnect_mcp_client(client_id)
                    print(f"✓ 客户端断开成功: {client_id}")
                    
                except Exception as e:
                    print(f"✗ 客户端断开失败: {client_id} - {str(e)}")
                    
    except Exception as e:
        print(f"✗ 客户端管理测试失败: {str(e)}")


async def main():
    """主测试函数"""
    print("开始MCP自动连接器测试...\n")
    
    # 运行所有测试
    await test_environment_detection()
    await test_basic_connection()
    await test_error_handling()
    await test_client_management()
    
    print("\n=== 测试完成 ===")
    print("注意：某些测试需要插件服务器运行才能完全成功")


if __name__ == "__main__":
    asyncio.run(main())