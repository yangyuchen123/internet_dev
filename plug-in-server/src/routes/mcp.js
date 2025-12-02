const { withMcpClient } = require('../mcp/client');

const buildPaginatedParams = (operation) => {
  if (operation && typeof operation.params === 'object' && operation.params !== null) {
    return { ...operation.params };
  }

  if (typeof operation?.cursor === 'string' && operation.cursor.trim().length > 0) {
    return { cursor: operation.cursor.trim() };
  }

  return undefined;
};

const ensureToolParams = (operation) => {
  const params = operation && typeof operation.params === 'object' && operation.params !== null ? { ...operation.params } : {};

  if (!params.name && typeof operation?.name === 'string') {
    params.name = operation.name.trim();
  }

  if (!params.arguments && operation && typeof operation.arguments === 'object') {
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

const ensureReadResourceParams = (operation) => {
  const params = operation && typeof operation.params === 'object' && operation.params !== null ? { ...operation.params } : {};

  if (!params.uri && typeof operation?.uri === 'string') {
    params.uri = operation.uri.trim();
  }

  if (typeof params.uri !== 'string' || params.uri.trim().length === 0) {
    throw new Error('readResource requires a uri');
  }

  params.uri = params.uri.trim();

  return params;
};

const ensurePromptParams = (operation) => {
  const params = operation && typeof operation.params === 'object' && operation.params !== null ? { ...operation.params } : {};

  if (!params.name && typeof operation?.name === 'string') {
    params.name = operation.name.trim();
  }

  if (typeof params.name !== 'string' || params.name.trim().length === 0) {
    throw new Error('prompt operations require a name');
  }

  params.name = params.name.trim();

  if (!params.arguments && operation && typeof operation.arguments === 'object') {
    params.arguments = operation.arguments;
  }

  if (params.arguments && typeof params.arguments !== 'object') {
    throw new Error('prompt arguments must be an object if provided');
  }

  return params;
};

module.exports = async function mcpRoute(fastify, opts = {}) {
  const routePath = typeof opts.routePath === 'string' ? opts.routePath : '/mcp';
  const swaggerTags = Array.isArray(opts.swaggerTags) ? opts.swaggerTags : ['mcp'];
  const summary = typeof opts.summary === 'string' ? opts.summary : 'Proxy MCP operations to a remote server';

  fastify.route({
    method: 'POST',
    url: routePath,
    schema: {
      tags: swaggerTags,
      summary,
      body: {
        type: 'object',
        required: ['server', 'operation'],
        properties: {
          server: {
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
              protocolVersion: { type: 'string' }
            }
          },
          operation: {
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
          }
        }
      },
      response: {
        200: {
          allOf: [
            { $ref: 'ResponseSuccess#' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    operation: { type: 'string' }
                  },
                  additionalProperties: true
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseError#' },
        502: { $ref: 'ResponseError#' }
      }
    },
    handler: async (request, reply) => {
      const { server, operation } = request.body || {};

      if (!server || typeof server.url !== 'string' || server.url.trim().length === 0) {
        return reply.sendError('server.url is required', 400);
      }

      if (!operation || typeof operation.type !== 'string') {
        return reply.sendError('operation.type is required', 400);
      }

      try {
        const result = await withMcpClient(server, async (client) => {
          switch (operation.type) {
            case 'ping':
              return client.ping();
            case 'listTools':
              return client.listTools(buildPaginatedParams(operation));
            case 'callTool':
              return client.callTool(ensureToolParams(operation));
            case 'listResources':
              return client.listResources(buildPaginatedParams(operation));
            case 'readResource':
              return client.readResource(ensureReadResourceParams(operation));
            case 'listPrompts':
              return client.listPrompts(buildPaginatedParams(operation));
            case 'getPrompt':
              return client.getPrompt(ensurePromptParams(operation));
            default:
              throw new Error(`Unsupported MCP operation type: ${operation.type}`);
          }
        });

        return reply.sendSuccess({
          operation: operation.type,
          result
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'MCP operation failed');
        const message = error instanceof Error ? error.message : 'MCP operation failed';
        return reply.sendError(message, 502);
      }
    }
  });
};
