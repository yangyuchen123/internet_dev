-- Agent平台数据库初始化脚本
-- 数据库: ai_agent_db

-- 设置字符集
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 创建数据库（指定字符集）
CREATE DATABASE IF NOT EXISTS ai_agent_db 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE ai_agent_db;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS `user` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `nickname` VARCHAR(50) NULL COMMENT '昵称',
  `email` VARCHAR(100) NULL COMMENT '邮箱',
  `phone` VARCHAR(20) NULL COMMENT '手机号',
  `avatar` VARCHAR(255) NULL COMMENT '头像URL',
  `gender` TINYINT(1) NULL COMMENT '性别 0-未知 1-男 2-女',
  `birthday` DATE NULL COMMENT '生日',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态 0-禁用 1-正常',
  `last_login_time` DATETIME NULL COMMENT '最后登录时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除 0-未删除 1-删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 角色表
CREATE TABLE IF NOT EXISTS `role` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `name` VARCHAR(50) NOT NULL COMMENT '角色名称',
  `code` VARCHAR(50) NOT NULL COMMENT '角色编码',
  `description` VARCHAR(200) NULL COMMENT '描述',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态 0-禁用 1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 3. 权限表
CREATE TABLE IF NOT EXISTS `permission` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '权限ID',
  `name` VARCHAR(50) NOT NULL COMMENT '权限名称',
  `code` VARCHAR(50) NOT NULL COMMENT '权限编码',
  `type` VARCHAR(20) NOT NULL COMMENT '权限类型',
  `parent_id` BIGINT NULL COMMENT '父级ID',
  `path` VARCHAR(200) NULL COMMENT '路径',
  `icon` VARCHAR(50) NULL COMMENT '图标',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态 0-禁用 1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 4. 用户角色关联表
CREATE TABLE IF NOT EXISTS `user_role` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 5. 角色权限关联表
CREATE TABLE IF NOT EXISTS `role_permission` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `permission_id` BIGINT NOT NULL COMMENT '权限ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 6. 智能体表
CREATE TABLE IF NOT EXISTS `agent` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '智能体ID',
  `name` VARCHAR(255) NOT NULL COMMENT '智能体名称',
  `description` TEXT COMMENT '智能体描述',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '智能体头像URL',
  `category` VARCHAR(64) NOT NULL COMMENT '智能体分类',
  `model` VARCHAR(64) NOT NULL COMMENT '模型类型',
  `system_prompt` TEXT COMMENT '系统提示词',
  `temperature` DECIMAL(3,2) DEFAULT 0.7 COMMENT '生成文本temperature参数',
  `max_tokens` INT DEFAULT 2000 COMMENT '最大生成tokens数',
  `is_public` TINYINT(1) DEFAULT 0 COMMENT '是否公开，0=私有，1=公开',
  `creator_id` BIGINT NOT NULL COMMENT '创建者用户ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_creator_id` (`creator_id`),
  INDEX `idx_name` (`name`),
  CONSTRAINT `fk_agent_creator` FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='智能体表';

-- 7. 会话表
CREATE TABLE IF NOT EXISTS `conversation` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '会话ID',
  `agent_id` BIGINT NOT NULL COMMENT '对应的智能体id',
  `title` VARCHAR(255) DEFAULT NULL COMMENT '会话标题',
  `metadata` JSON DEFAULT NULL COMMENT '元数据',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_agent_id` (`agent_id`),
  INDEX `idx_title` (`title`),
  CONSTRAINT `fk_conversation_agent` FOREIGN KEY (`agent_id`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话表';

-- 8. 消息表
CREATE TABLE IF NOT EXISTS `message` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `conversation_id` BIGINT NOT NULL COMMENT '所属会话ID',
  `role` ENUM('user','assistant') NOT NULL COMMENT '发送者角色',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `type` ENUM('text','image','file', 'video') NOT NULL DEFAULT 'text' COMMENT '消息类型',
  `metadata` JSON DEFAULT NULL COMMENT '附加信息，如附件等',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_conversation_id` (`conversation_id`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_message_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息表';

-- 9. 用户知识库
CREATE TABLE IF NOT EXISTS knowledge (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT '知识标题',
    user VARCHAR(255) NOT NULL COMMENT '用户',
    content LONGTEXT NOT NULL COMMENT '知识内容',
    category VARCHAR(100) DEFAULT NULL COMMENT '分类',
    keywords VARCHAR(500) DEFAULT NULL COMMENT '关键词',
    source VARCHAR(200) DEFAULT NULL COMMENT '来源',
    is_deleted TINYINT DEFAULT 0 COMMENT '是否删除',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_category (category),
    INDEX idx_is_deleted (is_deleted),
    INDEX idx_created_at (created_at),
    FULLTEXT INDEX ft_title_content (title, content) COMMENT '全文索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库表';

