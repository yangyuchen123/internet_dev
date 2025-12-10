SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 身体健康Agent平台示例数据
USE ai_agent_db;

-- 插入测试用户
INSERT INTO `user` (`id`, `username`, `password`, `nickname`, `email`, `phone`, `avatar`, `gender`, `birthday`, `status`, `last_login_time`, `created_at`, `updated_at`, `is_deleted`) VALUES
(1, 'testuser01', '$2a$10$jvHoI7ix1loyMFYYCIVzjee6oL5Vb.GmI8keHVjYYe95yaluAh28y', 'testuser01', '3877612901@qq.com', NULL, 'https://example.com/avatar.jpg', NULL, NULL, 1, '2025-11-20 18:39:46', '2025-11-20 13:53:11', '2025-11-20 18:39:45', 0),
(2, 'testuser02', '$2a$10$OWVx3PwZM0vu0lkJjEHPZuLqBJAY7jaDRqSaWNhtLiRI//LKP3vyu', 'testuser02', '3877612901@qq.com', NULL, 'https://example.com/avatar.jpg', NULL, NULL, 1, '2025-11-23 15:38:50', '2025-11-20 13:56:00', '2025-11-23 15:38:50', 0);

-- 插入测试Agent
INSERT INTO `agent` (`id`, `name`, `description`, `avatar`, `category`, `url`, `connect_type`, `is_tested`, `is_public`, `created_at`, `updated_at`) VALUES
(1, 'deepseek-chat', '本工具用于实现用户聊天，调用deepseek-chat模型', 'https://example.com/avatar.jpg', 'chat-model', 'localhost:3100/mcp', 'stream-http', 1, 1, '2025-11-20 15:45:52', '2025-11-20 18:30:59'),
(2, '12306-MCP', '12306火车订票助手', 'https://example.com/avatar.jpg', 'tool', 'https://mcp.api-inference.modelscope.net/9f3ca4667bca41/mcp', 'stream-http', 1, 1, '2025-11-20 15:48:03', '2025-11-20 15:48:03'),
(3, 'sensor-MCP', '传感器控制助手', 'https://example.com/avatar.jpg', 'tool', 'localhost:3200/mcp', 'stream-http', 1, 1, '2025-11-19 17:48:03', '2025-11-20 12:48:03');

INSERT INTO `user_agent` (`id`, `user_id`, `agent_id`, `is_owner`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, '2025-11-20 15:45:52', '2025-11-20 18:30:59'),
(2, 1, 2, 1, '2025-11-20 15:48:03', '2025-11-20 15:48:03'),
(3, 1, 3, 1, '2025-11-20 15:46:03', '2025-11-20 15:58:03');

INSERT INTO `conversation` (`id`, `creator_id`, `main_agent_id`, `title`, `metadata`, `provider`, `model`, `temperature`, `max_tokens`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'This is test title for agent with id 1.', '{"source": "web", "user_agent": "Mozilla/5.0..."}', 'deepseek', 'deepseek-chat', 0.80, 1024, '2025-11-21 14:14:49', '2025-11-21 14:14:49'),
(2, 2, 1, 'This is test title for agent with id 2.', '{"source": "web", "user_agent": "Mozilla/5.0..."}', 'deepseek', 'deepseek-chat', 0.70, 2048, '2025-11-21 16:03:33', '2025-11-22 16:03:33');

INSERT INTO `agent_conversation` (`id`, `agent_id`, `conversation_id`, `created_at`) VALUES
(1, 2, 1, '2025-11-21 14:14:49'),
(2, 3, 1, '2025-11-21 16:03:33');

-- 插入测试消息
INSERT INTO `message` (`id`, `conversation_id`, `role`, `content`, `type`, `metadata`, `created_at`) VALUES
(1, 1, 'user', '你好！', 'text', '{\"attachments\": [\"file_id_1\", \"file_id_2\"]}', '2025-11-21 17:46:43'),
(2, 1, 'assistant', '您好！我是智能助手，很高兴为您服务。', 'text', NULL, '2025-11-21 17:46:43');

-- 插入测试数据
INSERT INTO knowledge (title, user, content, category, keywords, source) VALUES
('项目管理基础', 'test', '项目管理是指在项目活动中运用专门的知识、技能、工具和方法，使项目能够在有限资源限定条件下，实现或超过设定的需求和期望的过程。', '技术', '项目管理,基础,方法论', '内部文档'),
('软件开发流程', 'test', '软件开发流程包括需求分析、设计、编码、测试、部署和维护等阶段。每个阶段都有其特定的任务和输出。', '技术', '软件开发,流程,生命周期', '技术文档'),
('数据库优化技巧', 'test', '数据库优化包括索引优化、查询优化、表结构优化等方面，合理的优化可以显著提升系统性能。', '技术', '数据库,优化,性能', '技术博客');
