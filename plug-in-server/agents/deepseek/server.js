const fastifyFactory = require('fastify');
const path = require('path');
const { randomUUID } = require('node:crypto');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { OpenAI } = require('openai');
const { z } = require('zod');

const FOUR_MB = 4 * 1024 * 1024;
const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = 'deepseek-chat';
const MCP_ROUTE = '/mcp';
const PACKAGE_JSON_PATH = path.join(__dirname, '..', '..', 'package.json');
const DEFAULT_PROVIDER_CONFIG = Object.freeze({
  apiKeyEnv: 'DEEPSEEK_API_KEY',
  apiKey: null,
  baseURL: DEFAULT_BASE_URL,
  defaultModel: DEFAULT_MODEL,
  availableModels: [DEFAULT_MODEL]
});

const resolvePackageInfo = () => {
  try {
    const pkg = require(PACKAGE_JSON_PATH);
    const name = typeof pkg.name === 'string' && pkg.name.trim().length > 0 ? `${pkg.name}-deepseek-mcp-server` : 'deepseek-mcp-server';
    const version = typeof pkg.version === 'string' && pkg.version.trim().length > 0 ? pkg.version : '0.1.0';
    return { name, version };
  } catch (error) {
    return { name: 'deepseek-mcp-server', version: '0.1.0' };
  }
};

const SERVER_INFO = resolvePackageInfo();

const loadProviderConfig = () => ({
  ...DEFAULT_PROVIDER_CONFIG,
  availableModels: [...DEFAULT_PROVIDER_CONFIG.availableModels]
});

const resolveApiKey = (providerConfig) => {
  if (providerConfig.apiKey) {
    return providerConfig.apiKey;
  }

  const candidateKeys = [];

  if (providerConfig.apiKeyEnv) {
    candidateKeys.push(providerConfig.apiKeyEnv);
  }

  candidateKeys.push('DEEPSEEK_API_KEY');

  for (const key of candidateKeys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const buildDeepseekClientContext = (providerConfig, log) => {
  const apiKey = resolveApiKey(providerConfig);

  if (!apiKey) {
    log.warn({ apiKeyEnv: providerConfig.apiKeyEnv }, 'Deepseek API key is not configured; tool execution will return errors');
  }

  const baseURL = typeof process.env.DEEPSEEK_API_BASE_URL === 'string' && process.env.DEEPSEEK_API_BASE_URL.trim().length > 0
    ? process.env.DEEPSEEK_API_BASE_URL.trim()
    : providerConfig.baseURL;

  const client = apiKey
    ? new OpenAI({
        apiKey,
        baseURL
      })
    : null;

  return {
    client,
    apiKeyEnv: providerConfig.apiKeyEnv,
    baseURL,
    defaultModel: providerConfig.defaultModel,
    availableModels: providerConfig.availableModels
  };
};

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().min(1, 'content must be a non-empty string'),
  name: z.string().min(1).optional(),
  toolCallId: z.string().min(1).optional()
}).superRefine((value, ctx) => {
  if (value.role === 'tool' && !value.toolCallId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['toolCallId'],
      message: 'toolCallId is required when role is "tool"'
    });
  }
});

const chatInputSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, 'messages must contain at least one entry'),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  stop: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional()
});

const mapMessageToOpenAI = (message) => {
  const mapped = {
    role: message.role,
    content: message.content
  };

  if (message.name) {
    mapped.name = message.name;
  }

  if (message.toolCallId) {
    mapped.tool_call_id = message.toolCallId;
  }

  return mapped;
};

const coerceMessageContent = (message) => {
  if (!message) {
    return '';
  }

  const content = message.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (part && typeof part.text === 'string') {
          return part.text;
        }

        return '';
      })
      .join('');
  }

  return '';
};

const extractErrorMessage = (error) => {
  if (error && typeof error === 'object') {
    const response = error.response;
    if (response && typeof response === 'object') {
      const data = response.data;
      if (data && typeof data === 'object' && data.error && typeof data.error === 'object' && typeof data.error.message === 'string') {
        return data.error.message;
      }
    }

    if (error.error && typeof error.error === 'object' && typeof error.error.message === 'string') {
      return error.error.message;
    }

    if (typeof error.message === 'string' && error.message.trim().length > 0) {
      return error.message;
    }
  }

  return 'Deepseek chat completion failed';
};

const registerDeepseekTool = (mcpServer, context, log) => {
  const allowedModels = Array.isArray(context.availableModels) && context.availableModels.length > 0
    ? new Set(context.availableModels)
    : null;

  mcpServer.registerTool(
    'deepseek.chat',
    {
      title: 'Deepseek Chat Completion',
      description: 'Generate responses using Deepseek chat completion models.',
      inputSchema: chatInputSchema
    },
    async (args) => {
      if (!context.client) {
        return mcpServer.createToolError('Deepseek API client is not configured. Set the API key and restart the server.');
      }

      const requestedModel = typeof args.model === 'string' && args.model.trim().length > 0 ? args.model.trim() : null;
      const resolvedModel = requestedModel || context.defaultModel;

      if (!resolvedModel) {
        return mcpServer.createToolError('No Deepseek model is configured. Provide a model in the request or set a default model.');
      }

      if (allowedModels && !allowedModels.has(resolvedModel)) {
        return mcpServer.createToolError(`Model "${resolvedModel}" is not allowed. Allowed models: ${[...allowedModels].join(', ')}`);
      }

      const payload = {
        model: resolvedModel,
        messages: args.messages.map(mapMessageToOpenAI)
      };

      if (typeof args.temperature === 'number') {
        payload.temperature = args.temperature;
      }

      if (typeof args.topP === 'number') {
        payload.top_p = args.topP;
      }

      if (typeof args.maxTokens === 'number') {
        payload.max_tokens = args.maxTokens;
      }

      if (typeof args.frequencyPenalty === 'number') {
        payload.frequency_penalty = args.frequencyPenalty;
      }

      if (typeof args.presencePenalty === 'number') {
        payload.presence_penalty = args.presencePenalty;
      }

      if (typeof args.stop === 'string' || Array.isArray(args.stop)) {
        payload.stop = args.stop;
      }

      try {
        const response = await context.client.chat.completions.create(payload);
        const firstChoice = response?.choices?.[0];

        if (!firstChoice) {
          return mcpServer.createToolError('Deepseek did not return any completion choices.');
        }

        const text = coerceMessageContent(firstChoice.message);

        return {
          content: [
            {
              type: 'text',
              text
            }
          ],
          metadata: {
            model: response?.model || resolvedModel,
            choiceIndex: firstChoice.index,
            finishReason: firstChoice.finish_reason,
            usage: response?.usage,
            id: response?.id
          }
        };
      } catch (error) {
        const message = extractErrorMessage(error);
        log.error({ err: error }, 'Deepseek chat completion failed');
        return mcpServer.createToolError(message);
      }
    }
  );
};

const buildDeepseekServer = ({ fastifyOptions } = {}) => {
  const mergedOptions = {
    ...(fastifyOptions || {})
  };

  const loggerOptions = typeof mergedOptions.logger === 'object' && mergedOptions.logger !== null
    ? { level: 'info', name: 'deepseek-mcp-server', ...mergedOptions.logger }
    : { level: 'info', name: 'deepseek-mcp-server' };

  mergedOptions.logger = loggerOptions;

  if (typeof mergedOptions.bodyLimit === 'number') {
    mergedOptions.bodyLimit = Math.max(mergedOptions.bodyLimit, FOUR_MB);
  } else {
    mergedOptions.bodyLimit = FOUR_MB;
  }

  const app = fastifyFactory(mergedOptions);

  const providerConfig = loadProviderConfig();
  const clientContext = buildDeepseekClientContext(providerConfig, app.log);

  const mcpServer = new McpServer(SERVER_INFO);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true
  });

  transport.onerror = (error) => {
    app.log.error({ err: error }, 'Deepseek MCP transport error');
  };

  registerDeepseekTool(mcpServer, clientContext, app.log);

  const connectPromise = mcpServer
    .connect(transport)
    .catch((error) => {
      app.log.error({ err: error }, 'Deepseek MCP server failed to connect');
      throw error;
    });

  if (!app.hasDecorator('deepseekMcp')) {
    app.decorate('deepseekMcp', {});
  }

  app.deepseekMcp.server = mcpServer;
  app.deepseekMcp.transport = transport;
  app.deepseekMcp.connectPromise = connectPromise;
  app.deepseekMcp.clientContext = clientContext;

  app.get('/health', async () => ({ status: 'ok' }));

  const handleMcpRequest = async (request, reply) => {
    reply.hijack();

    try {
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch (error) {
      app.log.error({ err: error }, 'Failed to handle MCP request');
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { 'content-type': 'application/json' });
      }
      reply.raw.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal MCP server error'
          },
          id: null
        })
      );
    }
  };

  app.route({
    method: ['GET', 'POST', 'DELETE'],
    url: MCP_ROUTE,
    handler: handleMcpRequest
  });

  app.addHook('onReady', async () => {
    await connectPromise;
    app.log.info({ route: MCP_ROUTE }, 'Deepseek MCP server ready');
  });

  app.addHook('onClose', async () => {
    try {
      await connectPromise.catch(() => {});
      await mcpServer.close();
    } catch (error) {
      app.log.error({ err: error }, 'Failed to close Deepseek MCP server cleanly');
    }
  });

  if (!clientContext.client) {
    app.log.warn({ apiKeyEnv: clientContext.apiKeyEnv }, 'Deepseek MCP tool is running without an API key; all tool calls will fail');
  }

  return app;
};

const startDeepseekServer = async ({ host = '127.0.0.1', port = 3100, fastifyOptions } = {}) => {
  const app = buildDeepseekServer({ fastifyOptions });

  try {
    await app.ready();
    const address = await app.listen({ port, host });
    app.log.info({ address }, 'Deepseek MCP server listening');
    return app;
  } catch (error) {
    app.log.error(error, 'Deepseek MCP server failed to start');
    try {
      await app.close();
    } catch (closeError) {
      app.log.error(closeError, 'Deepseek MCP server failed to close after startup error');
    }
    throw error;
  }
};

module.exports = {
  buildDeepseekServer,
  startDeepseekServer
};
