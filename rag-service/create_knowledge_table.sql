-- 创建knowledge表的SQL脚本
USE demo_db;

-- 如果表已存在则删除（谨慎使用）
-- DROP TABLE IF EXISTS knowledge;

-- 创建knowledge表
CREATE TABLE IF NOT EXISTS knowledge (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT '知识标题',
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

-- 插入测试数据
INSERT INTO knowledge (title, content, category, keywords, source) VALUES
('项目管理基础', '项目管理是指在项目活动中运用专门的知识、技能、工具和方法，使项目能够在有限资源限定条件下，实现或超过设定的需求和期望的过程。', '技术', '项目管理,基础,方法论', '内部文档'),
('软件开发流程', '软件开发流程包括需求分析、设计、编码、测试、部署和维护等阶段。每个阶段都有其特定的任务和输出。', '技术', '软件开发,流程,生命周期', '技术文档'),
('数据库优化技巧', '数据库优化包括索引优化、查询优化、表结构优化等方面，合理的优化可以显著提升系统性能。', '技术', '数据库,优化,性能', '技术博客');

SELECT 'knowledge表创建成功，并插入了3条测试数据' AS result;