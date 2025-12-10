const fastifyFactory = require('fastify');
const path = require('path');
const { randomUUID } = require('node:crypto');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { fetch } = require('undici');
const { z } = require('zod/v3');

const DEFAULT_BODY_LIMIT = 4 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_BASE_URL = 'https://plugin.aiot.hello1023.com';
const MCP_ROUTE = '/mcp';
const PACKAGE_JSON_PATH = path.join(__dirname, '..', '..', 'package.json');
const ALLOWED_PORT_TYPES = new Set(['led', 'relay', 'servo', 'pwm']);
const ALLOWED_ACTIONS = new Set(['on', 'off', 'set']);

const resolvePackageInfo = () => {
  try {
    const pkg = require(PACKAGE_JSON_PATH);
    const name = typeof pkg.name === 'string' && pkg.name.trim().length > 0 ? `${pkg.name}-sensor-mcp-server` : 'sensor-mcp-server';
    const version = typeof pkg.version === 'string' && pkg.version.trim().length > 0 ? pkg.version.trim() : '0.1.0';
    return { name, version };
  } catch (_error) {
    return { name: 'sensor-mcp-server', version: '0.1.0' };
  }
};

const SERVER_INFO = resolvePackageInfo();

const sanitizeHeaders = (input) => {
  if (!input || typeof input !== 'object') {
    return {};
  }

  return Object.entries(input).reduce((acc, [key, value]) => {
    if (typeof key !== 'string') {
      return acc;
    }

    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return acc;
    }

    if (value === undefined || value === null) {
      return acc;
    }

    acc[normalizedKey] = String(value);
    return acc;
  }, {});
};

const loadProviderConfig = () => {
  const config = {
    baseUrl: DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    defaultUuid: null,
    authToken: null,
    headers: {}
  };

  const envBaseUrl = typeof process.env.SENSOR_PLUGIN_BASE_URL === 'string' ? process.env.SENSOR_PLUGIN_BASE_URL.trim() : '';
  if (envBaseUrl) {
    config.baseUrl = envBaseUrl;
  }

  const envTimeout = Number(process.env.SENSOR_PLUGIN_TIMEOUT_MS);
  if (Number.isFinite(envTimeout) && envTimeout > 0) {
    config.timeoutMs = envTimeout;
  }

  const envUuid = typeof process.env.SENSOR_PLUGIN_DEFAULT_UUID === 'string' ? process.env.SENSOR_PLUGIN_DEFAULT_UUID.trim() : '';
  if (envUuid) {
    config.defaultUuid = envUuid;
  }

  const envToken = typeof process.env.SENSOR_PLUGIN_AUTH_TOKEN === 'string' ? process.env.SENSOR_PLUGIN_AUTH_TOKEN.trim() : '';
  if (envToken) {
    config.authToken = envToken;
  }

  if (typeof process.env.SENSOR_PLUGIN_HEADERS === 'string' && process.env.SENSOR_PLUGIN_HEADERS.trim().length > 0) {
    try {
      const parsed = JSON.parse(process.env.SENSOR_PLUGIN_HEADERS);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        config.headers = { ...config.headers, ...parsed };
      }
    } catch (_error) {
      // ignore invalid header config
    }
  }

  config.headers = sanitizeHeaders(config.headers);

  return config;
};

const buildSensorClientContext = (providerConfig, log) => {
  let baseUrl = DEFAULT_BASE_URL;
  const rawBaseUrl = typeof providerConfig.baseUrl === 'string' ? providerConfig.baseUrl.trim() : '';

  if (rawBaseUrl.length > 0) {
    try {
      baseUrl = new URL(rawBaseUrl).toString();
    } catch (_error) {
      log.warn({ baseUrl: rawBaseUrl }, 'Invalid sensor plugin base URL, falling back to default');
    }
  }

  const candidateTimeout = Number(providerConfig.timeoutMs);
  const timeoutMs = Number.isFinite(candidateTimeout) && candidateTimeout > 0 ? candidateTimeout : DEFAULT_TIMEOUT_MS;

  if (!Number.isFinite(candidateTimeout) || candidateTimeout <= 0) {
    if (providerConfig.timeoutMs !== DEFAULT_TIMEOUT_MS) {
      log.warn({ timeoutMs: providerConfig.timeoutMs }, 'Invalid sensor plugin timeout, using default');
    }
  }

  const defaultUuid = typeof providerConfig.defaultUuid === 'string' && providerConfig.defaultUuid.trim().length > 0
    ? providerConfig.defaultUuid.trim()
    : null;

  const headers = {
    Accept: 'application/json',
    ...sanitizeHeaders(providerConfig.headers)
  };

  if (typeof providerConfig.authToken === 'string' && providerConfig.authToken.trim().length > 0) {
    headers.Authorization = providerConfig.authToken.trim();
  }

  return {
    baseUrl,
    timeoutMs,
    defaultUuid,
    headers
  };
};

const selectFirstString = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
};

const normalizeArguments = (args) => {
  if (args === null || args === undefined) {
    return {};
  }

  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_error) {
      return {};
    }
  }

  if (typeof args === 'object' && !Array.isArray(args)) {
    return args;
  }

  return {};
};

const formatPayloadForContent = (payload) => {
  if (payload === null || payload === undefined) {
    return 'null';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch (_error) {
    return String(payload);
  }
};

const compactMetadata = (metadata) => Object.entries(metadata).reduce((acc, [key, value]) => {
  if (value !== undefined && value !== null) {
    acc[key] = value;
  }
  return acc;
}, {});

const formatZodError = (error) =>
  error.errors
    .map(({ path, message }) => {
      const prefix = Array.isArray(path) && path.length > 0 ? `${path.join('.')}: ` : '';
      return `${prefix}${message}`;
    })
    .join('; ');

const validateArguments = (schema, rawArgs) => {
  const normalized = normalizeArguments(rawArgs);
  const result = schema.safeParse(normalized);

  if (!result.success) {
    return { error: formatZodError(result.error) };
  }

  return { data: result.data };
};

const callSensorEndpoint = async (context, options = {}) => {
  const method = typeof options.method === 'string' ? options.method.toUpperCase() : 'GET';
  const path = typeof options.path === 'string' ? options.path : '/';

  let url;

  try {
    url = new URL(path, context.baseUrl);
  } catch (_error) {
    throw new Error(`Invalid sensor plugin path: ${path}`);
  }

  if (options.query && typeof options.query === 'object') {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry !== undefined && entry !== null) {
            url.searchParams.append(key, String(entry));
          }
        });
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  let bodyPayload;
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === 'string') {
      bodyPayload = options.body;
    } else {
      try {
        bodyPayload = JSON.stringify(options.body);
      } catch (_error) {
        throw new Error('Failed to serialize request body');
      }
    }
  }

  const headers = {
    ...context.headers
  };

  const hasContentType = Object.keys(headers).some((key) => key.toLowerCase() === 'content-type');

  if (bodyPayload !== undefined && !hasContentType) {
    headers['content-type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), context.timeoutMs);

  let response;

  try {
    response = await fetch(url, {
      method,
      headers,
      body: bodyPayload,
      signal: controller.signal
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('Sensor plugin request timed out');
    }

    throw new Error(error instanceof Error ? error.message : 'Sensor plugin request failed');
  } finally {
    clearTimeout(timeout);
  }

  let responseText = '';

  try {
    responseText = await response.text();
  } catch (_error) {
    responseText = '';
  }

  let payload = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch (_error) {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object'
        ? payload.msg || payload.message || `Sensor plugin request failed with status ${response.status}`
        : `Sensor plugin request failed with status ${response.status}`;

    throw new Error(message);
  }

  return {
    status: response.status,
    data: payload,
    raw: responseText
  };
};

const getSensorDataSchema = z
  .object({
    sensor: z.string().min(1, 'sensor is required'),
    uuid: z.string().min(1).optional(),
    device_uuid: z.string().min(1).optional()
  })
  .strict();

const controlDeviceSchema = z
  .object({
    device_uuid: z.string().min(1).optional(),
    uuid: z.string().min(1).optional(),
    port_type: z.enum(['led', 'relay', 'servo', 'pwm']),
    port_id: z.number().int().min(1).max(4),
    action: z.enum(['on', 'off', 'set']),
    value: z.number().optional()
  })
  .strict();

const executePresetSchema = z
  .object({
    device_uuid: z.string().min(1).optional(),
    uuid: z.string().min(1).optional(),
    preset_name: z.string().min(1, 'preset_name is required'),
    parameters: z.record(z.any()).optional()
  })
  .strict();

const buildToolSuccess = (response) => ({
  content: [
    {
      type: 'text',
      text: formatPayloadForContent(response.data ?? response.raw ?? '')
    }
  ],
  metadata: compactMetadata({
    status: response.status,
    code: response.data && typeof response.data.code === 'number' ? response.data.code : undefined,
    message: response.data && typeof response.data.msg === 'string' ? response.data.msg : undefined,
    timestamp: Date.now()
  })
});

const registerSensorTools = (mcpServer, context, log) => {
  mcpServer.registerTool(
    'getSensorData',
    {
      title: 'Fetch sensor data',
      description: 'Retrieve a single sensor reading from the IoT plugin.',
      inputSchema: getSensorDataSchema
    },
    async (rawArgs) => {
      const validation = validateArguments(getSensorDataSchema, rawArgs);

      if (validation.error) {
        return mcpServer.createToolError(validation.error);
      }

      const args = validation.data;
      const sensorType = args.sensor;
      const uuid = selectFirstString(args.uuid, args.device_uuid, context.defaultUuid);

      if (!uuid) {
        return mcpServer.createToolError('uuid is required');
      }

      try {
        const response = await callSensorEndpoint(context, {
          method: 'GET',
          path: '/plugin/sensor-data',
          query: {
            uuid,
            sensor: sensorType
          }
        });

        return buildToolSuccess(response);
      } catch (error) {
        log.error({ err: error, sensor: sensorType }, 'Sensor data fetch failed');
        return mcpServer.createToolError(error instanceof Error ? error.message : 'Failed to fetch sensor data');
      }
    }
  );

  mcpServer.registerTool(
    'controlDevice',
    {
      title: 'Control device',
      description: 'Send a control command to LED, relay, servo, or PWM ports.',
      inputSchema: controlDeviceSchema
    },
    async (rawArgs) => {
      const validation = validateArguments(controlDeviceSchema, rawArgs);

      if (validation.error) {
        return mcpServer.createToolError(validation.error);
      }

      const args = validation.data;

      const portType = args.port_type;
      if (!ALLOWED_PORT_TYPES.has(portType)) {
        return mcpServer.createToolError('port_type must be one of led, relay, servo, pwm');
      }

      const portId = args.port_id;

      const action = args.action;
      if (!ALLOWED_ACTIONS.has(action)) {
        return mcpServer.createToolError('action must be one of on, off, set');
      }

      const deviceUuid = selectFirstString(args.device_uuid, args.uuid, context.defaultUuid);
      if (!deviceUuid) {
        return mcpServer.createToolError('device_uuid is required');
      }

      let value;

      if (action === 'set') {
        if (!Number.isFinite(args.value)) {
          return mcpServer.createToolError('value must be provided as a number when action is set');
        }

        if (args.value < 0 || args.value > 180) {
          return mcpServer.createToolError('value must be between 0 and 180 when action is set');
        }

        value = args.value;
      }

      const body = {
        device_uuid: deviceUuid,
        port_type: portType,
        port_id: portId,
        action
      };

      if (value !== undefined) {
        body.value = value;
      }

      try {
        const response = await callSensorEndpoint(context, {
          method: 'POST',
          path: '/plugin/control',
          body
        });

        return buildToolSuccess(response);
      } catch (error) {
        log.error({ err: error, portType, portId, action }, 'Device control failed');
        return mcpServer.createToolError(error instanceof Error ? error.message : 'Failed to control device');
      }
    }
  );

  mcpServer.registerTool(
    'executePreset',
    {
      title: 'Execute preset action',
      description: 'Trigger a predefined preset on the target device.',
      inputSchema: executePresetSchema
    },
    async (rawArgs) => {
      const validation = validateArguments(executePresetSchema, rawArgs);

      if (validation.error) {
        return mcpServer.createToolError(validation.error);
      }

      const args = validation.data;

      const presetName = args.preset_name;

      const deviceUuid = selectFirstString(args.device_uuid, args.uuid, context.defaultUuid);
      if (!deviceUuid) {
        return mcpServer.createToolError('device_uuid is required');
      }

      const parameters = args.parameters && typeof args.parameters === 'object' ? args.parameters : {};

      try {
        const response = await callSensorEndpoint(context, {
          method: 'POST',
          path: '/plugin/preset',
          body: {
            device_uuid: deviceUuid,
            preset_name: presetName,
            parameters
          }
        });

        return buildToolSuccess(response);
      } catch (error) {
        log.error({ err: error, presetName }, 'Preset execution failed');
        return mcpServer.createToolError(error instanceof Error ? error.message : 'Failed to execute preset');
      }
    }
  );
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

const buildSensorServer = ({ fastifyOptions } = {}) => {
  const mergedOptions = {
    ...(fastifyOptions || {})
  };

  const loggerOptions = typeof mergedOptions.logger === 'object' && mergedOptions.logger !== null
    ? { level: 'info', name: 'sensor-mcp-server', ...mergedOptions.logger }
    : { level: 'info', name: 'sensor-mcp-server' };

  mergedOptions.logger = loggerOptions;

  if (typeof mergedOptions.bodyLimit === 'number') {
    mergedOptions.bodyLimit = Math.max(mergedOptions.bodyLimit, DEFAULT_BODY_LIMIT);
  } else {
    mergedOptions.bodyLimit = DEFAULT_BODY_LIMIT;
  }

  const app = fastifyFactory(mergedOptions);

  const providerConfig = loadProviderConfig();
  const clientContext = buildSensorClientContext(providerConfig, app.log);

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
      app.log.error({ err: error }, 'Sensor MCP transport error');
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

  registerSensorTools(mcpServer, clientContext, app.log);

  mcpServer.server.oninitialized = () => {
    hasActiveSession = true;
  };

  const connectToTransport = (targetTransport) =>
    mcpServer
      .connect(targetTransport)
      .catch((error) => {
        app.log.error({ err: error }, 'Sensor MCP server failed to connect');
        throw error;
      });

  let connectPromise = connectToTransport(transport);

  if (!app.hasDecorator('sensorMcp')) {
    app.decorate('sensorMcp', {});
  }

  app.sensorMcp.server = mcpServer;
  app.sensorMcp.transport = transport;
  app.sensorMcp.connectPromise = connectPromise;
  app.sensorMcp.clientContext = clientContext;

  const resetConnectionForNewSession = async () => {
    if (shuttingDown) {
      return connectPromise;
    }

    if (resettingTransportPromise) {
      await resettingTransportPromise;
      return connectPromise;
    }

    app.log.info('Resetting Sensor MCP session for new initialization request');

    resettingTransportPromise = (async () => {
      hasActiveSession = false;

      try {
        await connectPromise.catch(() => {});
      } catch (_error) {
        // Already handled in connectPromise
      }

      try {
        await mcpServer.close();
      } catch (error) {
        app.log.warn({ err: error }, 'Sensor MCP server close before reinitialization failed');
      }

      const previousTransport = transport;

      if (previousTransport) {
        try {
          await previousTransport.close();
        } catch (error) {
          app.log.warn({ err: error }, 'Sensor MCP transport close before reinitialization failed');
        }
      }

      transport = createTransport();
      const newConnectPromise = connectToTransport(transport);

      connectPromise = newConnectPromise;
      app.sensorMcp.transport = transport;
      app.sensorMcp.connectPromise = newConnectPromise;

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
      app.log.error({ err: error }, 'Failed to handle Sensor MCP request');
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
    app.log.info({ route: MCP_ROUTE }, 'Sensor MCP server ready');
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
      app.log.error({ err: error }, 'Failed to close Sensor MCP server cleanly');
    }

    try {
      await transport.close();
    } catch (error) {
      app.log.warn({ err: error }, 'Failed to close Sensor MCP transport cleanly');
    }
  });

  if (!clientContext.defaultUuid) {
    app.log.warn('Sensor MCP server default UUID is not configured; tool calls must provide uuid explicitly');
  }

  return app;
};

const startSensorServer = async ({ host = '127.0.0.1', port = 3200, fastifyOptions } = {}) => {
  const app = buildSensorServer({ fastifyOptions });

  try {
    await app.ready();
    const address = await app.listen({ port, host });
    app.log.info({ address }, 'Sensor MCP server listening');
    return app;
  } catch (error) {
    app.log.error(error, 'Sensor MCP server failed to start');
    try {
      await app.close();
    } catch (closeError) {
      app.log.error(closeError, 'Sensor MCP server failed to close after startup error');
    }
    throw error;
  }
};

module.exports = {
  buildSensorServer,
  startSensorServer
};
