const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

let defaultClientName = 'plugin-server-mcp-client';
let defaultClientVersion = '0.1.0';

try {
  const pkg = require(path.join(__dirname, '..', '..', 'package.json'));
  if (pkg && typeof pkg.name === 'string' && pkg.name.trim().length > 0) {
    defaultClientName = `${pkg.name}-mcp-client`;
  }
  if (pkg && typeof pkg.version === 'string' && pkg.version.trim().length > 0) {
    defaultClientVersion = pkg.version;
  }
} catch (_error) {
  // Continue with default values when package metadata is unavailable.
}

const DEFAULT_CLIENT_INFO = {
  name: defaultClientName,
  version: defaultClientVersion
};

const sanitizeHeaders = (headersInput = {}) => {
  if (!headersInput || typeof headersInput !== 'object') {
    return {};
  }

  return Object.entries(headersInput).reduce((acc, [key, value]) => {
    if (typeof key !== 'string' || key.trim().length === 0) {
      return acc;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      acc[key] = String(value);
    }

    return acc;
  }, {});
};

const buildClientInfo = (clientInfo = {}) => {
  const info = { ...DEFAULT_CLIENT_INFO };

  if (clientInfo && typeof clientInfo === 'object') {
    if (typeof clientInfo.name === 'string' && clientInfo.name.trim().length > 0) {
      info.name = clientInfo.name.trim();
    }

    if (typeof clientInfo.version === 'string' && clientInfo.version.trim().length > 0) {
      info.version = clientInfo.version.trim();
    }
  }

  return info;
};

const buildClientOptions = (serverConfig = {}) => {
  const options = {};

  if (serverConfig.capabilities && typeof serverConfig.capabilities === 'object') {
    options.capabilities = serverConfig.capabilities;
  }

  if (serverConfig.enforceStrictCapabilities === true) {
    options.enforceStrictCapabilities = true;
  }

  if (typeof serverConfig.defaultTaskPollInterval === 'number') {
    options.defaultTaskPollInterval = serverConfig.defaultTaskPollInterval;
  }

  if (typeof serverConfig.maxTaskQueueSize === 'number') {
    options.maxTaskQueueSize = serverConfig.maxTaskQueueSize;
  }

  if (Array.isArray(serverConfig.debouncedNotificationMethods)) {
    options.debouncedNotificationMethods = serverConfig.debouncedNotificationMethods;
  }

  return options;
};

// Allow simple auth configuration with static bearer tokens.
const extractAccessToken = (authConfig = {}) => {
  if (!authConfig || typeof authConfig !== 'object') {
    return undefined;
  }

  if (typeof authConfig.accessToken === 'string' && authConfig.accessToken.trim().length > 0) {
    return authConfig.accessToken.trim();
  }

  if (typeof authConfig.access_token === 'string' && authConfig.access_token.trim().length > 0) {
    return authConfig.access_token.trim();
  }

  if (authConfig.tokens && typeof authConfig.tokens === 'object') {
    const tokens = authConfig.tokens;
    if (typeof tokens.accessToken === 'string' && tokens.accessToken.trim().length > 0) {
      return tokens.accessToken.trim();
    }
    if (typeof tokens.access_token === 'string' && tokens.access_token.trim().length > 0) {
      return tokens.access_token.trim();
    }
  }

  return undefined;
};

const buildTransportOptions = (serverConfig = {}) => {
  const headersFromConfig = sanitizeHeaders(serverConfig.headers);
  const headers = { ...headersFromConfig };
  let authProvider;

  if (typeof serverConfig.bearerToken === 'string' && serverConfig.bearerToken.trim().length > 0) {
    headers.Authorization = `Bearer ${serverConfig.bearerToken.trim()}`;
  }

  if (serverConfig.auth && typeof serverConfig.auth === 'object') {
    const potentialProvider = serverConfig.auth;
    if (typeof potentialProvider.tokens === 'function') {
      authProvider = potentialProvider;
    } else {
      const accessToken = extractAccessToken(potentialProvider);
      if (accessToken && !headers.Authorization) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }
  }

  if (typeof serverConfig.protocolVersion === 'string' && serverConfig.protocolVersion.trim().length > 0) {
    headers['mcp-protocol-version'] = serverConfig.protocolVersion.trim();
  }

  const requestInit = Object.keys(headers).length > 0 ? { headers } : undefined;

  const transportOptions = {};

  if (requestInit) {
    transportOptions.requestInit = requestInit;
  }

  if (typeof serverConfig.sessionId === 'string' && serverConfig.sessionId.trim().length > 0) {
    transportOptions.sessionId = serverConfig.sessionId.trim();
  }

  if (serverConfig.reconnectionOptions && typeof serverConfig.reconnectionOptions === 'object') {
    transportOptions.reconnectionOptions = serverConfig.reconnectionOptions;
  }

  if (typeof serverConfig.retryInterval === 'number') {
    transportOptions.retryInterval = serverConfig.retryInterval;
  }

  if (authProvider) {
    transportOptions.authProvider = authProvider;
  }

  return transportOptions;
};

const ensureUrl = (urlString) => {
  if (typeof urlString !== 'string' || urlString.trim().length === 0) {
    throw new Error('server.url must be a non-empty string');
  }

  try {
    return new URL(urlString);
  } catch (_error) {
    throw new Error(`Invalid MCP server URL: ${urlString}`);
  }
};

const resolvePaginatedParams = (operation = {}) => {
  if (operation && typeof operation.params === 'object' && operation.params !== null) {
    return { ...operation.params };
  }

  if (typeof operation.cursor === 'string' && operation.cursor.trim().length > 0) {
    return { cursor: operation.cursor.trim() };
  }

  return undefined;
};

const resolveToolParams = (operation = {}) => {
  const params = operation && typeof operation.params === 'object' && operation.params !== null ? { ...operation.params } : {};

  if (!params.name && typeof operation.name === 'string') {
    params.name = operation.name.trim();
  }

  if (!params.arguments && operation && typeof operation.arguments === 'object' && operation.arguments !== null) {
    params.arguments = operation.arguments;
  }

  if (typeof params.name !== 'string' || params.name.trim().length === 0) {
    throw new Error('callTool requires a tool name');
  }

  params.name = params.name.trim();

  if (params.arguments && typeof params.arguments !== 'object') {
    throw new Error('callTool arguments must be an object if provided');
  }

  return params;
};

const resolveResourceParams = (operation = {}) => {
  const params = operation && typeof operation.params === 'object' && operation.params !== null ? { ...operation.params } : {};

  if (!params.uri && typeof operation.uri === 'string') {
    params.uri = operation.uri.trim();
  }

  if (typeof params.uri !== 'string' || params.uri.trim().length === 0) {
    throw new Error('readResource requires a uri');
  }

  params.uri = params.uri.trim();

  return params;
};

const resolvePromptParams = (operation = {}) => {
  const params = operation && typeof operation.params === 'object' && operation.params !== null ? { ...operation.params } : {};

  if (!params.name && typeof operation.name === 'string') {
    params.name = operation.name.trim();
  }

  if (typeof params.name !== 'string' || params.name.trim().length === 0) {
    throw new Error('prompt operations require a name');
  }

  params.name = params.name.trim();

  if (!params.arguments && operation && typeof operation.arguments === 'object' && operation.arguments !== null) {
    params.arguments = operation.arguments;
  }

  if (params.arguments && typeof params.arguments !== 'object') {
    throw new Error('prompt arguments must be an object if provided');
  }

  return params;
};

class McpClient {
  constructor(serverConfig) {
    if (!serverConfig || typeof serverConfig !== 'object') {
      throw new Error('server configuration must be provided');
    }

    this.serverConfig = { ...serverConfig };
    this.baseUrl = ensureUrl(serverConfig.url);
    this.clientInfo = buildClientInfo(serverConfig.client);
    this.clientOptions = buildClientOptions(serverConfig);

    this._client = null;
    this._transport = null;
    this._connectPromise = null;
    this._connected = false;
  }

  get client() {
    return this._client;
  }

  get transport() {
    return this._transport;
  }

  isConnected() {
    return this._connected;
  }

  async connect(options = {}) {
    if (options.force === true) {
      await this.disconnect().catch(() => {});
    }

    if (this._connected) {
      return this._connectPromise ?? Promise.resolve();
    }

    if (this._connectPromise) {
      return this._connectPromise;
    }

    const transportOptions = buildTransportOptions(this.serverConfig);
    const transport = new StreamableHTTPClientTransport(this.baseUrl, Object.keys(transportOptions).length > 0 ? transportOptions : undefined);
    const client = new Client(this.clientInfo, this.clientOptions);

    this._transport = transport;
    this._client = client;

    const connectPromise = client
      .connect(transport)
      .then(() => {
        this._connected = true;
      })
      .catch(async (error) => {
        await this._safeClose(client, transport);
        this._client = null;
        this._transport = null;
        throw error;
      })
      .finally(() => {
        this._connectPromise = null;
      });

    this._connectPromise = connectPromise;
    return connectPromise;
  }

  async disconnect() {
    if (this._connectPromise) {
      await this._connectPromise.catch(() => {});
    }

    if (!this._client && !this._transport) {
      return;
    }

    await this._safeClose(this._client, this._transport);

    this._client = null;
    this._transport = null;
    this._connected = false;
  }

  async reconnect() {
    await this.disconnect();
    return this.connect();
  }

  async ensureConnected() {
    if (this._connected) {
      return;
    }
    await this.connect();
  }

  getConnectionInfo() {
    return {
      serverInfo: this._client?.getServerVersion() ?? null,
      capabilities: this._client?.getServerCapabilities() ?? null,
      instructions: this._client?.getInstructions() ?? null,
      sessionId: this._transport?.sessionId ?? null,
      protocolVersion: this._transport?.protocolVersion ?? null
    };
  }

  async ping() {
    await this.ensureConnected();
    return this._client.ping();
  }

  async listTools(params) {
    await this.ensureConnected();
    return this._client.listTools(params);
  }

  async callTool(params) {
    await this.ensureConnected();
    return this._client.callTool(params);
  }

  async listResources(params) {
    await this.ensureConnected();
    return this._client.listResources(params);
  }

  async readResource(params) {
    await this.ensureConnected();
    return this._client.readResource(params);
  }

  async listPrompts(params) {
    await this.ensureConnected();
    return this._client.listPrompts(params);
  }

  async getPrompt(params) {
    await this.ensureConnected();
    return this._client.getPrompt(params);
  }

  async executeOperation(operation) {
    if (!operation || typeof operation !== 'object') {
      throw new Error('operation must be an object');
    }

    await this.ensureConnected();

    switch (operation.type) {
      case 'ping':
        return this.ping();
      case 'listTools':
        return this.listTools(resolvePaginatedParams(operation));
      case 'callTool':
        return this.callTool(resolveToolParams(operation));
      case 'listResources':
        return this.listResources(resolvePaginatedParams(operation));
      case 'readResource':
        return this.readResource(resolveResourceParams(operation));
      case 'listPrompts':
        return this.listPrompts(resolvePaginatedParams(operation));
      case 'getPrompt':
        return this.getPrompt(resolvePromptParams(operation));
      default:
        throw new Error(`Unsupported MCP operation type: ${operation.type}`);
    }
  }

  async executeOperations(operations, { continueOnError = false } = {}) {
    if (!Array.isArray(operations) || operations.length === 0) {
      return { operationsCount: 0, results: [], errors: [] };
    }

    await this.ensureConnected();

    const results = [];
    const errors = [];

    for (let index = 0; index < operations.length; index += 1) {
      const operation = operations[index];

      try {
        const result = await this.executeOperation(operation);
        results.push({ index, type: operation?.type ?? 'unknown', result });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!continueOnError) {
          throw new Error(`Initialization operation '${operation?.type ?? 'unknown'}' failed: ${message}`);
        }
        errors.push({ index, type: operation?.type ?? 'unknown', message });
      }
    }

    return { operationsCount: operations.length, results, errors };
  }

  async _safeClose(client, transport) {
    const closePromises = [];

    if (client && typeof client.close === 'function') {
      closePromises.push(client.close().catch(() => {}));
    }

    if (transport && typeof transport.close === 'function') {
      closePromises.push(transport.close().catch(() => {}));
    }

    await Promise.all(closePromises);
  }
}

module.exports = {
  McpClient
};
