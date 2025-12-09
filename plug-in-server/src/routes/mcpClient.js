const { McpClient } = require('../mcp/client');

const SERVER_SCHEMA = {
  type: 'object',
  required: ['url'],
  properties: {
    url: { type: 'string', minLength: 1 },
    headers: {
      type: 'object',
      additionalProperties: { type: ['string', 'number', 'boolean'] }
    },
    bearerToken: { type: 'string' },
    client: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        version: { type: 'string' }
      }
    },
    capabilities: { type: 'object' },
    sessionId: { type: 'string' },
    protocolVersion: { type: 'string' },
    reconnectionOptions: { type: 'object' },
    auth: { type: 'object' },
    defaultTaskPollInterval: { type: 'number' },
    maxTaskQueueSize: { type: 'number' },
    debouncedNotificationMethods: {
      type: 'array',
      items: { type: 'string' }
    },
    retryInterval: { type: 'number' }
  }
};

const OPERATION_SCHEMA = {
  type: 'object',
  required: ['type'],
  properties: {
    type: {
      type: 'string',
      enum: ['ping', 'listTools', 'callTool', 'listResources', 'readResource', 'listPrompts', 'getPrompt']
    },
    params: { type: 'object' },
    cursor: { type: 'string' },
    name: { type: 'string' },
    arguments: { type: 'object' },
    uri: { type: 'string' }
  }
};

const buildRoutePath = (base, suffix) => (base.endsWith('/') ? `${base}${suffix}` : `${base}/${suffix}`);

const clients = new Map();

const getClientRecord = (clientId) => {
  if (typeof clientId !== 'string' || clientId.trim().length === 0) {
    throw new Error('clientId must be a non-empty string');
  }

  const record = clients.get(clientId.trim());
  if (!record) {
    const error = new Error(`MCP client '${clientId}' is not connected`);
    error.statusCode = 404;
    throw error;
  }

  return record;
};

const disconnectClientRecord = async (clientId) => {
  const record = clients.get(clientId);
  if (!record) {
    return;
  }

  try {
    await record.client.disconnect();
  } catch (error) {
    // Ignore disconnect errors to keep cleanup resilient.
  }

  clients.delete(clientId);
};

module.exports = async function mcpClientRoute(fastify, opts = {}) {
  const routePath = typeof opts.routePath === 'string' ? opts.routePath : '/mcp-client';
  const swaggerTags = Array.isArray(opts.swaggerTags) ? opts.swaggerTags : ['mcp-client'];
  const summary = typeof opts.summary === 'string' ? opts.summary : 'Manage persistent MCP client sessions';

  fastify.addHook('onClose', async () => {
    const disconnectPromises = [];
    for (const clientId of clients.keys()) {
      disconnectPromises.push(disconnectClientRecord(clientId));
    }
    await Promise.allSettled(disconnectPromises);
  });

  fastify.route({
    method: 'POST',
    url: buildRoutePath(routePath, 'connect'),
    schema: {
      tags: swaggerTags,
      summary: 'Create or replace a persistent MCP client connection',
      body: {
        type: 'object',
        required: ['clientId', 'server'],
        properties: {
          clientId: { type: 'string', minLength: 1 },
          server: SERVER_SCHEMA,
          initialize: {
            type: 'object',
            properties: {
              continueOnError: { type: 'boolean' },
              operations: {
                type: 'array',
                items: OPERATION_SCHEMA,
                minItems: 1
              }
            }
          }
        }
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
                    clientId: { type: 'string' },
                    connection: { type: 'object' },
                    initialization: { type: 'object' }
                  },
                  required: ['clientId', 'connection'],
                  additionalProperties: true
                }
              },
              additionalProperties: true
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        502: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      const { clientId, server, initialize } = request.body || {};

      if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
        return reply.sendError('clientId is required', 400);
      }

      if (!server || typeof server !== 'object') {
        return reply.sendError('server configuration is required', 400);
      }

      const trimmedClientId = clientId.trim();

      await disconnectClientRecord(trimmedClientId);

      const client = new McpClient(server);

      try {
        await client.connect();

        let initializationResult;
        if (initialize && Array.isArray(initialize.operations) && initialize.operations.length > 0) {
          initializationResult = await client.executeOperations(initialize.operations, {
            continueOnError: initialize.continueOnError === true
          });
        }

        clients.set(trimmedClientId, { client, serverConfig: server });

        return reply.sendSuccess({
          clientId: trimmedClientId,
          connection: client.getConnectionInfo(),
          ...(initializationResult ? { initialization: initializationResult } : {})
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'MCP client connect failed');
        await client.disconnect().catch(() => {});
        return reply.sendError(error instanceof Error ? error.message : 'MCP client connect failed', 502);
      }
    }
  });

  fastify.route({
    method: 'POST',
    url: buildRoutePath(routePath, ':clientId/disconnect'),
    schema: {
      tags: swaggerTags,
      summary: 'Disconnect a persistent MCP client connection',
      params: {
        type: 'object',
        properties: {
          clientId: { type: 'string', minLength: 1 }
        },
        required: ['clientId']
      }
    },
    handler: async (request, reply) => {
      const { clientId } = request.params;
      await disconnectClientRecord(clientId.trim());
      return reply.sendSuccess({ clientId: clientId.trim(), disconnected: true });
    }
  });

  fastify.route({
    method: 'GET',
    url: routePath,
    schema: {
      tags: swaggerTags,
      summary,
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
                    clients: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          clientId: { type: 'string' },
                          connected: { type: 'boolean' }
                        },
                        required: ['clientId', 'connected']
                      }
                    }
                  },
                  required: ['clients']
                }
              }
            }
          ]
        }
      }
    },
    handler: async (_request, reply) => {
      const data = [];
      for (const [clientId, record] of clients.entries()) {
        data.push({ clientId, connected: record.client.isConnected() });
      }
      return reply.sendSuccess({ clients: data });
    }
  });

  fastify.route({
    method: 'GET',
    url: buildRoutePath(routePath, ':clientId/info'),
    schema: {
      tags: swaggerTags,
      summary: 'Fetch connection info for a persistent MCP client',
      params: {
        type: 'object',
        properties: {
          clientId: { type: 'string', minLength: 1 }
        },
        required: ['clientId']
      }
    },
    handler: async (request, reply) => {
      const { clientId } = request.params;

      try {
        const record = getClientRecord(clientId);
        return reply.sendSuccess({ clientId: clientId.trim(), connection: record.client.getConnectionInfo() });
      } catch (error) {
        const statusCode = error.statusCode ?? 502;
        return reply.sendError(error.message, statusCode);
      }
    }
  });

  fastify.route({
    method: 'POST',
    url: buildRoutePath(routePath, ':clientId/operation'),
    schema: {
      tags: swaggerTags,
      summary: 'Execute a single MCP operation using a persistent client',
      params: {
        type: 'object',
        properties: {
          clientId: { type: 'string', minLength: 1 }
        },
        required: ['clientId']
      },
      body: {
        type: 'object',
        required: ['operation'],
        properties: {
          operation: OPERATION_SCHEMA
        }
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
                    clientId: { type: 'string' },
                    operation: { type: 'string' },
                    result: {}
                  },
                  required: ['clientId', 'operation', 'result']
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        502: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      const { clientId } = request.params;
      const { operation } = request.body || {};

      try {
        const record = getClientRecord(clientId);
        const result = await record.client.executeOperation(operation);
        return reply.sendSuccess({
          clientId: clientId.trim(),
          operation: operation.type,
          result
        });
      } catch (error) {
        const statusCode = error.statusCode ?? 502;
        fastify.log.error({ err: error }, 'MCP client operation failed');
        return reply.sendError(error.message, statusCode);
      }
    }
  });

  fastify.route({
    method: 'POST',
    url: buildRoutePath(routePath, ':clientId/operations'),
    schema: {
      tags: swaggerTags,
      summary: 'Execute multiple MCP operations using a persistent client',
      params: {
        type: 'object',
        properties: {
          clientId: { type: 'string', minLength: 1 }
        },
        required: ['clientId']
      },
      body: {
        type: 'object',
        required: ['operations'],
        properties: {
          operations: {
            type: 'array',
            items: OPERATION_SCHEMA,
            minItems: 1
          },
          continueOnError: { type: 'boolean' }
        }
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
                    clientId: { type: 'string' },
                    operationsCount: { type: 'integer' },
                    results: { type: 'array' },
                    errors: { type: 'array' }
                  },
                  required: ['clientId', 'operationsCount', 'results', 'errors']
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        502: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      const { clientId } = request.params;
      const { operations, continueOnError } = request.body || {};

      try {
        const record = getClientRecord(clientId);
        const execution = await record.client.executeOperations(operations, {
          continueOnError: continueOnError === true
        });
        return reply.sendSuccess({ clientId: clientId.trim(), ...execution });
      } catch (error) {
        const statusCode = error.statusCode ?? 502;
        fastify.log.error({ err: error }, 'MCP client operations failed');
        return reply.sendError(error.message, statusCode);
      }
    }
  });
};