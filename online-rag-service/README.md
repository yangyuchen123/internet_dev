# RAG 服务文档

## 项目简介

RAG (Retrieval-Augmented Generation) 服务是一个基于检索增强生成的智能问答系统，能够从上传的文档中检索相关信息并提供精准的回答。本服务提供了文档导入、向量搜索、混合搜索等核心功能，并附带一个完整的前端测试界面。

## 最新更新

- **模型下载脚本**：新增 `download_model.py` 脚本，支持自动下载 HuggingFace 模型到本地
- **Docker 优化**：移除了 Dockerfile 中的 `--no-cache-dir` 参数，大幅提高构建效率
- **代码优化**：简化了 `start_service.py` 中的模型验证逻辑，移除了 `app.py` 中不必要的 `id` 字段
- **数据隔离**：强化了多用户数据隔离机制，确保用户数据安全
- **接口变更**：元数据结构中移除 source 字段，优化存储结构

## 功能特性

- **文档导入**：支持多种格式文档的上传和索引
- **向量搜索**：基于语义相似度的高效检索
- **混合搜索**：结合关键词搜索和向量搜索的优势
- **健康检查**：服务状态监控和索引信息查询
- **前端测试界面**：直观的交互界面，方便测试和使用
- **CORS支持**：允许跨域请求，便于前后端分离开发

## 技术栈

### 后端
- Python 3.8+
- FastAPI
- Uvicorn (ASGI服务器)
- 向量数据库
- 嵌入模型 (Embedding Model)
- 混合搜索算法

### 前端
- HTML5 / CSS3 / JavaScript
- 响应式设计
- 纯前端实现，无需额外构建工具

## 环境要求

- Python 3.8 或更高版本
- pip 包管理工具
- 足够的内存空间用于向量存储和模型文件
- 互联网连接（用于下载模型）

## 安装说明

### 1. 克隆项目（如果适用）

```bash
git clone <项目仓库地址>
cd rag-service
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

复制 `.env.example` 文件为 `.env` 并根据需要修改配置：

```bash
cp .env.example .env
# 编辑 .env 文件，设置相应的环境变量
```

## 模型下载说明

本服务提供了 `download_model.py` 脚本，用于自动下载和管理嵌入模型。

### 查看可用模型

```bash
python download_model.py --list
```

这将显示所有预配置的模型别名及其对应的 HuggingFace 模型 ID。

### 下载预配置模型

```bash
python download_model.py zh-small
```

常用的预配置模型别名：
- `zh-small`: BAAI/bge-small-zh-v1.5 (轻量级中文模型)
- `zh-base`: BAAI/bge-base-zh-v1.5 (基础中文模型)
- `zh-large`: BAAI/bge-large-zh-v1.5 (大型中文模型)
- `en-small`: BAAI/bge-small-en-v1.5 (轻量级英文模型)
- `en-base`: BAAI/bge-base-en-v1.5 (基础英文模型)
- `en-large`: BAAI/bge-large-en-v1.5 (大型英文模型)

### 下载自定义模型

```bash
python download_model.py --output ./model_name HuggingFaceModelID
```

### 脚本参数说明

- `model_id`: 模型 ID 或预配置的模型别名
- `--output`: 指定下载目录（默认：./model）
- `--force`: 强制重新下载，覆盖现有模型
- `--list`: 列出所有预配置的模型别名
- `--proxy`: 设置代理服务器（可选）

## 配置说明

主要配置项位于以下文件：

1. **环境变量 (.env)**
   - API密钥
   - 数据库连接信息
   - 模型配置

2. **配置文件 (config.py)**
   - 服务端口和主机设置
   - 向量存储配置
   - 搜索参数默认值

## 启动方法

### 方法一：直接使用 Uvicorn 启动

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

- `--host 0.0.0.0`：允许从任何IP访问服务
- `--port 8000`：设置服务端口为8000
- `--reload`：启用热重载，便于开发

### 方法二：使用启动脚本

```bash
python start_service.py
```


## API接口规范

### 1. 健康检查接口

#### POST /rag/health

**功能**：检查服务状态并获取用户特定的索引信息

**请求体**：
```json
{
  "user": "用户名"
}
```

**响应示例**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "model": "text-embedding-model",
    "index_count": 10,
    "service_time": "2024-01-01T12:00:00Z"
  }
}
```

### 2. 文档导入接口

#### POST /rag/ingest

**功能**：上传并索引文档，为指定用户创建隔离的向量存储

**请求体**：
```json
{
  "user": "用户名",  // 必需，用户标识
  "source": "raw",  // 或 "db"
  "title": "文件标题",
  "category": "分类",  // 如 general, document, article 等
  "text": "文本内容",
  "keywords": "关键词，用逗号分隔",
  "chunkSize": 500,  // 分块大小
  "chunkOverlap": 50  // 重叠大小
}
```

**响应示例**：
```json
{
  "code": 0,
  "message": "文档导入成功",
  "data": {
    "file_name": "example.pdf",
    "chunks_count": 50,
    "index_time": "2024-01-01T12:00:00Z"
  }
}
```

### 3. 向量搜索接口

#### POST /rag/search

**功能**：基于语义相似度搜索指定用户的相关内容

**请求体**：
```json
{
  "user": "用户名",  // 必需，用户标识
  "q": "搜索查询",  // 必需
  "topK": 10,  // 返回结果数量，默认10
  "category": "可选类别"  // 可选，按类别过滤
}
**响应示例**：
```json
{
  "code": 0,
  "message": "搜索成功",
  "data": [
    {
      "content": "...相关文本内容...",
      "score": 0.95,
      "metadata": {
        "page": 1,
        "category": "技术文档"
      }
    },
    ...
  ]
}
```

### 4. 混合搜索接口

#### POST /rag/hybrid-search

**功能**：结合关键词搜索和向量搜索，为指定用户提供混合检索结果

**请求体**：
```json
{
  "user": "用户名",  // 必需，用户标识
  "q": "搜索查询",
  "topK": 10,
  "category": "可选类别",
  "alpha": 0.7,  // 向量搜索权重
  "beta": 0.3    // 关键词搜索权重
}
```

**响应示例**：
```json
{
  "code": 0,
  "message": "混合搜索成功",
  "data": [
    {
      "content": "...相关文本内容...",
      "score": 0.92,
      "vector_score": 0.95,
      "keyword_score": 0.85,
      "metadata": {
        "page": 1
      }
    },
    ...
  ]
}
```

### 4. 删除标题接口

#### POST /rag/delete-by-title

**功能**：删除指定用户的索引，清空其向量存储

**请求体**：
```json
{
  "user": "string",
  "title": "string"
}
```

**响应示例**：
```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "deleted": 7
  }
}
```

### 4. 删除种类接口

#### POST /rag/delete-by-category

**功能**：删除指定用户的索引，清空其向量存储

**请求体**：
```json
{
  "user": "string",
  "category": "string"
}
```

**响应示例**：
```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "deleted": 7
  }
}
```

## 测试方法

### 使用前端界面测试

1. 确保后端服务已启动（端口8000）
2. 使用以下方式之一启动前端：
   - 运行 `start_frontend.bat` 脚本
   - 手动启动：`cd frontend && python -m http.server 3000`
3. 在文件夹中使用游览器直接打开 `index.html` 文件
4. 使用界面上的标签页测试各个功能：
   - 文件上传：上传文档并索引
   - 文本输入：直接输入文本内容进行索引
   - 内容搜索：进行向量搜索
   - 混合搜索：进行混合搜索
   - 服务状态：检查服务健康状态

### API接口测试

可以使用Postman、curl等工具直接测试API接口：

```bash
# 测试健康检查接口
curl -X POST http://localhost:8000/rag/health \
  -H "Content-Type: application/json" \
  -d '{"user": "test_user"}'

# 测试搜索接口
curl -X POST http://localhost:8000/rag/search \
  -H "Content-Type: application/json" \
  -d '{"user": "test_user", "q": "你的查询", "topK": 5}'

# 测试文档导入接口
curl -X POST http://localhost:8000/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{"user": "test_user", "source": "raw", "title": "测试文档", "text": "测试内容", "category": "general"}'

# 测试混合搜索接口
curl -X POST http://localhost:8000/rag/hybrid-search \
  -H "Content-Type: application/json" \
  -d '{"user": "test_user", "q": "你的查询", "topK": 10, "alpha": 0.7, "beta": 0.3}'
```

## 前端界面使用说明

前端界面提供了五个主要功能标签页：

1. **文件上传**：上传PDF、TXT等格式的文档，支持设置分块大小和类别标签
2. **文本输入**：直接输入文本内容进行索引，适用于少量文本的快速测试
3. **内容搜索**：输入查询语句进行向量搜索，可调整返回结果数量和类别过滤
4. **混合搜索**：进行混合搜索，可调整向量搜索和关键词搜索的权重比例
5. **服务状态**：查看服务运行状态、索引数量等信息

详细使用说明请参考 `frontend/README.md` 文件。

## 部署说明

### 本地开发环境

按照上述启动方法直接运行即可。

### Docker部署

项目包含Docker配置，可以使用Docker快速部署：

```bash
docker-compose up -d
```

Docker配置文件：
- `Dockerfile`：定义服务镜像（已优化依赖缓存机制）
- `docker-compose.yml`：编排服务
- `.env.docker`：Docker环境变量配置

### Docker优化说明

我们对Docker构建过程进行了优化，移除了`--no-cache-dir`参数，这将：

- 允许pip缓存下载的Python包
- 允许Docker缓存依赖安装层
- 大幅提高后续构建速度，特别是在requirements.txt未变更的情况下

**注意**：第一次构建仍需下载所有依赖，但后续构建将显著加快。

## 技术细节

### 核心模块

1. **app.py**：FastAPI应用主入口，定义API路由、CORS配置和多用户隔离逻辑
   - 已优化元数据结构，移除不必要的`id`字段，提高数据处理效率
2. **config.py**：配置管理模块
3. **download_model.py**：模型下载工具，支持HuggingFace模型的自动下载和验证
4. **services/**：服务层模块
   - **db.py**：数据库交互
   - **embedder.py**：文本嵌入模型封装
   - **vector_store.py**：向量存储管理，支持多用户数据隔离
   - **hybrid_search.py**：混合搜索算法实现
5. **start_service.py**：服务启动脚本
   - 已简化模型验证逻辑，提高启动效率

### 文档处理流程

1. 文档上传
2. 文档解析和分块
3. 文本向量化
4. 向量存储索引

### 搜索算法

1. **向量搜索**：使用余弦相似度计算语义相似性
2. **关键词搜索**：基于词频和逆文档频率（TF-IDF）
3. **混合搜索**：加权融合两种搜索结果

## 常见问题

### 1. 服务启动失败

- 检查Python版本是否符合要求
- 确保所有依赖已正确安装
- 检查端口是否被占用

### 2. 文档上传失败

- 检查文件格式是否支持
- 确保文件大小在限制范围内
- 查看服务日志获取详细错误信息

### 3. 搜索结果不准确

- 调整分块大小参数
- 尝试使用混合搜索并调整权重
- 确保已上传足够的相关文档

## 注意事项

1. 服务默认监听 0.0.0.0:8000，请确保防火墙设置允许访问
2. 所有API接口现在都需要在请求体中提供user参数，以实现多用户数据隔离
3. 生产环境部署时应移除 `--reload` 参数
4. 建议定期备份索引数据
5. 大文件处理可能需要较长时间，请耐心等待
6. 不同用户的数据物理隔离存储，确保数据安全性

## 许可证

[在此添加许可证信息]

## 联系方式

如有问题或建议，请联系项目维护者。