const { McpClient } = require('../mcp/client');
const { loadConfig } = require('../config');
const { ensureStringContent, serializeMetadata, parseJsonColumn } = require('../utils/serialization');
const { toNullableNumber, ensurePositiveInteger } = require('../utils/validation');
const { RouteError } = require('../utils/errors');

// 该路由用于统一处理与主 MCP Agent 的聊天请求，并负责协调联动的子 Agent。

const DEFAULT_TOOL_NAME = 'chat';
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant', 'tool']);
const MAX_TOOL_ITERATIONS = 6;

// 聊天消息的基础校验 schema，确保角色、内容及工具调用字段合法。
const CHAT_MESSAGE_SCHEMA = {
  type: 'object',
  required: ['role', 'content'],
  properties: {
    role: { type: 'string', enum: ['system', 'user', 'assistant', 'tool'] },
    content: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    tool_call_id: { type: 'string', minLength: 1 },
    to: { type: 'string', minLength: 1 },
    tool_calls: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', minLength: 1 },
          type: { type: 'string', const: 'function' },
          function: {
            type: 'object',
            required: ['name', 'arguments'],
            properties: {
              name: { type: 'string', minLength: 1 },
              arguments: { type: 'string', minLength: 2 }
            },
            additionalProperties: false
          }
        },
        required: ['type', 'function'],
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
};

// 尝试从配置文件推导 Deepseek MCP 服务器默认地址，提供兜底连接信息。
const buildDefaultServerConfig = () => {
  try {
    const { deepseekServer } = loadConfig();

    if (!deepseekServer || deepseekServer.enabled === false) {
      return null;
    }

    const hostRaw = typeof deepseekServer.host === 'string' ? deepseekServer.host.trim() : '';
    const host = hostRaw.length > 0 ? hostRaw : 'localhost';
    const port = Number(deepseekServer.port) || 3100;
    const base = host.includes('://') ? host : `http://${host}`;

    let url;

    try {
      url = new URL(base);
    } catch (_error) {
      return null;
    }

    if (port > 0) {
      url.port = String(port);
    }

    let basePath = url.pathname || '/';
    if (basePath !== '/') {
      basePath = basePath.replace(/\/+$/u, '');
      if (basePath.length === 0) {
        basePath = '/';
      }
    }

    url.pathname = basePath === '/' ? '/mcp' : `${basePath}/mcp`;
    url.search = '';
    url.hash = '';

    return { url: url.toString() };
  } catch (_error) {
    return null;
  }
};

// 合并用户提供的服务器配置与默认配置，确保得到有效的 MCP 服务器 URL。
const resolveServerConfig = (serverInput) => {
  const defaultConfig = buildDefaultServerConfig();
  const config = defaultConfig ? { ...defaultConfig } : {};

  if (serverInput && typeof serverInput === 'object') {
    if (typeof serverInput.url === 'string' && serverInput.url.trim().length > 0) {
      config.url = serverInput.url.trim();
    }

    for (const [key, value] of Object.entries(serverInput)) {
      if (key !== 'url') {
        config[key] = value;
      }
    }
  }

  if (!config.url) {
    throw new Error('MCP server url is required. Provide server.url or enable the Deepseek MCP server.');
  }

  return config;
};

// 将外部请求的消息列表进行标准化，统一格式并做严格校验。
const normalizeMessages = (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must contain at least one entry');
  }

  return messages.map((message, index) => {
    if (!message || typeof message !== 'object') {
      throw new Error(`messages[${index}] must be an object`);
    }

    const { role, content, name, tool_call_id, tool_calls, to } = message;

    if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) {
      throw new Error(`messages[${index}].role must be one of system, user, assistant, tool`);
    }

    if (typeof content !== 'string' || content.length === 0) {
      throw new Error(`messages[${index}].content must be a non-empty string`);
    }

    const entry = { role, content };
    if (to !== undefined) {
      if (typeof to !== 'string' || to.trim().length === 0) {
        throw new Error(`messages[${index}].to must be a non-empty string when provided`);
      }
      entry.to = to.trim();
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new Error(`messages[${index}].name must be a non-empty string when provided`);
      }
      entry.name = name.trim();
    }

    if (tool_call_id !== undefined) {
      if (typeof tool_call_id !== 'string' || tool_call_id.trim().length === 0) {
        throw new Error(`messages[${index}].tool_call_id must be a non-empty string when provided`);
      }
      entry.tool_call_id = tool_call_id.trim();
    } else if (role === 'tool') {
      throw new Error(`messages[${index}].tool_call_id is required when role is "tool"`);
    }

    if (tool_calls !== undefined) {
      if (role !== 'assistant') {
        throw new Error(`messages[${index}].tool_calls is only allowed on assistant messages`);
      }

      if (!Array.isArray(tool_calls) || tool_calls.length === 0) {
        throw new Error(`messages[${index}].tool_calls must be a non-empty array when provided`);
      }

      const normalizedToolCallList = tool_calls.map((call, callIndex) => {
        if (!call || typeof call !== 'object') {
          throw new Error(`messages[${index}].tool_calls[${callIndex}] must be an object`);
        }

        const { id, type, function: callFunction } = call;

        if (id !== undefined) {
          if (typeof id !== 'string' || id.trim().length === 0) {
            throw new Error(`messages[${index}].tool_calls[${callIndex}].id must be a non-empty string when provided`);
          }
        }

        if (type !== 'function') {
          throw new Error(`messages[${index}].tool_calls[${callIndex}].type must be "function"`);
        }

        if (!callFunction || typeof callFunction !== 'object') {
          throw new Error(`messages[${index}].tool_calls[${callIndex}].function must be an object`);
        }

        const { name: functionName, arguments: functionArguments } = callFunction;

        if (typeof functionName !== 'string' || functionName.trim().length === 0) {
          throw new Error(`messages[${index}].tool_calls[${callIndex}].function.name must be a non-empty string`);
        }

        if (typeof functionArguments !== 'string' || functionArguments.trim().length === 0) {
          throw new Error(`messages[${index}].tool_calls[${callIndex}].function.arguments must be a non-empty JSON string`);
        }

        return {
          id: id === undefined ? undefined : id.trim(),
          type: 'function',
          function: {
            name: functionName.trim(),
            arguments: functionArguments.trim()
          }
        };
      });

      entry.tool_calls = normalizedToolCallList;
    }

    return entry;
  });
};

// 将工具名称转化为 MCP 可接受的安全格式，并附带 Agent 前缀。
const sanitizeToolName = (agentId, toolName) => {
  const safeAgentId = Number.isFinite(Number(agentId)) ? Number(agentId) : String(agentId ?? '').trim();
  const agentPrefix = safeAgentId ? `agent_${safeAgentId}_` : '';

  const rawName = typeof toolName === 'string' ? toolName.trim() : '';
  if (!rawName) {
    return null;
  }

  const normalized = rawName
    .replace(/\s+/gu, '_')
    .replace(/[^a-zA-Z0-9_]/gu, '_')
    .replace(/_{2,}/gu, '_')
    .replace(/^_+|_+$/gu, '');

  const baseName = normalized.length > 0 ? normalized : rawName.replace(/\s+/gu, '_');
  const fullName = `${agentPrefix}${baseName}`;
  return fullName.length > 64 ? fullName.slice(0, 64) : fullName;
};

// 根据联动 Agent 的工具描述生成规范的 LLM 工具定义，并保留映射信息。
const normalizeToolDefinition = (tool, agent) => {
  if (!tool || typeof tool !== 'object') {
    return null;
  }

  const baseName = typeof tool.name === 'string' ? tool.name.trim() : '';

  if (!baseName) {
    return null;
  }

  const sanitizedName = sanitizeToolName(agent?.agentId, baseName);

  if (!sanitizedName) {
    return null;
  }

  const descriptionParts = [];

  if (typeof tool.description === 'string' && tool.description.trim().length > 0) {
    descriptionParts.push(tool.description.trim());
  }

  if (agent) {
    const agentLabel = agent.name ? `${agent.name} (#${agent.agentId})` : `agent ${agent.agentId}`;
    descriptionParts.push(`Provided by ${agentLabel}. Original tool name: ${baseName}.`);
  }

  const description = descriptionParts.join(' ');

  const parameters =
    (tool.inputSchema && typeof tool.inputSchema === 'object' ? tool.inputSchema : null) ||
    (tool.input_schema && typeof tool.input_schema === 'object' ? tool.input_schema : null) ||
    { type: 'object', properties: {}, additionalProperties: true };

  return {
    definition: {
      type: 'function',
      function: {
        name: sanitizedName,
        description: description || undefined,
        parameters
      }
    },
    sanitizedName,
    originalName: baseName,
    originalTool: tool,
    agentId: agent?.agentId ?? null,
    agentName: agent?.name ?? null
  };
};

// 收集所有可用工具的定义供 LLM 使用，同时建立名称映射方便反查。
const buildToolsForLlm = (linkedAgents = []) => {
  const definitions = [];
  const map = new Map();

  for (const agent of linkedAgents) {
    if (!agent || !Array.isArray(agent.tools)) {
      continue;
    }

    for (const tool of agent.tools) {
      const normalized = normalizeToolDefinition(tool, agent);
      if (normalized) {
        definitions.push(normalized.definition);
        map.set(normalized.sanitizedName, {
          agentId: normalized.agentId,
          agentName: normalized.agentName,
          originalName: normalized.originalName,
          originalTool: normalized.originalTool
        });
      }
    }
  }

  return { definitions, map };
};

// 从 MCP 返回的内容块中提取纯文本，作为助手回复主体。
const extractTextContent = (toolResult) => {
  if (!toolResult || !Array.isArray(toolResult.content)) {
    return '';
  }

  return toolResult.content
    .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
};

// 确认当前 fastify 实例已正确挂载 MySQL 客户端。
const assertMysqlConfigured = (fastify) => {
  if (!fastify.mysql || typeof fastify.mysql.query !== 'function') {
    throw new RouteError(503, 'Database is not configured');
  }
};

// 进一步封装消息标准化，统一抛出 RouteError 供上层捕获。
const normalizeMessagesOrThrow = (messages) => {
  try {
    return normalizeMessages(messages);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid messages payload';
    throw new RouteError(400, message);
  }
};

// 查询会话记录，并将底层数据库错误包装为业务可理解的 RouteError。
const fetchConversation = async (fastify, conversationId) => {
  try {
    const conversationRows = await fastify.mysql.query(
      'SELECT id, creator_id, main_agent_id, model, temperature, max_tokens FROM conversation WHERE id = ? LIMIT 1',
      [conversationId]
    );

    if (!Array.isArray(conversationRows) || conversationRows.length === 0) {
      throw new RouteError(404, 'Conversation not found');
    }

    return conversationRows[0];
  } catch (error) {
    if (error instanceof RouteError) {
      throw error;
    }

    fastify.log.error({ err: error, conversationId }, 'Failed to load conversation');
    throw new RouteError(500, 'Failed to load conversation');
  }
};

// 根据主 Agent ID 拉取其信息，并在失败时提供明确错误。
const fetchAgent = async (fastify, agentId) => {
  try {
    const agentRows = await fastify.mysql.query(
      'SELECT id, url FROM agent WHERE id = ? LIMIT 1',
      [agentId]
    );

    if (!Array.isArray(agentRows) || agentRows.length === 0) {
      throw new RouteError(404, 'Main agent not found');
    }

    return agentRows[0];
  } catch (error) {
    if (error instanceof RouteError) {
      throw error;
    }

    fastify.log.error({ err: error, mainAgentId: agentId }, 'Failed to load agent');
    throw new RouteError(500, 'Failed to load agent');
  }
};

// 查找当前会话挂载的联动 Agent，过滤掉无效配置与主 Agent 自身。
const fetchLinkedAgents = async (fastify, conversationId, mainAgentId) => {
  try {
    const linkedRows = await fastify.mysql.query(
      'SELECT ac.agent_id AS agentId, a.name AS name, a.url AS url FROM agent_conversation ac INNER JOIN agent a ON a.id = ac.agent_id WHERE ac.conversation_id = ?',
      [conversationId]
    );

    if (!Array.isArray(linkedRows) || linkedRows.length === 0) {
      return [];
    }

    return linkedRows
      .map((row) => {
        const agentId = Number(row.agentId);
        const url = typeof row.url === 'string' ? row.url.trim() : '';
        const name = typeof row.name === 'string' && row.name.trim().length > 0 ? row.name.trim() : null;
        return { agentId, url, name };
      })
      .filter((entry) => Number.isInteger(entry.agentId) && entry.agentId > 0 && entry.url.length > 0 && entry.agentId !== mainAgentId);
  } catch (error) {
    fastify.log.error({ err: error, conversationId }, 'Failed to load linked agents');
    throw new RouteError(500, 'Failed to load linked agents');
  }
};

// 从数据库中按时间顺序恢复历史消息，作为调用 LLM 时的上下文基底。
const fetchConversationMessages = async (fastify, conversationId) => {
  try {
    const messageRows = await fastify.mysql.query(
      'SELECT role, content, metadata FROM message WHERE conversation_id = ? ORDER BY id ASC',
      [conversationId]
    );

    if (!Array.isArray(messageRows) || messageRows.length === 0) {
      return [];
    }

    const reconstructed = [];

    messageRows.forEach((row, index) => {
      const roleRaw = typeof row.role === 'string' ? row.role.trim() : '';
      const role = roleRaw.toLowerCase();

      if (!ALLOWED_ROLES.has(role)) {
        fastify.log.warn({ conversationId, index, role: row.role }, 'Skip message with unsupported role');
        return;
      }

      const content = typeof row.content === 'string' && row.content.length > 0
        ? row.content
        : ensureStringContent(row.content);

      const baseMessage = {
        role,
        content
      };

      const metadata = parseJsonColumn(row.metadata);

      if (metadata && typeof metadata === 'object') {
        if (role === 'user' && typeof metadata.name === 'string' && metadata.name.trim().length > 0) {
          baseMessage.name = metadata.name.trim();
        }

        if (role === 'tool') {
          if (typeof metadata.tool_call_id === 'string' && metadata.tool_call_id.trim().length > 0) {
            baseMessage.tool_call_id = metadata.tool_call_id.trim();
          }

          if (typeof metadata.name === 'string' && metadata.name.trim().length > 0) {
            baseMessage.name = metadata.name.trim();
          }

          if (!baseMessage.to) {
            baseMessage.to = 'assistant';
          }
        }

        if (role === 'assistant' && Array.isArray(metadata.tool_calls) && metadata.tool_calls.length > 0) {
          const normalizedToolCallList = metadata.tool_calls
            .map((entry, toolIndex) => {
              if (!entry || typeof entry !== 'object') {
                fastify.log.warn(
                  { conversationId, index, toolIndex },
                  'Skip stored tool call without object payload'
                );
                return null;
              }

              const rawFunction = entry.function;
              const toolName = typeof rawFunction?.name === 'string'
                ? rawFunction.name.trim()
                : typeof entry.name === 'string'
                  ? entry.name.trim()
                  : '';

              if (!toolName) {
                fastify.log.warn(
                  { conversationId, index, toolIndex },
                  'Skip stored tool call without name'
                );
                return null;
              }

              let argumentsString = '';
              const rawArguments = rawFunction?.arguments ?? entry.arguments;

              if (typeof rawArguments === 'string') {
                argumentsString = rawArguments.trim();
              } else if (rawArguments && typeof rawArguments === 'object') {
                try {
                  argumentsString = JSON.stringify(rawArguments);
                } catch (_error) {
                  argumentsString = ensureStringContent(rawArguments);
                }
              } else if (rawArguments !== undefined) {
                argumentsString = ensureStringContent(rawArguments);
              }

              if (!argumentsString || argumentsString.length === 0) {
                argumentsString = '{}';
              }

              return {
                id: typeof entry.id === 'string' && entry.id.trim().length > 0 ? entry.id.trim() : undefined,
                type: 'function',
                function: {
                  name: toolName,
                  arguments: argumentsString
                }
              };
            })
            .filter((entry) => entry !== null);

          if (normalizedToolCallList.length > 0) {
            baseMessage.tool_calls = normalizedToolCallList;
          }
        }
      }

      if (role === 'tool' && !baseMessage.tool_call_id) {
        baseMessage.tool_call_id = `stored_call_${conversationId}_${index}`;
      }

      if (role === 'tool' && !baseMessage.to) {
        baseMessage.to = 'assistant';
      }

      reconstructed.push(baseMessage);
    });

    if (reconstructed.length === 0) {
      return [];
    }

    return normalizeMessages(reconstructed);
  } catch (error) {
    fastify.log.error({ err: error, conversationId }, 'Failed to load conversation messages');
    throw new RouteError(500, 'Failed to load conversation messages');
  }
};

// 连接每个联动 Agent，收集其工具列表和连接信息，方便后续调用。
const hydrateLinkedAgents = async (fastify, linkedAgents) => {
  const linkedAgentsResponse = [];
  const aggregationCandidates = [];
  const agentExecutionContexts = new Map();

  for (const linkedAgent of linkedAgents) {
    const linkedClient = new McpClient({ url: linkedAgent.url });
    let linkedConnectionInfo = null;
    let linkedTools = null;
    let errorMessage = null;

    try {
      await linkedClient.connect();
      linkedConnectionInfo = linkedClient.getConnectionInfo();
      const toolsResult = await linkedClient.listTools();
      if (toolsResult && Array.isArray(toolsResult.tools)) {
        linkedTools = toolsResult.tools;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to load tools';
      fastify.log.error({ err: error, agentId: linkedAgent.agentId }, 'Failed to load linked agent tools');
    } finally {
      try {
        await linkedClient.disconnect();
      } catch (_error) {
        // Ignore disconnect failures for linked agents.
      }
    }

    linkedAgentsResponse.push({
      agentId: linkedAgent.agentId,
      name: linkedAgent.name,
      tools: linkedTools,
      connection: linkedConnectionInfo,
      error: errorMessage
    });

    aggregationCandidates.push({
      agentId: linkedAgent.agentId,
      name: linkedAgent.name,
      tools: Array.isArray(linkedTools) ? linkedTools : []
    });

    agentExecutionContexts.set(linkedAgent.agentId, {
      url: linkedAgent.url,
      name: linkedAgent.name
    });
  }

  return { linkedAgentsResponse, aggregationCandidates, agentExecutionContexts };
};

// 将内部生成的消息对象按 CHAT_MESSAGE_SCHEMA 标准化后追加到对话消息列表中。
const appendConversationMessage = (conversationMessages, message) => {
  try {
    const [normalized] = normalizeMessages([message]);
    conversationMessages.push(normalized);
    return normalized;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'message normalization failed';
    throw new RouteError(500, `Failed to append conversation message: ${detail}`);
  }
};

// fastify 插件入口：注册 POST /message/send 路由，负责整体会话编排。
module.exports = async function messageRoute(fastify, opts = {}) {
  const routePath = typeof opts.routePath === 'string' ? opts.routePath : '/message/send';
  const swaggerTags = Array.isArray(opts.swaggerTags) ? opts.swaggerTags : ['messages'];
  const summary = typeof opts.summary === 'string' ? opts.summary : 'Send message with Chat MCP tool';

  fastify.route({
    method: 'POST',
    url: routePath,
    schema: {
      tags: swaggerTags,
      summary,
      description: 'Invoke the MCP chat tool for a conversation using its main agent.',
      body: {
        type: 'object',
        required: ['conversationId', 'userId', 'messages'],
        properties: {
          conversationId: { type: 'integer', minimum: 1 },
          userId: { type: 'integer', minimum: 1 },
          messages: { type: 'array', minItems: 1, items: CHAT_MESSAGE_SCHEMA }
        },
        additionalProperties: false
      },
      response: {
        200: {
          allOf: [
            { $ref: 'ResponseBase#' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    messages: {
                      type: 'array',
                      items: CHAT_MESSAGE_SCHEMA
                    }
                  },
                  required: ['messages'],
                  additionalProperties: false
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        502: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      try {
        const {
          messages,
          conversationId,
          userId
        } = request.body || {};

        // 统一对数值型参数进行正整数校验，错误时抛出 RouteError。
        const routeErrorFactory = (message) => new RouteError(400, message);
        const normalizedConversationId = ensurePositiveInteger(conversationId, 'conversationId', routeErrorFactory);
        const normalizedUserId = ensurePositiveInteger(userId, 'userId', routeErrorFactory);
        const normalizedMessages = normalizeMessagesOrThrow(messages);

        // 数据库能力是后续操作的前提，缺失时直接返回错误。
        assertMysqlConfigured(fastify);

        // 校验会话归属与核心 Agent 配置，确保调用链合法。
        const conversationRow = await fetchConversation(fastify, normalizedConversationId);

        if (Number(conversationRow.creator_id) !== normalizedUserId) {
          throw new RouteError(403, 'User does not own the conversation');
        }

        const mainAgentId = Number(conversationRow.main_agent_id);

        if (!Number.isInteger(mainAgentId) || mainAgentId <= 0) {
          throw new RouteError(400, 'Conversation does not have a main agent configured');
        }
        //获取主会话模型与参数配置
        const agentRow = await fetchAgent(fastify, mainAgentId);
        const agentUrl = typeof agentRow.url === 'string' ? agentRow.url.trim() : '';

        if (agentUrl.length === 0) {
          throw new RouteError(400, 'Main agent is missing an MCP server url');
        }
        //根据会话加载可使用工具的链接
        const linkedAgentServers = await fetchLinkedAgents(fastify, normalizedConversationId, mainAgentId);
        const serverInput = { url: agentUrl };

        let resolvedServerConfig;

        try {
          resolvedServerConfig = resolveServerConfig(serverInput);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid MCP server configuration';
          throw new RouteError(400, message);
        }
        //根据会话表设置对话参数
        const modelFromConversation =
          typeof conversationRow.model === 'string' && conversationRow.model.trim().length > 0
            ? conversationRow.model.trim()
            : null;
        const temperatureFromConversation = toNullableNumber(conversationRow.temperature);
        const maxTokensFromConversation = toNullableNumber(conversationRow.max_tokens);

        const historicalMessages = await fetchConversationMessages(fastify, normalizedConversationId);
        const historicalMessageCount = historicalMessages.length;
        const conversationMessages = historicalMessageCount > 0
          ? [...historicalMessages, ...normalizedMessages]
          : [...normalizedMessages];
        const toolName = DEFAULT_TOOL_NAME;

        // 获取联动 Agent 的工具与上下文信息，供后续工具调用阶段使用。
        const { linkedAgentsResponse, aggregationCandidates, agentExecutionContexts } =
          await hydrateLinkedAgents(fastify, linkedAgentServers);

        const { definitions: aggregatedTools, map: toolDefinitionMap } = buildToolsForLlm(aggregationCandidates);

        // 构建调用主聊天工具所需的基础参数，包含模型、温度等可选项。
        const toolArgumentsBase = {};

        if (modelFromConversation) {
          toolArgumentsBase.model = modelFromConversation;
        }

        if (typeof temperatureFromConversation === 'number') {
          toolArgumentsBase.temperature = temperatureFromConversation;
        }

        if (typeof maxTokensFromConversation === 'number') {
          toolArgumentsBase.maxTokens = maxTokensFromConversation;
        }

        if (aggregatedTools.length > 0) {
          toolArgumentsBase.tools = aggregatedTools;
          toolArgumentsBase.toolChoice = 'auto';
        }

        const client = new McpClient(resolvedServerConfig);
        let connectionInfo = null;
        const toolCallResponses = [];
        let finalReplyText = '';
        let finalReplyContent = [];
        let finalReplyMetadata = null;
        let finalToolResult = null;

        try {
          await client.connect();

          for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
            // 组合当前消息上下文，调用主聊天工具。
            const callArguments = {
              ...toolArgumentsBase,
              messages: conversationMessages
            };
            //调用chat MCP工具
            // console.log(JSON.stringify(callArguments, null, 2));
            // console.log('call chat tool with arguments');
            const toolResult = await client.callTool({ name: toolName, arguments: callArguments });
            finalToolResult = toolResult;
            connectionInfo = client.getConnectionInfo();

            // 提取助手文本与潜在的工具调用请求，优先使用 metadata 中的结构化数据。
            const contentParts = Array.isArray(toolResult?.content) ? toolResult.content : [];
            const assistantText = extractTextContent({ content: contentParts });
            const metadataToolCallList = Array.isArray(toolResult?.metadata?.tool_calls)
              ? toolResult.metadata.tool_calls.filter((entry) => entry && typeof entry === 'object')
              : [];
            const fallbackContentToolCallList = metadataToolCallList.length === 0
              ? contentParts.filter((part) => part && part.type === 'tool-call')
              : [];
            const toolCallEntries = metadataToolCallList.length > 0 ? metadataToolCallList : fallbackContentToolCallList;

            const assistantMessage = {
              role: 'assistant',
              content: assistantText && assistantText.trim().length > 0 ? assistantText : '[tool-call]'
            };

            const pendingCalls = [];

            if (toolCallEntries.length > 0) {
              const toolCallListForMessage = [];

              toolCallEntries.forEach((callEntry, callIndex) => {
                // LLM 返回的工具名称可能存在多种嵌套字段，需逐一兼容。
                const resolvedName = (() => {
                  if (callEntry && typeof callEntry.name === 'string' && callEntry.name.trim().length > 0) {
                    return callEntry.name.trim();
                  }
                  if (callEntry && callEntry.tool && typeof callEntry.tool.name === 'string') {
                    return callEntry.tool.name.trim();
                  }
                  if (callEntry && callEntry.function && typeof callEntry.function.name === 'string') {
                    return callEntry.function.name.trim();
                  }
                  return null;
                })();

                if (!resolvedName) {
                  toolCallResponses.push({
                    id: callEntry?.id ?? null,
                    name: null,
                    agentId: null,
                    agentName: null,
                    arguments: null,
                    argumentsString: null,
                    error: 'Tool call is missing a name'
                  });
                  return;
                }

                const callId =
                  typeof callEntry?.id === 'string' && callEntry.id.trim().length > 0
                    ? callEntry.id.trim()
                    : `call_${iteration}_${callIndex}_${Date.now()}`;

                const toolInfo = toolDefinitionMap.get(resolvedName);
                const executionContext = toolInfo ? agentExecutionContexts.get(toolInfo.agentId) : null;

                const rawArgumentsString =
                  (typeof callEntry?.arguments === 'string' && callEntry.arguments.trim().length > 0
                    ? callEntry.arguments
                    : null) ||
                  (callEntry?.tool && typeof callEntry.tool.arguments === 'string' && callEntry.tool.arguments.trim().length > 0
                    ? callEntry.tool.arguments
                    : null) ||
                  (callEntry?.function && typeof callEntry.function.arguments === 'string' && callEntry.function.arguments.trim().length > 0
                    ? callEntry.function.arguments
                    : null) ||
                  null;

                let parsedArguments = {};
                let parseError = null;

                if (rawArgumentsString) {
                  try {
                    const parsed = JSON.parse(rawArgumentsString);
                    parsedArguments = parsed === null ? {} : parsed;
                  } catch (error) {
                    parseError = error instanceof Error ? error.message : 'invalid JSON';
                  }
                } else if (callEntry && typeof callEntry.arguments === 'object' && callEntry.arguments !== null) {
                  parsedArguments = callEntry.arguments;
                } else if (callEntry?.tool && typeof callEntry.tool.arguments === 'object' && callEntry.tool.arguments !== null) {
                  parsedArguments = callEntry.tool.arguments;
                } else if (callEntry?.function && typeof callEntry.function.arguments === 'object' && callEntry.function.arguments !== null) {
                  parsedArguments = callEntry.function.arguments;
                }

                let argumentsString = rawArgumentsString
                  ? rawArgumentsString
                  : ensureStringContent(parsedArguments);

                if (parseError) {
                  argumentsString = '{}';
                }

                toolCallListForMessage.push({
                  id: callId,
                  type: 'function',
                  function: {
                    name: resolvedName,
                    arguments: argumentsString.trim().length > 0 ? argumentsString : '{}'
                  }
                });

                pendingCalls.push({
                  callId,
                  resolvedName,
                  toolInfo,
                  executionContext,
                  parsedArguments,
                  parseError,
                  argumentsString,
                  rawArgumentsString
                });
              });

              if (toolCallListForMessage.length > 0) {
                assistantMessage.tool_calls = toolCallListForMessage;
              }
            }

            appendConversationMessage(conversationMessages, assistantMessage);

            if (toolCallEntries.length === 0 || pendingCalls.length === 0) {
              finalReplyText = assistantText;
              finalReplyContent = contentParts;
              finalReplyMetadata = toolResult?.metadata ?? null;
              break;
            }

            for (const pendingCall of pendingCalls) {
              const {
                callId,
                resolvedName,
                toolInfo,
                executionContext,
                parsedArguments,
                parseError,
                argumentsString,
                rawArgumentsString
              } = pendingCall;

              if (parseError) {
                // 参数解析失败时直接返回错误给 LLM，避免错误数据被透传。
                const errorMessage = `Failed to parse tool arguments: ${parseError}`;
                toolCallResponses.push({
                  id: callId,
                  name: resolvedName,
                  agentId: toolInfo?.agentId ?? null,
                  agentName: toolInfo?.agentName ?? null,
                  arguments: null,
                  argumentsString: rawArgumentsString ?? argumentsString,
                  error: errorMessage
                });

                appendConversationMessage(conversationMessages, {
                  role: 'tool',
                  name: resolvedName ?? undefined,
                  tool_call_id: callId,
                  content: ensureStringContent({ error: errorMessage }),
                  to: 'assistant'
                });
                continue;
              }

              if (!toolInfo) {
                // 工具名称无法匹配时提示未知工具，提醒前端或 LLM 做兼容。
                const errorMessage = `Unknown tool requested: ${resolvedName}`;
                toolCallResponses.push({
                  id: callId,
                  name: resolvedName,
                  agentId: null,
                  agentName: null,
                  arguments: parsedArguments,
                  argumentsString,
                  error: errorMessage
                });

                appendConversationMessage(conversationMessages, {
                  role: 'tool',
                  name: resolvedName,
                  tool_call_id: callId,
                  content: ensureStringContent({ error: errorMessage }),
                  to: 'assistant'
                });
                continue;
              }

              if (!executionContext || !executionContext.url) {
                // Agent 连接信息缺失时无法继续调用，返回错误反馈。
                const errorMessage = 'Agent execution context is unavailable';
                toolCallResponses.push({
                  id: callId,
                  name: resolvedName,
                  agentId: toolInfo.agentId,
                  agentName: toolInfo.agentName,
                  arguments: parsedArguments,
                  argumentsString,
                  error: errorMessage
                });

                appendConversationMessage(conversationMessages, {
                  role: 'tool',
                  name: resolvedName,
                  tool_call_id: callId,
                  content: ensureStringContent({ error: errorMessage }),
                  to: 'assistant'
                });
                continue;
              }

              const targetToolName =
                toolInfo.originalTool && typeof toolInfo.originalTool.name === 'string' && toolInfo.originalTool.name.trim().length > 0
                  ? toolInfo.originalTool.name.trim()
                  : toolInfo.originalName;

              if (!targetToolName) {
                // 原始工具名为空说明数据异常，直接终止该次调用。
                const errorMessage = 'Target tool name is not available';
                toolCallResponses.push({
                  id: callId,
                  name: resolvedName,
                  agentId: toolInfo.agentId,
                  agentName: toolInfo.agentName,
                  arguments: parsedArguments,
                  argumentsString,
                  error: errorMessage
                });

                appendConversationMessage(conversationMessages, {
                  role: 'tool',
                  name: resolvedName,
                  tool_call_id: callId,
                  content: ensureStringContent({ error: errorMessage }),
                  to: 'assistant'
                });
                continue;
              }

              const agentClient = new McpClient({ url: executionContext.url });
              let toolResponse = null;
              let toolError = null;

              try {
                // 针对单个工具调用临时建立连接，完成后及时断开，避免资源泄漏。
                await agentClient.connect();
                toolResponse = await agentClient.callTool({
                  name: targetToolName,
                  arguments: parsedArguments
                });
              } catch (agentError) {
                toolError = agentError instanceof Error ? agentError.message : 'Tool invocation failed';
                fastify.log.error(
                  { err: agentError, agentId: toolInfo.agentId, toolName: toolInfo.originalName },
                  'Linked agent tool invocation failed'
                );
              } finally {
                try {
                  await agentClient.disconnect();
                } catch (_error) {
                  // Ignore disconnect errors for linked agents.
                }
              }

              const toolResponseContentText = toolResponse ? extractTextContent(toolResponse) : '';
              const toolMessageContent = toolError
                ? ensureStringContent({ error: toolError })
                : toolResponseContentText && toolResponseContentText.trim().length > 0
                  ? toolResponseContentText
                  : ensureStringContent(toolResponse);

              appendConversationMessage(conversationMessages, {
                role: 'tool',
                name: resolvedName,
                tool_call_id: callId,
                content: toolMessageContent,
                to: 'assistant'
              });

              toolCallResponses.push({
                id: callId,
                name: resolvedName,
                agentId: toolInfo.agentId,
                agentName: toolInfo.agentName,
                originalTool: targetToolName,
                arguments: parsedArguments,
                argumentsString,
                response: toolResponse,
                error: toolError
              });
            }

            // Continue loop to allow assistant to observe tool responses.
          }

          if (finalReplyContent.length === 0 && finalToolResult) {
            // 若循环提前结束但未生成内容，使用最后一次工具结果作为最终回复。
            finalReplyText = extractTextContent(finalToolResult);
            finalReplyContent = Array.isArray(finalToolResult?.content) ? finalToolResult.content : [];
            finalReplyMetadata = finalToolResult?.metadata ?? null;
          }

          // 组织返回给客户端的主体数据，包括工具调用详情。
          const payload = { messages: conversationMessages };

          const newMessageOffset = historicalMessageCount;
          const newMessages = newMessageOffset > 0
            ? conversationMessages.slice(newMessageOffset)
            : [...conversationMessages];

          const toolCallResponseMap = new Map();
          for (const call of toolCallResponses) {
            if (call && typeof call === 'object' && call.id) {
              toolCallResponseMap.set(call.id, call);
            }
          }

          const messagesToPersist = [];

          newMessages.forEach((message, index) => {
            if (!message || typeof message !== 'object') {
              return;
            }

            const role = message.role;
            let metadataPayload = null;
            let resolvedContent = message.content;

            if (role === 'user') {
              const userMetadata = {};
              if (typeof message.name === 'string' && message.name.length > 0) {
                userMetadata.name = message.name;
              }
              if (typeof message.to === 'string' && message.to.length > 0) {
                userMetadata.to = message.to;
              }
              metadataPayload = Object.keys(userMetadata).length > 0 ? userMetadata : null;
            } else if (role === 'assistant') {
              const assistantMetadata = {};
              const isFinalAssistantMessage = index === newMessages.length - 1;

              if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
                const sanitizedToolCalls = message.tool_calls
                  .map((call, callIndex) => {
                    if (!call || typeof call !== 'object') {
                      fastify.log.warn({ callIndex }, 'Skip assistant tool call without object payload');
                      return null;
                    }

                    const rawFunction = call.function;
                    const functionName = typeof rawFunction?.name === 'string' ? rawFunction.name.trim() : '';

                    if (!functionName) {
                      fastify.log.warn({ callIndex }, 'Skip assistant tool call without function name');
                      return null;
                    }

                    let argumentsString = '{}';
                    const rawArguments = rawFunction?.arguments;

                    if (typeof rawArguments === 'string' && rawArguments.trim().length > 0) {
                      argumentsString = rawArguments.trim();
                    } else if (rawArguments && typeof rawArguments === 'object') {
                      try {
                        argumentsString = JSON.stringify(rawArguments);
                      } catch (_error) {
                        argumentsString = ensureStringContent(rawArguments);
                      }
                    } else if (rawArguments !== undefined) {
                      argumentsString = ensureStringContent(rawArguments);
                    }

                    return {
                      id: typeof call.id === 'string' && call.id.trim().length > 0 ? call.id.trim() : undefined,
                      type: 'function',
                      function: {
                        name: functionName,
                        arguments: argumentsString
                      }
                    };
                  })
                  .filter((entry) => entry !== null);

                if (sanitizedToolCalls.length > 0) {
                  assistantMetadata.tool_calls = sanitizedToolCalls;
                }
              }

              if (isFinalAssistantMessage) {
                if (typeof finalReplyText === 'string' && finalReplyText.trim().length > 0) {
                  resolvedContent = finalReplyText;
                }

                if (toolCallResponses.length > 0) {
                  assistantMetadata.tool_call_results = toolCallResponses.map((call) => ({
                    id: call.id,
                    name: call.name,
                    agentId: call.agentId,
                    agentName: call.agentName,
                    originalTool: call.originalTool,
                    arguments: call.argumentsString ?? (call.arguments ? ensureStringContent(call.arguments) : null),
                    error: call.error === undefined ? null : call.error
                  }));
                }

                if (finalReplyMetadata !== null && finalReplyMetadata !== undefined) {
                  assistantMetadata.metadata = finalReplyMetadata;
                }
              }

              if (typeof message.name === 'string' && message.name.length > 0) {
                assistantMetadata.name = message.name;
              }

              if (typeof message.to === 'string' && message.to.length > 0) {
                assistantMetadata.to = message.to;
              }

              metadataPayload = Object.keys(assistantMetadata).length > 0 ? assistantMetadata : null;
            } else if (role === 'tool') {
              const toolMetadata = {
                tool_call_id: message.tool_call_id,
                name: message.name,
                to: typeof message.to === 'string' && message.to.length > 0 ? message.to : 'assistant',
                error: null
              };

              const callInfo = typeof message.tool_call_id === 'string' ? toolCallResponseMap.get(message.tool_call_id) : null;

              if (callInfo) {
                const { agentId, agentName, originalTool, argumentsString, error } = callInfo;
                if (agentId !== undefined) {
                  toolMetadata.agentId = agentId;
                }
                if (agentName !== undefined) {
                  toolMetadata.agentName = agentName;
                }
                if (originalTool !== undefined) {
                  toolMetadata.originalTool = originalTool;
                }
                if (argumentsString !== undefined) {
                  toolMetadata.arguments = argumentsString;
                }
                toolMetadata.error = error === undefined ? null : error;
              }

              metadataPayload = toolMetadata;
            } else {
              const genericMetadata = {};
              if (typeof message.name === 'string' && message.name.length > 0) {
                genericMetadata.name = message.name;
              }
              if (typeof message.to === 'string' && message.to.length > 0) {
                genericMetadata.to = message.to;
              }
              metadataPayload = Object.keys(genericMetadata).length > 0 ? genericMetadata : null;
            }

            messagesToPersist.push({
              role,
              content: resolvedContent,
              metadata: serializeMetadata(metadataPayload)
            });
          });

          if (messagesToPersist.length > 0) {
            try {
              for (const entry of messagesToPersist) {
                await fastify.mysql.query(
                  'INSERT INTO message (conversation_id, role, content, type, metadata) VALUES (?, ?, ?, ?, ?)',
                  [
                    normalizedConversationId,
                    entry.role,
                    entry.content,
                    'text',
                    entry.metadata
                  ]
                );
              }
            } catch (persistError) {
              fastify.log.error(
                { err: persistError, conversationId: normalizedConversationId },
                'Failed to persist conversation messages'
              );
            }
          }

          return reply.sendSuccess(payload);
        } catch (error) {
          fastify.log.error({ err: error, toolName, server: resolvedServerConfig.url }, 'Deepseek MCP call failed');
          const message = error instanceof Error ? error.message : 'Failed to invoke Deepseek MCP tool';
          return reply.sendError(message, 502);
        } finally {
          try {
            await client.disconnect();
          } catch (_error) {
            // Ignore disconnect failures.
          }
        }
      } catch (error) {
        if (error instanceof RouteError) {
          return reply.sendError(error.message, error.statusCode);
        }

        fastify.log.error({ err: error }, 'Unexpected failure in message route');
        return reply.sendError('Failed to process request', 500);
      }
    }
  });
};
