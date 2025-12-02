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
} catch (error) {
  // Fall back to hard-coded defaults if package metadata cannot be read.
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

const buildTransportOptions = (serverConfig) => {
  const headersFromConfig = sanitizeHeaders(serverConfig.headers);
  const headers = { ...headersFromConfig };

  if (typeof serverConfig.bearerToken === 'string' && serverConfig.bearerToken.trim().length > 0) {
    headers.Authorization = `Bearer ${serverConfig.bearerToken.trim()}`;
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

  return transportOptions;
};

const ensureUrl = (urlString) => {
  if (typeof urlString !== 'string' || urlString.trim().length === 0) {
    throw new Error('server.url must be a non-empty string');
  }

  try {
    return new URL(urlString);
  } catch (error) {
    throw new Error(`Invalid MCP server URL: ${urlString}`);
  }
};

const withMcpClient = async (serverConfig, handler) => {
  if (!serverConfig || typeof serverConfig !== 'object') {
    throw new Error('server configuration must be provided');
  }

  if (typeof handler !== 'function') {
    throw new Error('handler must be a function');
  }

  const baseUrl = ensureUrl(serverConfig.url);
  const clientInfo = buildClientInfo(serverConfig.client);
  const clientOptions = {};

  if (serverConfig.capabilities && typeof serverConfig.capabilities === 'object') {
    clientOptions.capabilities = serverConfig.capabilities;
  }

  if (serverConfig.enforceStrictCapabilities === true) {
    clientOptions.enforceStrictCapabilities = true;
  }

  const transportOptions = buildTransportOptions(serverConfig);
  const transport = new StreamableHTTPClientTransport(baseUrl, Object.keys(transportOptions).length > 0 ? transportOptions : undefined);
  const client = new Client(clientInfo, clientOptions);

  try {
    await client.connect(transport);
    return await handler(client);
  } finally {
    await client.close();
  }
};

module.exports = {
  withMcpClient
};
