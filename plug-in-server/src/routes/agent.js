const { requireTrimmedString, optionalTrimmedString, parseBooleanFlag } = require('../utils/parsing');
const { ensurePositiveInteger } = require('../utils/validation');
const { ensureMysqlReady } = require('../utils/mysql');
const { fetchAgent, fetchAgentWithOwnership, mapAgentRow } = require('../utils/agentStore');

const ALLOWED_CONNECT_TYPES = new Set(['stream-http', 'sse']);

module.exports = async function agentRoute(fastify, opts = {}) {
  const basePath = typeof opts.routePath === 'string' ? opts.routePath : '/agent';
  const swaggerTags = Array.isArray(opts.swaggerTags) ? opts.swaggerTags : ['agents'];

  fastify.route({
    method: 'POST',
    url: `${basePath}/create`,
    schema: {
      tags: swaggerTags,
      summary: 'Create an agent',
      body: {
        type: 'object',
        required: ['name', 'category', 'userId'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', nullable: true },
          avatar: { type: 'string', nullable: true, maxLength: 255 },
          category: { type: 'string', minLength: 1, maxLength: 64 },
          url: { type: 'string', nullable: true, maxLength: 255 },
          connectType: { type: 'string', enum: ['stream-http', 'sse'], nullable: true },
          isTested: { type: 'boolean', nullable: true },
          isPublic: { type: 'boolean', nullable: true },
          userId: { type: 'integer', minimum: 1 }
        },
        additionalProperties: false
      },
      response: {
        201: {
          allOf: [
            { $ref: 'ResponseBase#' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    agent: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        description: { type: ['string', 'null'] },
                        avatar: { type: ['string', 'null'] },
                        category: { type: 'string' },
                        url: { type: ['string', 'null'] },
                        connectType: { type: 'string' },
                        isTested: { type: 'boolean' },
                        isPublic: { type: 'boolean' },
                        createdAt: { type: ['string', 'null'], format: 'date-time' },
                        updatedAt: { type: ['string', 'null'], format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      if (!ensureMysqlReady(fastify, reply)) {
        return;
      }

      const {
        name,
        description,
        avatar,
        category,
        url,
        connectType,
        isTested,
        isPublic,
        userId
      } = request.body || {};

      let normalizedName;
      let normalizedDescription;
      let normalizedAvatar;
      let normalizedCategory;
      let normalizedUrl;
      let normalizedConnectType = 'stream-http';
      let normalizedIsTested = false;
      let normalizedIsPublic = false;
      let normalizedUserId;

      try {
        normalizedName = requireTrimmedString(name, 'name', 255);
        normalizedDescription = optionalTrimmedString(description, 'description', 65535);
        normalizedAvatar = optionalTrimmedString(avatar, 'avatar', 255);
        normalizedCategory = requireTrimmedString(category, 'category', 64);
        normalizedUrl = optionalTrimmedString(url, 'url', 255);

        if (connectType !== undefined && connectType !== null) {
          if (typeof connectType !== 'string') {
            throw new Error('connectType must be a string');
          }

          const trimmedConnectType = connectType.trim();
          const lowered = trimmedConnectType.toLowerCase();

          if (!ALLOWED_CONNECT_TYPES.has(lowered)) {
            throw new Error('connectType must be one of stream-http, sse');
          }

          normalizedConnectType = lowered;
        }

        normalizedIsTested = parseBooleanFlag(isTested, 'isTested', false);
        normalizedIsPublic = parseBooleanFlag(isPublic, 'isPublic', false);
        normalizedUserId = ensurePositiveInteger(userId, 'userId');
      } catch (validationError) {
        const message = validationError instanceof Error ? validationError.message : 'Invalid payload';
        return reply.sendError(message, 400);
      }

      const connection = await fastify.mysql.getConnection();

      try {
        await connection.beginTransaction();

        const [insertResult] = await connection.execute(
          'INSERT INTO agent (name, description, avatar, category, url, connect_type, is_tested, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            normalizedName,
            normalizedDescription,
            normalizedAvatar,
            normalizedCategory,
            normalizedUrl,
            normalizedConnectType,
            normalizedIsTested ? 1 : 0,
            normalizedIsPublic ? 1 : 0
          ]
        );

        const agentId = insertResult && typeof insertResult.insertId === 'number' ? insertResult.insertId : null;

        if (!agentId) {
          throw new Error('Failed to obtain created agent id');
        }

        await connection.execute(
          'INSERT INTO user_agent (user_id, agent_id, is_owner) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE is_owner = 1',
          [normalizedUserId, agentId]
        );

        await connection.commit();

        const agent = await fetchAgent(fastify, agentId);

        if (!agent) {
          return reply.sendError('Failed to load created agent', 500);
        }

        return reply.sendSuccess({ agent }, 201, 'Agent created');
      } catch (error) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          fastify.log.error({ err: rollbackError }, 'Failed to rollback agent creation transaction');
        }

        fastify.log.error({ err: error }, 'Failed to create agent');

        if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
          return reply.sendError('User does not exist', 404);
        }

        return reply.sendError('Failed to create agent', 500);
      } finally {
        connection.release();
      }
    }
  });

  fastify.route({
    method: 'DELETE',
    url: `${basePath}/delete`,
    schema: {
      tags: swaggerTags,
      summary: 'Delete an agent',
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
        200: {
          allOf: [
            { $ref: 'ResponseBase#' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    agentId: { type: 'integer' }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        403: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      if (!ensureMysqlReady(fastify, reply)) {
        return;
      }

      const { agentId: rawAgentId, userId: rawUserId } = request.query || {};

      let agentId;
      let userId;

      try {
        agentId = ensurePositiveInteger(rawAgentId, 'agentId');
        userId = ensurePositiveInteger(rawUserId, 'userId');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid agentId';
        return reply.sendError(message, 400);
      }

      const { agent, isOwner } = await fetchAgentWithOwnership(fastify, agentId, userId);

      if (!agent) {
        return reply.sendError('Agent not found', 404);
      }

      if (!isOwner) {
        return reply.sendError('User does not own the agent', 403);
      }

      try {
        const result = await fastify.mysql.query('DELETE FROM agent WHERE id = ?', [agentId]);

        const affectedRows = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;

        if (affectedRows === 0) {
          return reply.sendError('Agent not found', 404);
        }

        return reply.sendSuccess({ agentId }, 200, 'Agent deleted');
      } catch (error) {
        fastify.log.error({ err: error, agentId, userId }, 'Failed to delete agent');

        if (error && error.code === 'ER_ROW_IS_REFERENCED_2') {
          return reply.sendError('Agent is referenced by other records', 409);
        }

        return reply.sendError('Failed to delete agent', 500);
      }
    }
  });

  fastify.route({
    method: 'POST',
    url: `${basePath}/test`,
    schema: {
      tags: swaggerTags,
      summary: 'Mark an agent as tested',
      body: {
        type: 'object',
        required: ['agentId', 'userId'],
        properties: {
          agentId: { type: 'integer', minimum: 1 },
          userId: { type: 'integer', minimum: 1 },
          isTested: { type: 'boolean', nullable: true }
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
                    agent: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        isTested: { type: 'boolean' },
                        updatedAt: { type: ['string', 'null'], format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        403: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      if (!ensureMysqlReady(fastify, reply)) {
        return;
      }

      const { agentId: rawAgentId, userId: rawUserId, isTested } = request.body || {};

      let agentId;
      let userId;
      let normalizedIsTested = true;

      try {
        agentId = ensurePositiveInteger(rawAgentId, 'agentId');
        userId = ensurePositiveInteger(rawUserId, 'userId');
        normalizedIsTested = parseBooleanFlag(isTested, 'isTested', true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid payload';
        return reply.sendError(message, 400);
      }

      const { agent: existingAgent, isOwner } = await fetchAgentWithOwnership(fastify, agentId, userId);

      if (!existingAgent) {
        return reply.sendError('Agent not found', 404);
      }

      if (!isOwner) {
        return reply.sendError('User does not own the agent', 403);
      }

      try {
        const result = await fastify.mysql.query(
          'UPDATE agent SET is_tested = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [normalizedIsTested ? 1 : 0, agentId]
        );

        const affectedRows = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;

        if (affectedRows === 0) {
          return reply.sendError('Agent not found', 404);
        }

        const agent = await fetchAgent(fastify, agentId);

        if (!agent) {
          return reply.sendError('Failed to load agent', 500);
        }

        return reply.sendSuccess({ agent }, 200, normalizedIsTested ? 'Agent marked as tested' : 'Agent marked as not tested');
      } catch (error) {
        fastify.log.error({ err: error, agentId, userId }, 'Failed to update agent testing status');
        return reply.sendError('Failed to update agent testing status', 500);
      }
    }
  });

  fastify.route({
    method: 'POST',
    url: `${basePath}/publish`,
    schema: {
      tags: swaggerTags,
      summary: 'Publish or unpublish an agent',
      body: {
        type: 'object',
        required: ['agentId', 'userId'],
        properties: {
          agentId: { type: 'integer', minimum: 1 },
          userId: { type: 'integer', minimum: 1 },
          isPublic: { type: 'boolean', nullable: true }
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
                    agent: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        isPublic: { type: 'boolean' },
                        updatedAt: { type: ['string', 'null'], format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        403: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      if (!ensureMysqlReady(fastify, reply)) {
        return;
      }

      const { agentId: rawAgentId, userId: rawUserId, isPublic } = request.body || {};

      let agentId;
      let userId;
      let normalizedIsPublic = true;

      try {
        agentId = ensurePositiveInteger(rawAgentId, 'agentId');
        userId = ensurePositiveInteger(rawUserId, 'userId');
        normalizedIsPublic = parseBooleanFlag(isPublic, 'isPublic', true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid payload';
        return reply.sendError(message, 400);
      }

      const { agent: existingAgent, isOwner } = await fetchAgentWithOwnership(fastify, agentId, userId);

      if (!existingAgent) {
        return reply.sendError('Agent not found', 404);
      }

      if (!isOwner) {
        return reply.sendError('User does not own the agent', 403);
      }

      try {
        const result = await fastify.mysql.query(
          'UPDATE agent SET is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [normalizedIsPublic ? 1 : 0, agentId]
        );

        const affectedRows = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;

        if (affectedRows === 0) {
          return reply.sendError('Agent not found', 404);
        }

        const agent = await fetchAgent(fastify, agentId);

        if (!agent) {
          return reply.sendError('Failed to load agent', 500);
        }

        return reply.sendSuccess({ agent }, 200, normalizedIsPublic ? 'Agent published' : 'Agent unpublished');
      } catch (error) {
        fastify.log.error({ err: error, agentId, userId }, 'Failed to update agent visibility');
        return reply.sendError('Failed to update agent visibility', 500);
      }
    }
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
                    relationship: {
                      type: 'object',
                      properties: {
                        agentId: { type: 'integer' },
                        userId: { type: 'integer' },
                        isOwner: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      if (!ensureMysqlReady(fastify, reply)) {
        return;
      }

      const { agentId: rawAgentId, userId: rawUserId, note } = request.body || {};

      let agentId;
      let userId;

      try {
        agentId = ensurePositiveInteger(rawAgentId, 'agentId');
        userId = ensurePositiveInteger(rawUserId, 'userId');

        if (note !== undefined && note !== null && typeof note !== 'string') {
          throw new Error('note must be a string when provided');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid payload';
        return reply.sendError(message, 400);
      }

      try {
        const agent = await fetchAgent(fastify, agentId);

        if (!agent) {
          return reply.sendError('Agent not found', 404);
        }

        await fastify.mysql.query(
          'INSERT INTO user_agent (user_id, agent_id, is_owner) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE is_owner = IF(is_owner = 1, 1, VALUES(is_owner))',
          [userId, agentId]
        );

        return reply.sendSuccess(
          {
            relationship: {
              agentId,
              userId,
              isOwner: false
            }
          },
          202,
          'Agent favorited'
        );
      } catch (error) {
        fastify.log.error({ err: error, agentId, userId }, 'Failed to favorite agent');

        if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
          return reply.sendError('User not found', 404);
        }

        return reply.sendError('Failed to favorite agent', 500);
      }
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
                    relationship: {
                      type: 'object',
                      properties: {
                        agentId: { type: 'integer' },
                        userId: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      if (!ensureMysqlReady(fastify, reply)) {
        return;
      }

      const { agentId: rawAgentId, userId: rawUserId } = request.query || {};

      let agentId;
      let userId;

      try {
        agentId = ensurePositiveInteger(rawAgentId, 'agentId');
        userId = ensurePositiveInteger(rawUserId, 'userId');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid payload';
        return reply.sendError(message, 400);
      }

      try {
        const result = await fastify.mysql.query(
          'DELETE FROM user_agent WHERE user_id = ? AND agent_id = ? AND is_owner = 0',
          [userId, agentId]
        );

        const affectedRows = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;

        if (affectedRows === 0) {
          return reply.sendError('Favorite relationship not found', 404);
        }

        return reply.sendSuccess(
          {
            relationship: {
              agentId,
              userId
            }
          },
          202,
          'Agent unfavorited'
        );
      } catch (error) {
        fastify.log.error({ err: error, agentId, userId }, 'Failed to unfavorite agent');
        return reply.sendError('Failed to unfavorite agent', 500);
      }
    }
  });

  fastify.route({
    method: 'GET',
    url: `${basePath}/public`,
    schema: {
      tags: swaggerTags,
      summary: 'List all public agents',
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
                    agents: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          description: { type: ['string', 'null'] },
                          avatar: { type: ['string', 'null'] },
                          category: { type: 'string' },
                          url: { type: ['string', 'null'] },
                          connectType: { type: 'string' },
                          isTested: { type: 'boolean' },
                          createdAt: { type: ['string', 'null'], format: 'date-time' },
                          updatedAt: { type: ['string', 'null'], format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (_request, reply) => {
      if (!ensureMysqlReady(fastify, reply)) {
        return;
      }

      try {
        const rows = await fastify.mysql.query(
          'SELECT id, name, description, avatar, category, url, connect_type, is_tested, is_public, created_at, updated_at FROM agent WHERE is_public = 1 ORDER BY updated_at DESC'
        );

        const agents = Array.isArray(rows) ? rows.map((row) => mapAgentRow(row)) : [];

        return reply.sendSuccess({ agents }, 200);
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to load public agents');
        return reply.sendError('Failed to load agents', 500);
      }
    }
  });

  fastify.route({
    method: 'GET',
    url: `${basePath}/list`,
    schema: {
      tags: swaggerTags,
      summary: 'List agents owned or favorited by a user',
      querystring: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'integer', minimum: 1 }
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
                    agents: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          description: { type: ['string', 'null'] },
                          avatar: { type: ['string', 'null'] },
                          category: { type: 'string' },
                          url: { type: ['string', 'null'] },
                          connectType: { type: 'string' },
                          isTested: { type: 'boolean' },
                          isPublic: { type: 'boolean' },
                          createdAt: { type: ['string', 'null'], format: 'date-time' },
                          updatedAt: { type: ['string', 'null'], format: 'date-time' },
                          isOwner: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      if (!ensureMysqlReady(fastify, reply)) {
        return;
      }

      let userId;

      try {
        userId = ensurePositiveInteger(request.query?.userId, 'userId');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid userId';
        return reply.sendError(message, 400);
      }

      try {
        const rows = await fastify.mysql.query(
          'SELECT a.id, a.name, a.description, a.avatar, a.category, a.url, a.connect_type, a.is_tested, a.is_public, a.created_at, a.updated_at, ua.is_owner FROM user_agent ua INNER JOIN agent a ON a.id = ua.agent_id WHERE ua.user_id = ? ORDER BY ua.is_owner DESC, a.updated_at DESC',
          [userId]
        );

        const agents = Array.isArray(rows)
          ? rows.map((row) => ({
              ...mapAgentRow(row),
              isOwner: Number(row.is_owner) === 1
            }))
          : [];

        return reply.sendSuccess({ agents }, 200);
      } catch (error) {
        fastify.log.error({ err: error, userId }, 'Failed to load user agents');
        return reply.sendError('Failed to load agents', 500);
      }
    }
  });
};
