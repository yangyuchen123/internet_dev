const { McpClient } = require('../mcp/client');
const { loadConfig } = require('../config');

const DEFAULT_TOOL_NAME = 'chat';
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant', 'tool']);

const CHAT_MESSAGE_SCHEMA = {
  type: 'object',
  required: ['role', 'content'],
  properties: {
    role: { type: 'string', enum: ['system', 'user', 'assistant', 'tool'] },
    content: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    toolCallId: { type: 'string', minLength: 1 }
  },
  additionalProperties: false
};

const toNullableNumber = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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

const normalizeMessages = (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must contain at least one entry');
  }

  return messages.map((message, index) => {
    if (!message || typeof message !== 'object') {
      throw new Error(`messages[${index}] must be an object`);
    }

    const { role, content, name, toolCallId } = message;

    if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) {
      throw new Error(`messages[${index}].role must be one of system, user, assistant, tool`);
    }

    if (typeof content !== 'string' || content.length === 0) {
      throw new Error(`messages[${index}].content must be a non-empty string`);
    }

    const entry = { role, content };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new Error(`messages[${index}].name must be a non-empty string when provided`);
      }
      entry.name = name.trim();
    }

    if (toolCallId !== undefined) {
      if (typeof toolCallId !== 'string' || toolCallId.trim().length === 0) {
        throw new Error(`messages[${index}].toolCallId must be a non-empty string when provided`);
      }
      entry.toolCallId = toolCallId.trim();
    } else if (role === 'tool') {
      throw new Error(`messages[${index}].toolCallId is required when role is "tool"`);
    }

    return entry;
  });
};

const extractTextContent = (toolResult) => {
  if (!toolResult || !Array.isArray(toolResult.content)) {
    return '';
  }

  return toolResult.content
    .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
};

module.exports = async function messageRoute(fastify, opts = {}) {
  const routePath = typeof opts.routePath === 'string' ? opts.routePath : '/message/send';
  const swaggerTags = Array.isArray(opts.swaggerTags) ? opts.swaggerTags : ['messages'];
  const summary = typeof opts.summary === 'string' ? opts.summary : 'Send message with Deepseek MCP tool';

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
          messages: { type: 'array', minItems: 1, items: CHAT_MESSAGE_SCHEMA },
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
                    toolName: { type: 'string' },
                    reply: {
                      type: 'object',
                      properties: {
                        text: { type: 'string' },
                        content: { type: 'array', items: {} },
                        metadata: {}
                      },
                      required: ['text'],
                      additionalProperties: true
                    },
                    connection: { type: ['object', 'null'] }
                  },
                  required: ['toolName', 'reply']
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
      const {
        messages,
        conversationId,
        userId
      } = request.body || {};

      if (conversationId === undefined || conversationId === null) {
        return reply.sendError('conversationId is required', 400);
      }

      const normalizedConversationId = Number(conversationId);

      if (!Number.isInteger(normalizedConversationId) || normalizedConversationId <= 0) {
        return reply.sendError('conversationId must be a positive integer', 400);
      }

      const normalizedUserId = Number(userId);

      if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
        return reply.sendError('userId must be a positive integer', 400);
      }

      let normalizedMessages;

      try {
        normalizedMessages = normalizeMessages(messages);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid messages payload';
        return reply.sendError(message, 400);
      }

      if (!fastify.mysql || typeof fastify.mysql.query !== 'function') {
        return reply.sendError('Database is not configured', 503);
      }

      let conversationRow;

      try {
        const conversationRows = await fastify.mysql.query(
          'SELECT id, creator_id, main_agent_id, model, temperature, max_tokens FROM conversation WHERE id = ? LIMIT 1',
          [normalizedConversationId]
        );

        if (!Array.isArray(conversationRows) || conversationRows.length === 0) {
          return reply.sendError('Conversation not found', 404);
        }

        conversationRow = conversationRows[0];
      } catch (error) {
        fastify.log.error({ err: error, conversationId: normalizedConversationId }, 'Failed to load conversation');
        return reply.sendError('Failed to load conversation', 500);
      }

      if (Number(conversationRow.creator_id) !== normalizedUserId) {
        return reply.sendError('User does not own the conversation', 403);
      }

      const mainAgentId = Number(conversationRow.main_agent_id);

      if (!Number.isInteger(mainAgentId) || mainAgentId <= 0) {
        return reply.sendError('Conversation does not have a main agent configured', 400);
      }

      let agentRow;

      try {
        const agentRows = await fastify.mysql.query(
          'SELECT id, url FROM agent WHERE id = ? LIMIT 1',
          [mainAgentId]
        );

        if (!Array.isArray(agentRows) || agentRows.length === 0) {
          return reply.sendError('Main agent not found', 404);
        }

        agentRow = agentRows[0];
      } catch (error) {
        fastify.log.error({ err: error, mainAgentId }, 'Failed to load agent');
        return reply.sendError('Failed to load agent', 500);
      }

      const agentUrl = typeof agentRow.url === 'string' ? agentRow.url.trim() : '';

      if (agentUrl.length === 0) {
        return reply.sendError('Main agent is missing an MCP server url', 400);
      }

      const serverInput = { url: agentUrl };
      let resolvedServerConfig;

      try {
        resolvedServerConfig = resolveServerConfig(serverInput);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid MCP server configuration';
        return reply.sendError(message, 400);
      }

      const modelFromConversation =
        typeof conversationRow.model === 'string' && conversationRow.model.trim().length > 0
          ? conversationRow.model.trim()
          : null;
      const temperatureFromConversation = toNullableNumber(conversationRow.temperature);
      const maxTokensFromConversation = toNullableNumber(conversationRow.max_tokens);

      const toolName = DEFAULT_TOOL_NAME;
      const toolArguments = { messages: normalizedMessages };

      if (modelFromConversation) {
        toolArguments.model = modelFromConversation;
      }

      if (typeof temperatureFromConversation === 'number') {
        toolArguments.temperature = temperatureFromConversation;
      }

      if (typeof maxTokensFromConversation === 'number') {
        toolArguments.maxTokens = maxTokensFromConversation;
      }

      const client = new McpClient(resolvedServerConfig);
      let connectionInfo = null;

      try {
        await client.connect();
        const toolResult = await client.callTool({ name: toolName, arguments: toolArguments });
        connectionInfo = client.getConnectionInfo();

        const payload = {
          toolName,
          reply: {
            text: extractTextContent(toolResult),
            content: Array.isArray(toolResult?.content) ? toolResult.content : [],
            metadata: toolResult?.metadata ?? null
          },
          connection: connectionInfo
        };

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
    }
  });
};
