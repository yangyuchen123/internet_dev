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
  tool_call_id: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  tool_calls: z
    .array(
      z.object({
        id: z.string().min(1).optional(),
        type: z.literal('function'),
        function: z
          .object({
            name: z.string().min(1),
            arguments: z.string().min(1)
          })
          .strict()
      }).strict()
    )
    .min(1)
    .optional()
}).superRefine((value, ctx) => {
  if (value.role === 'tool' && !value.tool_call_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tool_call_id'],
      message: 'tool_call_id is required when role is "tool"'
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
  presencePenalty: z.number().min(-2).max(2).optional(),
  tools: z.array(z.any()).optional(),
  toolChoice: z.union([z.string(), z.object({}).passthrough()]).optional()
});

const mapMessageToOpenAI = (message) => {
  const mapped = {
    role: message.role,
    content: message.content
  };

  if (message.name) {
    mapped.name = message.name;
  }

  if (message.tool_call_id) {
    mapped.tool_call_id = message.tool_call_id;
  }

  if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    mapped.tool_calls = message.tool_calls
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const functionPayload = entry.function;

        if (!functionPayload || typeof functionPayload !== 'object') {
          return null;
        }

        const name = typeof functionPayload.name === 'string' ? functionPayload.name.trim() : '';
        const args = typeof functionPayload.arguments === 'string' ? functionPayload.arguments : '';

        if (!name) {
          return null;
        }

        return {
          id: typeof entry.id === 'string' && entry.id.trim().length > 0 ? entry.id.trim() : undefined,
          type: 'function',
          function: {
            name,
            arguments: args && args.trim().length > 0 ? args.trim() : '{}'
          }
        };
      })
      .filter((entry) => entry !== null);

    if (mapped.tool_calls.length === 0) {
      delete mapped.tool_calls;
    }
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

const isInitializationPayload = (payload) => {
  const isInitializeRequest = (message) =>
    Boolean(
      message &&
        typeof message === 'object' &&
        message.method === 'initialize'
    );

  if (Array.isArray(payload)) {
    return payload.some(isInitializeRequest);
  }

  return isInitializeRequest(payload);
};

const registerDeepseekTool = (mcpServer, context, log) => {
  const allowedModels = Array.isArray(context.availableModels) && context.availableModels.length > 0
    ? new Set(context.availableModels)
    : null;

  mcpServer.registerTool(
    'chat',
    {
      title: 'Deepseek Chat Completion',
      description: 'Generate responses using Deepseek chat completion models.',
      inputSchema: chatInputSchema
    },
    async (args) => {
      // log.info({ args }, 'Deepseek chat server start  1');
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
      // log.info({ args }, 'Deepseek chat server start  2');
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

      if (Array.isArray(args.tools) && args.tools.length > 0) {
        payload.tools = args.tools;
      }

      if (args.toolChoice !== undefined) {
        payload.tool_choice = args.toolChoice;
      }

      try {
        // log.info({ payload }, 'Deepseek chat completion request');
        const response = await context.client.chat.completions.create(payload);
        const firstChoice = response?.choices?.[0];

        if (!firstChoice) {
          return mcpServer.createToolError('Deepseek did not return any completion choices.');
        }

        const message = firstChoice.message;
        const text = coerceMessageContent(message);
        const toolCallList = Array.isArray(message?.tool_calls) ? message.tool_calls : [];

        const content = [];

        if (typeof text === 'string' && text.trim().length > 0) {
          content.push({
            type: 'text',
            text
          });
        }

        const normalizedToolCallList = [];

        for (const toolCallEntry of toolCallList) {
          if (!toolCallEntry || typeof toolCallEntry !== 'object') {
            continue;
          }

          const functionPayload = toolCallEntry.function || {};
          const callName = typeof functionPayload.name === 'string' ? functionPayload.name.trim() : null;

          if (!callName) {
            continue;
          }

          let serializedArgs = functionPayload.arguments;

          if (serializedArgs && typeof serializedArgs !== 'string') {
            try {
              serializedArgs = JSON.stringify(serializedArgs);
            } catch (_error) {
              serializedArgs = null;
            }
          }

          normalizedToolCallList.push({
            id: typeof toolCallEntry.id === 'string' ? toolCallEntry.id : null,
            name: callName,
            arguments: typeof serializedArgs === 'string' ? serializedArgs : null
          });
        }

        if (content.length === 0) {
          content.push({
            type: 'text',
            text: ''
          });
        }

        return {
          content,
          metadata: {
            model: response?.model || resolvedModel,
            choiceIndex: firstChoice.index,
            finishReason: firstChoice.finish_reason,
            usage: response?.usage,
            id: response?.id,
            tool_calls: normalizedToolCallList,
            role: message?.role || null
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

  let hasActiveSession = false;
  let shuttingDown = false;
  let resettingTransportPromise = null;

  const createTransport = () => {
    const transportInstance = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: () => {
        hasActiveSession = true;
      },
      onsessionclosed: () => {
        hasActiveSession = false;
      }
    });

    transportInstance.onerror = (error) => {
      app.log.error({ err: error }, 'Deepseek MCP transport error');
    };

    const previousOnClose = transportInstance.onclose;
    transportInstance.onclose = (...args) => {
      hasActiveSession = false;
      if (typeof previousOnClose === 'function') {
        previousOnClose(...args);
      }
    };

    return transportInstance;
  };

  let transport = createTransport();

  registerDeepseekTool(mcpServer, clientContext, app.log);

  mcpServer.server.oninitialized = () => {
    hasActiveSession = true;
  };

  const connectToTransport = (targetTransport) =>
    mcpServer
      .connect(targetTransport)
      .catch((error) => {
        app.log.error({ err: error }, 'Deepseek MCP server failed to connect');
        throw error;
      });

  let connectPromise = connectToTransport(transport);

  if (!app.hasDecorator('deepseekMcp')) {
    app.decorate('deepseekMcp', {});
  }

  app.deepseekMcp.server = mcpServer;
  app.deepseekMcp.transport = transport;
  app.deepseekMcp.connectPromise = connectPromise;
  app.deepseekMcp.clientContext = clientContext;

  const resetConnectionForNewSession = async () => {
    if (shuttingDown) {
      return connectPromise;
    }

    if (resettingTransportPromise) {
      await resettingTransportPromise;
      return connectPromise;
    }

    app.log.info('Resetting Deepseek MCP session for new initialization request');

    resettingTransportPromise = (async () => {
      hasActiveSession = false;

      try {
        await connectPromise.catch(() => {});
      } catch (_error) {
        // connect promise already logged; continue with reset
      }

      try {
        await mcpServer.close();
      } catch (error) {
        app.log.warn({ err: error }, 'Deepseek MCP server close before reinitialization failed');
      }

      const previousTransport = transport;

      if (previousTransport) {
        try {
          await previousTransport.close();
        } catch (error) {
          app.log.warn({ err: error }, 'Deepseek MCP transport close before reinitialization failed');
        }
      }

      transport = createTransport();
      const newConnectPromise = connectToTransport(transport);

      connectPromise = newConnectPromise;
      app.deepseekMcp.transport = transport;
      app.deepseekMcp.connectPromise = newConnectPromise;

      await newConnectPromise;
    })();

    try {
      await resettingTransportPromise;
    } finally {
      resettingTransportPromise = null;
    }

    return connectPromise;
  };

  app.get('/health', async () => ({ status: 'ok' }));

  const handleMcpRequest = async (request, reply) => {
    reply.hijack();

    try {
      const payload = request.body;
      const isInitializationRequest = request.method === 'POST' && isInitializationPayload(payload);

      if (isInitializationRequest && hasActiveSession && !shuttingDown) {
        await resetConnectionForNewSession();
      } else {
        await connectPromise;
      }

      await transport.handleRequest(request.raw, reply.raw, payload);
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
    shuttingDown = true;

    if (resettingTransportPromise) {
      await resettingTransportPromise.catch(() => {});
    }

    try {
      await connectPromise.catch(() => {});
      await mcpServer.close();
    } catch (error) {
      app.log.error({ err: error }, 'Failed to close Deepseek MCP server cleanly');
    }

    try {
      await transport.close();
    } catch (error) {
      app.log.warn({ err: error }, 'Failed to close Deepseek MCP transport cleanly');
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
