module.exports = async function agentRoute(fastify, opts = {}) {
  const basePath = typeof opts.routePath === 'string' ? opts.routePath : '/agent';
  const swaggerTags = Array.isArray(opts.swaggerTags) ? opts.swaggerTags : ['agents'];

  const respondNotImplemented = (reply, action) =>
    reply.sendSuccess({ message: `Agent ${action} endpoint pending implementation` });

  fastify.route({
    method: 'POST',
    url: `${basePath}/create`,
    schema: {
      tags: swaggerTags,
      summary: 'Create an agent',
      body: {
        type: 'object',
        additionalProperties: true
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
                    message: { type: 'string' }
                  }
                }
              }
            }
          ]
        }
      }
    },
    handler: async (request, reply) => respondNotImplemented(reply, 'creation')
  });

  fastify.route({
    method: 'DELETE',
    url: `${basePath}/delete`,
    schema: {
      tags: swaggerTags,
      summary: 'Delete an agent',
      querystring: {
        type: 'object',
        required: ['agentId'],
        properties: {
          agentId: { type: 'integer', minimum: 1 }
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
                    message: { type: 'string' }
                  }
                }
              }
            }
          ]
        }
      }
    },
    handler: async (request, reply) => respondNotImplemented(reply, 'deletion')
  });

  fastify.route({
    method: 'POST',
    url: `${basePath}/test`,
    schema: {
      tags: swaggerTags,
      summary: 'Test an agent',
      body: {
        type: 'object',
        additionalProperties: true
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
                    message: { type: 'string' }
                  }
                }
              }
            }
          ]
        }
      }
    },
    handler: async (request, reply) => respondNotImplemented(reply, 'testing')
  });

  fastify.route({
    method: 'POST',
    url: `${basePath}/publish`,
    schema: {
      tags: swaggerTags,
      summary: 'Publish an agent',
      body: {
        type: 'object',
        additionalProperties: true
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
                    message: { type: 'string' }
                  }
                }
              }
            }
          ]
        }
      }
    },
    handler: async (request, reply) => respondNotImplemented(reply, 'publish')
  });

  fastify.route({
    method: 'POST',
    url: `${basePath}/favorite`,
    schema: {
      tags: swaggerTags,
      summary: 'Favorite an agent',
      body: {
        type: 'object',
        required: ['agentId', 'userId'],
        properties: {
          agentId: { type: 'integer', minimum: 1 },
          userId: { type: 'integer', minimum: 1 },
          note: { type: 'string', nullable: true, maxLength: 255 }
        },
        additionalProperties: false
      },
      response: {
        202: {
          allOf: [
            { $ref: 'ResponseBase#' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' }
                  }
                }
              }
            }
          ]
        }
      }
    },
    handler: async (request, reply) => {
      const { agentId, userId, note } = request.body || {};

      void agentId;
      void userId;
      void note;

      // TODO: implement agent favorite persistence logic
      return reply.sendSuccess({ message: 'Agent favorite endpoint pending implementation' }, 202);
    }
  });

  fastify.route({
    method: 'DELETE',
    url: `${basePath}/favorite`,
    schema: {
      tags: swaggerTags,
      summary: 'Unfavorite an agent',
      querystring: {
        type: 'object',
        required: ['agentId', 'userId'],
        properties: {
          agentId: { type: 'integer', minimum: 1 },
          userId: { type: 'integer', minimum: 1 }
        },
        additionalProperties: false
      },
      response: {
        202: {
          allOf: [
            { $ref: 'ResponseBase#' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' }
                  }
                }
              }
            }
          ]
        }
      }
    },
    handler: async (request, reply) => {
      const { agentId, userId } = request.query || {};

      void agentId;
      void userId;

      // TODO: implement agent unfavorite persistence logic
      return reply.sendSuccess({ message: 'Agent unfavorite endpoint pending implementation' }, 202);
    }
  });
};
