# Plugin Server API 文档

## 1. 基本信息

- 标题：Plugin Server API
- 描述：REST API proxying chat requests to OpenAI
- 版本：0.1.0

## 2. 通用响应格式

所有接口统一返回 `ResponseBase` 结构：

| 字段          | 类型    | 说明                           |
| ------------- | ------- | ------------------------------ |
| `code`      | integer | 业务状态码。                   |
| `message`   | string  | 描述信息。                     |
| `data`      | object  | 具体数据载荷，结构因接口而异。 |
| `timestamp` | integer | 服务端时间戳（毫秒）。         |

## 3. 通用说明

- 注意：java后端调用本服务器端口时，不需要额外设置，基础 URL为 `http://localhost:3000`，前端调用本服务器端口时需要通过java网关，调用的端口需要添加前缀：`http://xxx.com/api/plugin`
- `200`、`201`、`202` 等成功响应在 `data` 字段携带业务数据。
- 除非特别说明，`400`、`403`、`404`、`502`、`503` 等错误响应均返回 `ResponseBase` 结构，仅 `code` 与 `message` 有意义。

## 4. 系统接口

### 4.1 健康检查

- **方法与路径**：`GET /`
- **用途**：检测服务健康状态。
- **请求参数**：无。
- **响应示例**：
  ```json
  {
  	"code": 0,
  	"message": "Success",
  	"data": {
  		"status": "ok",
  		"message": "Service is healthy"
  	},
  	"timestamp": 1733808000000
  }
  ```

## 5. 消息接口

### 5.1 发送消息

- **方法与路径**：`POST /message/send`
- **标签**：messages
- **用途**：通过 MCP 代理发送聊天消息，并返回模型回复。
- **请求体**：

  | 字段               | 类型    | 必填 | 约束/说明                         |
  | ------------------ | ------- | ---- | --------------------------------- |
  | `conversationId` | integer | 是   | 最小值 `1`。                    |
  | `userId`         | integer | 是   | 最小值 `1`。                    |
  | `messages`       | array   | 是   | 至少 1 条消息。每条消息结构如下。 |

  消息对象字段：

  | 字段             | 类型   | 必填 | 约束/说明                                             |
  | ---------------- | ------ | ---- | ----------------------------------------------------- |
  | `role`         | string | 是   | 枚举：`system`、`user`、`assistant`、`tool`。 |
  | `content`      | string | 是   | 最小长度 `1`。                                      |
  | `name`         | string | 否   | 最小长度 `1`。                                      |
  | `tool_call_id` | string | 否   | 最小长度 `1`。                                      |
  | `to`           | string | 否   | 最小长度 `1`。                                      |
  | `tool_calls`   | array  | 否   | 见下方 Tool Call 结构。                               |

  Tool Call 对象：

  | 字段         | 类型   | 必填 | 约束/说明            |
  | ------------ | ------ | ---- | -------------------- |
  | `id`       | string | 否   | 最小长度 `1`。     |
  | `type`     | string | 是   | 枚举：`function`。 |
  | `function` | object | 是   | 见下表。             |

  Function 对象字段：

  | 字段          | 类型   | 必填 | 约束/说明                     |
  | ------------- | ------ | ---- | ----------------------------- |
  | `name`      | string | 是   | 最小长度 `1`。              |
  | `arguments` | string | 是   | 最小长度 `2`，JSON 字符串。 |
- **成功响应 (`200`)**：`data.messages` 为模型回复消息数组，结构同请求消息对象。
- **错误响应**：`400`（参数错误）、`502`（调用上游失败）。
- **描述**：`description` 为“Invoke the MCP chat tool for a conversation using its main agent.”。

## 6. 会话接口

### 6.1 创建会话

- **方法与路径**：`POST /conversation/create`
- **标签**：conversation
- **请求体**：| 字段            | 类型    | 必填 | 约束/说明                                              |
  | --------------- | ------- | ---- | ------------------------------------------------------ |
  | `userId`      | integer | 是   | 最小值 `1`。                                         |
  | `model`       | string  | 是   | 最小长度 `1`。                                       |
  | `agentIds`    | array   | 否   | 可空；元素为最小值 `1` 的整数。                      |
  | `mainAgent`   | integer | 否   | 可空；最小值 `1`。                                   |
  | `title`       | string  | 否   | 最大长度 `255`。                                     |
  | `metadata`    | object  | 否   | 可空；任意键值对。                                     |
  | `messages`    | array   | 否   | 可空；至少 1 项；项包含 `role` 与 `content` 字段。 |
  | `provider`    | string  | 否   | 可空。                                                 |
  | `temperature` | number  | 否   | 可空；范围 `[0, 2]`。                                |
  | `maxTokens`   | integer | 否   | 可空；最小值 `1`。                                   |
- **成功响应 (`201`)**：`data.conversation` 包含会话信息。
- **错误响应**：`400`（参数错误）、`404`（资源未找到）、`503`（服务不可用）。

会话对象字段：

| 字段            | 类型         | 说明                |
| --------------- | ------------ | ------------------- |
| `id`          | integer      | 会话 ID。           |
| `userId`      | integer      | 所属用户。          |
| `mainAgent`   | integer/null | 主代理 ID。         |
| `agentIds`    | array/null   | 代理 ID 列表。      |
| `title`       | string/null  | 会话标题。          |
| `metadata`    | object       | 自定义元数据。      |
| `provider`    | string/null  | 模型提供方。        |
| `model`       | string/null  | 使用的模型。        |
| `temperature` | number/null  | 采样温度。          |
| `maxTokens`   | integer/null | 最大 token。        |
| `createdAt`   | string/null  | 创建时间，ISO8601。 |
| `updatedAt`   | string/null  | 更新时间，ISO8601。 |

### 6.2 更新会话

- **方法与路径**：`PUT /conversation/update`
- **请求体**：字段与创建接口一致，但 `conversationId` 为必填，`userId` 仍必填。
- **成功响应 (`200`)**：返回更新后的 `data.conversation`。
- **错误响应**：`400`、`403`、`404`、`503`。

### 6.3 查询会话列表

- **方法与路径**：`GET /conversation/list`
- **查询参数**：| 名称       | 类型    | 必填 | 说明                    |
  | ---------- | ------- | ---- | ----------------------- |
  | `userId` | integer | 是   | 用户 ID，最小值 `1`。 |
- **成功响应 (`200`)**：`data.conversations` 为会话对象数组，结构同上。
- **错误响应**：`400`、`404`、`503`。

### 6.4 删除会话

- **方法与路径**：`DELETE /conversation/delete`
- **查询参数**：| 名称               | 类型    | 必填 | 说明                    |
  | ------------------ | ------- | ---- | ----------------------- |
  | `conversationId` | integer | 是   | 会话 ID，最小值 `1`。 |
  | `userId`         | integer | 是   | 用户 ID，最小值 `1`。 |
- **成功响应 (`200`)**：`data.id` 为删除的会话 ID，`data.deleted` 为布尔值。
- **错误响应**：`400`、`403`、`404`、`503`。

## 7. Agent 接口

### 7.1 创建 Agent

- **方法与路径**：`POST /agent/create`
- **请求体**：| 字段            | 类型    | 必填 | 约束/说明                              |
  | --------------- | ------- | ---- | -------------------------------------- |
  | `name`        | string  | 是   | 长度 `1-255`。                       |
  | `category`    | string  | 是   | 长度 `1-64`。                        |
  | `userId`      | integer | 是   | 最小值 `1`。                         |
  | `description` | string  | 否   | 可空。                                 |
  | `avatar`      | string  | 否   | 可空，最大长度 `255`。               |
  | `url`         | string  | 否   | 可空，最大长度 `255`。               |
  | `connectType` | string  | 否   | 可空；枚举：`stream-http`、`sse`。 |
  | `isTested`    | boolean | 否   | 可空。                                 |
  | `isPublic`    | boolean | 否   | 可空。                                 |
- **成功响应 (`201`)**：`data.agent` 返回 Agent 详情。
- **错误响应**：`400`、`503`。

Agent 对象字段：

| 字段            | 类型        | 说明         |
| --------------- | ----------- | ------------ |
| `id`          | integer     | Agent ID。   |
| `name`        | string      | Agent 名称。 |
| `description` | string/null | 描述。       |
| `avatar`      | string/null | 头像 URL。   |
| `category`    | string      | 分类。       |
| `url`         | string/null | 外部链接。   |
| `connectType` | string      | 连接类型。   |
| `isTested`    | boolean     | 是否已测试。 |
| `isPublic`    | boolean     | 是否公开。   |
| `createdAt`   | string/null | 创建时间。   |
| `updatedAt`   | string/null | 更新时间。   |

### 7.2 删除 Agent

- **方法与路径**：`DELETE /agent/delete`
- **查询参数**：`agentId`、`userId`（均为整数且最小值 `1`）。
- **成功响应 (`200`)**：`data.agentId` 为删除的 Agent ID。
- **错误响应**：`400`、`403`、`404`、`503`。

### 7.3 标记 Agent 已测试

- **方法与路径**：`POST /agent/test`
- **请求体**：`agentId`、`userId` 必填（整数 ≥1），`isTested` 可选布尔值。
- **成功响应 (`200`)**：`data.agent` 返回 `id`、`isTested`、`updatedAt`。
- **错误响应**：`400`、`403`、`404`、`503`。

### 7.4 发布/下架 Agent

- **方法与路径**：`POST /agent/publish`
- **请求体**：`agentId`、`userId` 必填，`isPublic` 可选布尔值。
- **成功响应 (`200`)**：`data.agent` 返回 `id`、`isPublic`、`updatedAt`。
- **错误响应**：`400`、`403`、`404`、`503`。

### 7.5 收藏 Agent

- **方法与路径**：`POST /agent/favorite`
- **请求体**：`agentId`、`userId` 必填，`note` 可选字符串（最大长度 `255`，可空）。
- **成功响应 (`202`)**：`data.relationship` 包含 `agentId`、`userId`、`isOwner`。
- **错误响应**：`400`、`404`、`503`。

### 7.6 取消收藏 Agent

- **方法与路径**：`DELETE /agent/favorite`
- **查询参数**：`agentId`、`userId`（整数 ≥1）。
- **成功响应 (`202`)**：`data.relationship` 返回 `agentId`、`userId`。
- **错误响应**：`400`、`404`、`503`。

### 7.7 获取公开 Agent 列表

- **方法与路径**：`GET /agent/public`
- **请求参数**：无。
- **成功响应 (`200`)**：`data.agents` 为 Agent 对象数组。
- **错误响应**：`503`。

### 7.8 获取用户关联 Agent 列表

- **方法与路径**：`GET /agent/list`
- **查询参数**：`userId`（整数 ≥1）。
- **成功响应 (`200`)**：`data.agents` 数组；元素包含 Agent 字段以及 `isOwner`。
- **错误响应**：`400`、`503`。

## 8. MCP 客户端接口

### 8.1 建立/替换持久连接

- **方法与路径**：`POST /mcp-client/connect`
- **请求体**：

  | 字段           | 类型   | 必填 | 说明                          |
  | -------------- | ------ | ---- | ----------------------------- |
  | `clientId`   | string | 是   | 客户端唯一标识。              |
  | `server`     | object | 是   | 详见下表。                    |
  | `initialize` | object | 否   | 启动时要执行的 MCP 操作列表。 |

  `server` 对象字段：

  | 字段                             | 类型   | 必填 | 说明                         |
  | -------------------------------- | ------ | ---- | ---------------------------- |
  | `url`                          | string | 是   | MCP 服务地址。               |
  | `headers`                      | object | 否   | 额外请求头。                 |
  | `bearerToken`                  | string | 否   | 授权令牌。                   |
  | `client`                       | object | 否   | 包含 `name`、`version`。 |
  | `capabilities`                 | object | 否   | 能力声明。                   |
  | `sessionId`                    | string | 否   | 会话 ID。                    |
  | `protocolVersion`              | string | 否   | 协议版本。                   |
  | `reconnectionOptions`          | object | 否   | 重连配置。                   |
  | `auth`                         | object | 否   | 认证信息。                   |
  | `defaultTaskPollInterval`      | number | 否   | 默认任务轮询间隔。           |
  | `maxTaskQueueSize`             | number | 否   | 最大任务队列。               |
  | `debouncedNotificationMethods` | array  | 否   | 需要去抖的通知方法列表。     |
  | `retryInterval`                | number | 否   | 重试间隔。                   |

  `initialize.operations` 项目：

  | 字段          | 类型   | 必填 | 说明                                                                                                               |
  | ------------- | ------ | ---- | ------------------------------------------------------------------------------------------------------------------ |
  | `type`      | string | 是   | 枚举：`ping`、`listTools`、`callTool`、`listResources`、`readResource`、`listPrompts`、`getPrompt`。 |
  | `params`    | object | 否   | 操作参数。                                                                                                         |
  | `cursor`    | string | 否   | 游标。                                                                                                             |
  | `name`      | string | 否   | 工具名称。                                                                                                         |
  | `arguments` | object | 否   | 工具参数。                                                                                                         |
  | `uri`       | string | 否   | 资源 URI。                                                                                                         |
- **成功响应 (`200`)**：`data` 中包含 `clientId`、`connection` 信息及 `initialization` 结果。
- **错误响应**：`400`、`502`。

### 8.2 断开持久连接

- **方法与路径**：`POST /mcp-client/{clientId}/disconnect`
- **路径参数**：`clientId`（string）必填。
- **响应**：`200` 成功。

### 8.3 查询持久连接列表

- **方法与路径**：`GET /mcp-client`
- **成功响应 (`200`)**：`data.clients` 为客户端数组，包含 `clientId` 与 `connected`。

### 8.4 获取持久连接信息

- **方法与路径**：`GET /mcp-client/{clientId}/info`
- **路径参数**：`clientId`（string）必填。
- **响应**：`200` 返回连接信息；具体结构依实现决定。

### 8.5 执行单个 MCP 操作

- **方法与路径**：`POST /mcp-client/{clientId}/operation`
- **路径参数**：`clientId` 必填。
- **请求体**：| 字段          | 类型   | 必填 | 说明                                         |
  | ------------- | ------ | ---- | -------------------------------------------- |
  | `operation` | object | 是   | 结构同 8.1 中 `initialize.operations` 项。 |
- **成功响应 (`200`)**：`data` 包含 `clientId`、`operation`（字符串标识）以及 `result`。
- **错误响应**：`400`、`404`、`502`。

### 8.6 执行多个 MCP 操作

- **方法与路径**：`POST /mcp-client/{clientId}/operations`
- **路径参数**：`clientId` 必填。
- **请求体**：| 字段                | 类型    | 必填 | 说明                               |
  | ------------------- | ------- | ---- | ---------------------------------- |
  | `operations`      | array   | 是   | 至少 1 项，结构同单个操作。        |
  | `continueOnError` | boolean | 否   | 是否在单个操作失败时继续后续操作。 |
- **成功响应 (`200`)**：`data` 中包含 `clientId`、`operationsCount`、`results` 数组与 `errors` 数组。
- **错误响应**：`400`、`404`、`502`。
