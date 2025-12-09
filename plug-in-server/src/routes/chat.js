const { McpClient } = require('../mcp/client');
const { loadConfig } = require('../config');

const DEFAULT_TOOL_NAME = 'chat';
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant', 'tool']);
const MAX_TOOL_ITERATIONS = 6;

const CHAT_MESSAGE_SCHEMA = {
  type: 'object',
  required: ['role', 'content'],
  properties: {
    role: { type: 'string', enum: ['system', 'user', 'assistant', 'tool'] },
    content: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    toolCallId: { type: 'string', minLength: 1 },
    toolCalls: {
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

    const { role, content, name, toolCallId, toolCalls } = message;

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

    if (toolCalls !== undefined) {
      if (role !== 'assistant') {
        throw new Error(`messages[${index}].toolCalls is only allowed on assistant messages`);
      }

      if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
        throw new Error(`messages[${index}].toolCalls must be a non-empty array when provided`);
      }

      const normalizedToolCalls = toolCalls.map((call, callIndex) => {
        if (!call || typeof call !== 'object') {
          throw new Error(`messages[${index}].toolCalls[${callIndex}] must be an object`);
        }

        const { id, type, function: callFunction } = call;

        if (id !== undefined) {
          if (typeof id !== 'string' || id.trim().length === 0) {
            throw new Error(`messages[${index}].toolCalls[${callIndex}].id must be a non-empty string when provided`);
          }
        }

        if (type !== 'function') {
          throw new Error(`messages[${index}].toolCalls[${callIndex}].type must be "function"`);
        }

        if (!callFunction || typeof callFunction !== 'object') {
          throw new Error(`messages[${index}].toolCalls[${callIndex}].function must be an object`);
        }

        const { name: functionName, arguments: functionArguments } = callFunction;

        if (typeof functionName !== 'string' || functionName.trim().length === 0) {
          throw new Error(`messages[${index}].toolCalls[${callIndex}].function.name must be a non-empty string`);
        }

        if (typeof functionArguments !== 'string' || functionArguments.trim().length === 0) {
          throw new Error(`messages[${index}].toolCalls[${callIndex}].function.arguments must be a non-empty JSON string`);
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

      entry.toolCalls = normalizedToolCalls;
    }

    return entry;
  });
};

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

const extractTextContent = (toolResult) => {
  if (!toolResult || !Array.isArray(toolResult.content)) {
    return '';
  }

  return toolResult.content
    .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
};

const serializeMetadata = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return null;
  }
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
                    connection: { type: ['object', 'null'] },
                    linkedAgents: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          agentId: { type: 'integer' },
                          name: { type: ['string', 'null'] },
                          tools: { type: ['array', 'null'], items: {} },
                          connection: { type: ['object', 'null'] },
                          error: { type: ['string', 'null'] }
                        },
                        required: ['agentId'],
                        additionalProperties: false
                      }
                    },
                    toolCalls: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: ['string', 'null'] },
                          name: { type: ['string', 'null'] },
                          agentId: { type: ['integer', 'null'] },
                          agentName: { type: ['string', 'null'] },
                          originalTool: { type: ['string', 'null'] },
                          arguments: {},
                          response: {},
                          error: { type: ['string', 'null'] }
                        },
                        additionalProperties: false
                      }
                    }
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

      let linkedAgentServers = [];

      try {
        const linkedRows = await fastify.mysql.query(
          'SELECT ac.agent_id AS agentId, a.name AS name, a.url AS url FROM agent_conversation ac INNER JOIN agent a ON a.id = ac.agent_id WHERE ac.conversation_id = ?',
          [normalizedConversationId]
        );

        if (Array.isArray(linkedRows) && linkedRows.length > 0) {
          linkedAgentServers = linkedRows
            .map((row) => {
              const agentId = Number(row.agentId);
              const url = typeof row.url === 'string' ? row.url.trim() : '';
              const name = typeof row.name === 'string' && row.name.trim().length > 0 ? row.name.trim() : null;
              return { agentId, url, name };
            })
            .filter((entry) => Number.isInteger(entry.agentId) && entry.agentId > 0 && entry.url.length > 0 && entry.agentId !== mainAgentId);
        }
      } catch (error) {
        fastify.log.error({ err: error, conversationId: normalizedConversationId }, 'Failed to load linked agents');
        return reply.sendError('Failed to load linked agents', 500);
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

      const conversationMessages = [...normalizedMessages];
      const toolName = DEFAULT_TOOL_NAME;

      const client = new McpClient(resolvedServerConfig);
      const linkedAgentsResponse = [];
      const aggregationCandidates = [];
      const agentExecutionContexts = new Map();

      for (const linkedAgent of linkedAgentServers) {
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

      const { definitions: aggregatedTools, map: toolDefinitionMap } = buildToolsForLlm(aggregationCandidates);

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

      let connectionInfo = null;
      const toolCallResponses = [];
      let finalReplyText = '';
      let finalReplyContent = [];
      let finalReplyMetadata = null;
      let finalToolResult = null;

      const ensureStringContent = (value) => {
        if (typeof value === 'string' && value.trim().length > 0) {
          return value;
        }

        try {
          return JSON.stringify(value ?? {});
        } catch (_error) {
          return '{}';
        }
      };

      try {
        await client.connect();

        for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
          const callArguments = {
            ...toolArgumentsBase,
            messages: conversationMessages
          };

          const toolResult = await client.callTool({ name: toolName, arguments: callArguments });
          finalToolResult = toolResult;
          connectionInfo = client.getConnectionInfo();

          const contentParts = Array.isArray(toolResult?.content) ? toolResult.content : [];
          const assistantText = extractTextContent({ content: contentParts });
          const metadataToolCalls = Array.isArray(toolResult?.metadata?.toolCalls)
            ? toolResult.metadata.toolCalls.filter((entry) => entry && typeof entry === 'object')
            : [];
          const fallbackContentToolCalls = metadataToolCalls.length === 0
            ? contentParts.filter((part) => part && part.type === 'tool-call')
            : [];
          const toolCallEntries = metadataToolCalls.length > 0 ? metadataToolCalls : fallbackContentToolCalls;

          const assistantMessage = {
            role: 'assistant',
            content: assistantText && assistantText.trim().length > 0 ? assistantText : '[tool-call]'
          };

          const pendingCalls = [];

          if (toolCallEntries.length > 0) {
            const toolCallsForMessage = [];

            toolCallEntries.forEach((callEntry, callIndex) => {
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

              toolCallsForMessage.push({
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

            if (toolCallsForMessage.length > 0) {
              assistantMessage.toolCalls = toolCallsForMessage;
            }
          }

          conversationMessages.push(assistantMessage);

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
              const errorMessage = `Failed to parse tool arguments: ${parseError}`;
              toolCallResponses.push({
                id: callId,
                name: resolvedName,
                agentId: toolInfo?.agentId ?? null,
                agentName: toolInfo?.agentName ?? null,
                arguments: rawArgumentsString ?? argumentsString,
                error: errorMessage
              });

              conversationMessages.push({
                role: 'tool',
                toolCallId: callId,
                content: ensureStringContent({ error: errorMessage })
              });
              continue;
            }

            if (!toolInfo) {
              const errorMessage = `Unknown tool requested: ${resolvedName}`;
              toolCallResponses.push({
                id: callId,
                name: resolvedName,
                agentId: null,
                agentName: null,
                arguments: argumentsString,
                error: errorMessage
              });

              conversationMessages.push({
                role: 'tool',
                toolCallId: callId,
                content: ensureStringContent({ error: errorMessage })
              });
              continue;
            }

            if (!executionContext || !executionContext.url) {
              const errorMessage = 'Agent execution context is unavailable';
              toolCallResponses.push({
                id: callId,
                name: resolvedName,
                agentId: toolInfo.agentId,
                agentName: toolInfo.agentName,
                arguments: argumentsString,
                error: errorMessage
              });

              conversationMessages.push({
                role: 'tool',
                toolCallId: callId,
                content: ensureStringContent({ error: errorMessage })
              });
              continue;
            }

            const targetToolName =
              toolInfo.originalTool && typeof toolInfo.originalTool.name === 'string' && toolInfo.originalTool.name.trim().length > 0
                ? toolInfo.originalTool.name.trim()
                : toolInfo.originalName;

            if (!targetToolName) {
              const errorMessage = 'Target tool name is not available';
              toolCallResponses.push({
                id: callId,
                name: resolvedName,
                agentId: toolInfo.agentId,
                agentName: toolInfo.agentName,
                arguments: argumentsString,
                error: errorMessage
              });

              conversationMessages.push({
                role: 'tool',
                toolCallId: callId,
                content: ensureStringContent({ error: errorMessage })
              });
              continue;
            }

            const agentClient = new McpClient({ url: executionContext.url });
            let toolResponse = null;
            let toolError = null;

            try {
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

            conversationMessages.push({
              role: 'tool',
              toolCallId: callId,
              content: toolMessageContent
            });

            toolCallResponses.push({
              id: callId,
              name: resolvedName,
              agentId: toolInfo.agentId,
              agentName: toolInfo.agentName,
              originalTool: targetToolName,
              arguments: parsedArguments,
              response: toolResponse,
              error: toolError
            });
          }

          // Continue loop to allow assistant to observe tool responses.
        }

        if (finalReplyContent.length === 0 && finalToolResult) {
          finalReplyText = extractTextContent(finalToolResult);
          finalReplyContent = Array.isArray(finalToolResult?.content) ? finalToolResult.content : [];
          finalReplyMetadata = finalToolResult?.metadata ?? null;
        }

        const payload = {
          toolName,
          reply: {
            text: finalReplyText,
            content: finalReplyContent,
            metadata: finalReplyMetadata
          },
          connection: connectionInfo,
          linkedAgents: linkedAgentsResponse
        };

        if (toolCallResponses.length > 0) {
          payload.toolCalls = toolCallResponses;
        }

        const messagesToPersist = [];

        const lastUserMessageIndex = (() => {
          for (let index = normalizedMessages.length - 1; index >= 0; index -= 1) {
            if (normalizedMessages[index] && normalizedMessages[index].role === 'user') {
              return index;
            }
          }
          return -1;
        })();

        if (lastUserMessageIndex !== -1) {
          const message = normalizedMessages[lastUserMessageIndex];
          const userMetadata = message.name ? { name: message.name } : null;
          messagesToPersist.push({
            role: 'user',
            content: message.content,
            metadata: serializeMetadata(userMetadata)
          });
        }

        const assistantMetadata = {};

        if (toolCallResponses.length > 0) {
          assistantMetadata.toolCalls = toolCallResponses.map((call) => ({
            id: call.id,
            name: call.name,
            agentId: call.agentId,
            agentName: call.agentName,
            originalTool: call.originalTool,
            error: call.error === undefined ? null : call.error
          }));
        }

        if (finalReplyMetadata !== null && finalReplyMetadata !== undefined) {
          assistantMetadata.metadata = finalReplyMetadata;
        }

        messagesToPersist.push({
          role: 'assistant',
          content: finalReplyText ?? '',
          metadata: serializeMetadata(Object.keys(assistantMetadata).length > 0 ? assistantMetadata : null)
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
    }
  });
};
