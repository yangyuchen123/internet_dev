1. 项目系统环境
本地JDK：JDK-24
云服务器部署：eclipse-temurin:21-jre（暂定）
https://github.com/HuxJiang/internet_dev#
项目仓库链接：git@github.com:HuxJiang/internet_dev.git；
2. 数据库设计
2.1 数据库表设计
用户表user、知识库表knowledge、角色表role、权限表permission、用户角色关联表user_role、角色权限关联表role_permission、智能体表agent、工作流表workflow、文档表document、插件表plugin、聊天会话表chat_session、聊天信息表chat_message
目前先定义的表：用户表user、角色表role、权限表permission、用户角色关联表user_role、角色权限关联表role_permission、智能体表agent、会话表conversation、消息表message

3. 前端页面设计
登录页            /login
注册页            /register
主页                /home
用户页            /user/{username}
插件页            /plugins
知识库页        /knowledge
工作流设计页 /workflow
智能体管理页 /agents

路由规则
未携带token  统一重定向到 /login


4. 接口设计
基础信息

认证方式
使用 Bearer Token 认证
text
Authorization: Bearer {access_token}
通用响应格式
json
{"code": 200,"message": "success","data": {},"timestamp": 1640995200000}
错误码说明:
错误码	说明
200	成功
400	请求参数错误
401	未授权
403	权限不足
404	资源不存在
500	服务器内部错误
999	系统错误

用户认证模块
4.1 用户登录（该接口已写好）
端点: POST http://localhost:8080/api/user/login
请求参数:
json
{
    "username": "testuser01",
    "password": "12345678"
}
限制：username长度为8-20，password长度为8-20
响应:
{
    "code": 200,
    "message": "登录成功",
    "data": {
        "id": 5,
        "username": "testuser01",
        "nickname": "testuser01",
        "email": "3877612901@qq.com",
        "avatar": "https://example.com/avatar.jpg",
        "lastLoginTime": "2025-11-20T13:54:00.9661671",
        "access_token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0dXNlcjAxIiwiZXhwIjoxNzYzNjE4OTQwfQ.ZkwTUZWwe10PWf-pM-4wfvdkjTzkA2j0mJ8u_xM-J24",
        "refresh_token": "DA4KJoquTsMqSuaptKIBWDbx-g6R_wS19uGjFh9l8-Wdxyaa6vpY526FgEZGCx67ADMopeDekLd2zXFNDTvIVg"
    },
    "timestamp": 1763618040985
}

4.2 刷新令牌（该接口已写好）
端点: POST http://localhost:8080/api/user/refresh
请求参数:
json
{
    "refreshToken": "DA4KJoquTsMqSuaptKIBWDbx-g6R_wS19uGjFh9l8-Wdxyaa6vpY526FgEZGCx67ADMopeDekLd2zXFNDTvIVg"
}
响应: 同登录接口
{
    "code": 200,
    "message": "刷新令牌成功",
    "data": {
        "id": 5,
        "username": "testuser01",
        "nickname": "testuser01",
        "email": "3877612901@qq.com",
        "avatar": "https://example.com/avatar.jpg",
        "lastLoginTime": "2025-11-20T13:54:01",
        "access_token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0dXNlcjAxIiwiZXhwIjoxNzYzNjE4OTk4fQ.GsZKjkSa1B-yEiLp2t7OCYewiovDQQyl-zLWYmcCnig",
        "refresh_token": "8dHV5rOVQLseKpli6sT3gCkrrpLT0LvA_pLqrf5Kss-HryzuBfxQHHoBysNHC9NDvzkYlAamDqg5ZY9Gp_XTYg"
    },
    "timestamp": 1763618098036
}

4.3 用户注册（该接口已写好）
端点: POST http://localhost:8080/api/user/register
请求参数:
json
{
    "username": "testuser01",
    "email": "3877612901@qq.com",
    "password": "12345678"
}
限制：username长度为8-20，email为标准邮件格式，password长度为8-20
响应：
{
    "code": 200,
    "message": "操作成功",
    "timestamp": 1763617991252
}

---
智能体管理模块
4.4 获取智能体列表（该接口已写好）
端点: GET http://localhost:8080/api/agent/get_agent_list?page=1&limit=20
查询参数:
- page (可选): 页码，默认1
- limit (可选): 每页数量，默认20
- category (可选): 分类筛选
- search (可选): 搜索关键词
响应:
{
    "code": 200,
    "message": "获取智能体列表成功",
    "data": {
        "agents": [
            {
                "id": 1,
                "name": "test_agent3_changed",
                "description": "This is test_agent3's changed description",
                "avatar": "",
                "category": "test_agent3_changed_category",
                "model": "test_agent3_changed_model",
                "systemPrompt": "This is changed_test_agent3's system prompt",
                "temperature": 0.8,
                "maxTokens": 2048,
                "isPublic": true,
                "creatorId": 6,
                "createdAt": "2025-11-20 15:45:52",
                "updatedAt": "2025-11-20 18:30:59"
            },
            {
                "id": 2,
                "name": "test_agent2",
                "description": "This is test_agent2's description",
                "avatar": "",
                "category": "test_agent2_category",
                "model": "test_agent2_model",
                "systemPrompt": "This is test_agent2's system prompt",
                "temperature": 0.75,
                "maxTokens": 4096,
                "isPublic": true,
                "creatorId": 6,
                "createdAt": "2025-11-20 15:48:03",
                "updatedAt": "2025-11-20 15:48:03"
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 20,
            "total": 2,
            "pages": 1
        }
    },
    "timestamp": 1763645152244
}

4.5 创建智能体（该接口已写好）
端点: POST http://localhost:8080/api/agent/create_agent
请求参数:
{
    "name": "test_agent2",
    "description": "This is test_agent2's description",
    "avatar": "",
    "category": "test_agent2_category",
    "model": "test_agent2_model",
    "systemPrompt": "This is test_agent2's system prompt",
    "temperature": 0.75,
    "maxTokens": 4096,
    "isPublic": true
}
响应：
{
    "code": 200,
    "message": "操作成功",
    "timestamp": 1763624883041
}

4.6 更新智能体（该接口已写好）
端点: PUT http://localhost:8080/api/agent/update_agent/{agentId}
请求参数: 
{
    "name": "test_agent3_changed",
    "description": "This is test_agent3's changed description",
    "avatar": "",
    "category": "test_agent3_changed_category",
    "model": "test_agent3_changed_model",
    "systemPrompt": "This is changed_test_agent3's system prompt",
    "temperature": 0.8,
    "maxTokens": 2048,
    "isPublic": true
}
响应：
{
    "code": 200,
    "message": "操作成功",
    "timestamp": 1763634659949
}

4.7 删除智能体（该接口已写好）
端点: DELETE http://localhost:8080/api/agent/delete_agent/{agentId}
响应：
{
    "code": 200,
    "message": "操作成功",
    "timestamp": 1763635195587
}


---
会话管理模块
4.8 创建会话（该接口已写好）
端点: POST http://localhost:8080/api/conversation/create_conversation
请求参数:
{
    "agent_id": 1,
    "title": "This is test title for agent with id 1.",
    "metadata": {
        "source": "web",
        "user_agent": "Mozilla/5.0..."
    }
}
响应:
{
    "code": 200,
    "message": "操作成功",
    "data": {
        "id": 1,
        "title": "This is test title for agent with id 1.",
        "agentId": 1,
        "createdAt": "2025-11-21T14:14:49.498856400",
        "updatedAt": "2025-11-21T14:14:49.498856400"
    },
    "timestamp": 1763705689509
}

4.9 获取会话列表（该接口已写好）
端点: GET http://localhost:8080/api/conversation/get_conversation_list
查询参数:
- page, limit: 分页参数
- agent_id (可选): 按智能体筛选  (这一部分还没有写)
响应：
{
    "code": 200,
    "message": "获取会话列表成功",
    "data": {
        "conversations": [
            {
                "id": 1,
                "title": "This is test title for agent with id 1.",
                "agentId": 1,
                "metadata": {
                    "source": "web",
                    "user_agent": "Mozilla/5.0..."
                }
            },
            {
                "id": 4,
                "title": "This is test title for agent with id 2.",
                "agentId": 2,
                "metadata": {
                    "source": "web",
                    "user_agent": "Mozilla/5.0..."
                }
            },
            {
                "id": 6,
                "title": "This is a test title.",
                "agentId": 1,
                "metadata": {
                    "source": "web",
                    "user_agent": "Mozilla/5.0..."
                }
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 20,
            "total": 3,
            "pages": 1,
            "agent_id": 0
        }
    },
    "timestamp": 1763712308282
}

4.10 获取会话详情（该接口已写好）
端点: GET http://localhost:8080/api/conversation/get_conversation/{conversation_id}
响应：
{
    "code": 200,
    "message": "操作成功",
    "data": {
        "id": 1,
        "title": "This is test title for agent with id 1.",
        "agentId": 1,
        "metadata": {
            "source": "web",
            "user_agent": "Mozilla/5.0..."
        },
        "createdAt": "2025-11-21T14:14:49",
        "updatedAt": "2025-11-21T14:14:49"
    },
    "timestamp": 1763709513514
}

4.11 删除会话（该接口已写好）
端点: DELETE http://localhost:8080/api/conversation/delete_conversation/{conversation_id}
响应：
{
    "code": 200,
    "message": "操作成功",
    "timestamp": 1763710913235
}


---
消息处理模块
4.12 发送消息（该接口已写好）
端点: POST /conversations/{conversation_id}/messages
请求参数:
{
    "content": "你好，今天是星期几？",
    "type": "text",
    "metadata": {"attachments": ["file_id_1", "file_id_2"]}
}
响应:
{
    "code": 200,
    "message": "消息发送成功",
    "data": {
        "userMessageVO": {
            "id": 7,
            "conversationId": 7,
            "content": "你好，今天是星期几？",
            "type": "text",
            "role": "user",
            "createdAt": "2025-11-21 18:00:50"
        },
        "agentMessageVO": {
            "id": 8,
            "conversationId": 7,
            "content": "您好！我是智能助手，很高兴为您服务。",
            "type": "text",
            "role": "assistant",
            "createdAt": "2025-11-21 18:00:50"
        }
    },
    "timestamp": 1763719250143
}

4.13 流式消息 (WebSocket)     这个功能我想的是后续再来，目前还没有调通
连接地址: wss://api.agent-platform.com/v1/ws/conversations/{conversation_id}
消息格式:
json
// 客户端发送{"type": "message","content": "用户消息内容","message_id": "msg_123"}
// 服务端响应{"type": "message_start","message_id": "msg_124"}{"type": "message_delta","content": "部分响应内容","message_id": "msg_124"}{"type": "message_end","message_id": "msg_124"}

4.14 获取消息历史（该接口已写好）
端点: GET http://localhost:8080/api/message/{conversation_id}/history
查询参数:
- page, limit: 分页参数
- before (可选): 在此时间之前的消息
响应：
{
    "code": 200,
    "message": "获取消息历史成功",
    "data": {
        "history": [
            {
                "userMessageVO": {
                    "id": 1,
                    "conversationId": 7,
                    "content": "string",
                    "type": "text",
                    "role": "user",
                    "createdAt": "2025-11-21 17:46:43"
                },
                "agentMessageVO": {
                    "id": 2,
                    "conversationId": 7,
                    "content": "您好！我是智能助手，很高兴为您服务。",
                    "type": "text",
                    "role": "assistant",
                    "createdAt": "2025-11-21 17:46:43"
                }
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 20,
            "total": 2,
            "pages": 1
        }
    },
    "timestamp": 1763725272861
}


---
文件管理模块
4.15 上传文件
端点: POST /files/upload
请求类型: multipart/form-data
参数:
- file: 文件
- conversation_id (可选): 关联会话
响应:
json
{"code": 200,"data": {"id": "file_123","filename": "document.pdf","url": "https://storage.example.com/files/document.pdf","size": 1024000,"mime_type": "application/pdf","uploaded_at": "2023-01-01T00:00:00Z"}}
4.16 获取文件信息
端点: GET /files/{file_id}

---
系统状态模块
4.17 健康检查
端点: GET /health
响应:
json
{"code": 200,"data": {"status": "healthy","timestamp": "2023-01-01T00:00:00Z","version": "1.0.0"}}
4.18 获取系统统计
端点: GET /stats (需要管理员权限)

---
实时通知模块 (WebSocket)
连接建立
text
wss://api.agent-platform.com/v1/ws/notifications
消息类型
json
// 新消息通知{"type": "new_message","data": {"conversation_id": "conv_123","message": {"id": "msg_123","content": "新消息内容","role": "user","created_at": "2023-01-01T00:00:00Z"}}}// 系统通知{"type": "system_notification","data": {"title": "系统维护通知","content": "系统将于今晚进行维护","level": "info", // info, warning, error"created_at": "2023-01-01T00:00:00Z"}}

---
错误处理示例
参数错误
json
{"code": 400,"message": "参数验证失败","data": {"errors": {"username": ["用户名不能为空"],"password": ["密码长度至少6位"]}},"timestamp": 1640995200000}
认证失败
json
{"code": 401,"message": "认证失败，请重新登录","data": null,"timestamp": 1640995200000}
