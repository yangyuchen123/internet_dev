# share

说明：
`share` 目录用于存放项目内部共享的代码、工具、库和资源，这些内容由多个子项目（如 `backend`、`frontend`、`mini-app`）复用。

常见用途：

- 公共工具函数（日期处理、日志封装、错误处理等）
- 通用类型定义（TypeScript 的 `types` / Python 的 dataclass 或 pydantic 模型）
- 接口/协议定义（protobuf、OpenAPI 片段、JSON schema）
- 静态资源（图标、字体、公共样式）
- 共享测试工具与 Mock 数据
