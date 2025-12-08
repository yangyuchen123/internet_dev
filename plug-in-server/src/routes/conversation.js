const { ensureJson, parseJsonColumn, normalizeDate } = require('../utils/serialization');
module.exports = async function conversationRoute(fastify, opts = {}) {
  const basePath = typeof opts.routePath === 'string' ? opts.routePath : '/conversation';
  const swaggerTags = Array.isArray(opts.swaggerTags) ? opts.swaggerTags : ['conversation'];

  fastify.route({
    method: 'POST',
    url: `${basePath}/create`,
    schema: {
      tags: swaggerTags,
      summary: 'Create a conversation',
      body: {
        type: 'object',
        required: ['userId', 'model'],
        properties: {
          agentIds: {
            type: 'array',
            nullable: true,
            minItems: 1,
            items: { type: 'integer', minimum: 1 }
          },
          mainAgent: { type: 'integer', minimum: 1, nullable: true },
          userId: { type: 'integer', minimum: 1 },
          title: { type: 'string', maxLength: 255 },
          metadata: { type: 'object', nullable: true, additionalProperties: true },
          messages: {
            type: 'array',
            nullable: true,
            minItems: 1,
            items: {
              type: 'object',
              required: ['role', 'content'],
              properties: {
                role: { type: 'string' },
                content: { type: 'string' }
              }
            }
          },
          provider: { type: 'string', nullable: true },
          model: { type: 'string', minLength: 1 },
          temperature: { type: 'number', minimum: 0, maximum: 2, nullable: true },
          maxTokens: { type: 'integer', minimum: 1, nullable: true }
        }
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
                    conversation: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        mainAgent: { type: ['integer', 'null'] },
                        agentIds: {
                          type: 'array',
                          items: { type: 'integer' },
                          nullable: true
                        },
                        title: { type: ['string', 'null'] },
                        metadata: {},
                        provider: { type: ['string', 'null'] },
                        model: { type: ['string', 'null'] },
                        temperature: { type: ['number', 'null'] },
                        maxTokens: { type: ['integer', 'null'] },
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
        404: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      const {
        agentIds,
        mainAgent,
        userId,
        title,
        metadata,
        messages,
        provider,
        model,
        temperature,
        maxTokens
      } = request.body || {};

      if (userId === undefined || userId === null) {
        return reply.sendError('userId is required', 400);
      }

      if (!fastify.mysql || typeof fastify.mysql.query !== 'function') {
        return reply.sendError('Database is not configured', 503);
      }

      const normalizedAgentIds = [];
      const seenAgentIds = new Set();

      let normalizedMainAgent = null;
      if (mainAgent !== undefined && mainAgent !== null) {
        const parsedMainAgent = Number(mainAgent);
        if (!Number.isInteger(parsedMainAgent) || parsedMainAgent <= 0) {
          return reply.sendError('mainAgent must be a positive integer when provided', 400);
        }
        normalizedMainAgent = parsedMainAgent;
        seenAgentIds.add(normalizedMainAgent);
      }

      const addAgentId = (candidate) => {
        if (!seenAgentIds.has(candidate)) {
          seenAgentIds.add(candidate);
          normalizedAgentIds.push(candidate);
        }
      };

      if (agentIds !== undefined && agentIds !== null) {
        if (!Array.isArray(agentIds)) {
          return reply.sendError('agentIds must be an array when provided', 400);
        }
        if (agentIds.length === 0) {
          return reply.sendError('agentIds must contain at least one entry when provided', 400);
        }

        for (const value of agentIds) {
          const parsed = Number(value);
          if (!Number.isInteger(parsed) || parsed <= 0) {
            return reply.sendError('agentIds must contain positive integers', 400);
          }
          addAgentId(parsed);
        }
      }

      const normalizedUserId = Number(userId);

      if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
        return reply.sendError('userId must be a positive integer', 400);
      }

      const normalizedTitle = typeof title === 'string' && title.trim().length > 0 ? title.trim() : null;

      let normalizedProvider = null;
      if (provider !== undefined && provider !== null) {
        if (typeof provider !== 'string') {
          return reply.sendError('provider must be a string', 400);
        }
        const trimmedProvider = provider.trim();
        normalizedProvider = trimmedProvider.length > 0 ? trimmedProvider : null;
      }

      if (model === undefined || model === null) {
        return reply.sendError('model is required', 400);
      }

      if (typeof model !== 'string') {
        return reply.sendError('model must be a string', 400);
      }

      const trimmedModel = model.trim();

      if (trimmedModel.length === 0) {
        return reply.sendError('model must be a non-empty string', 400);
      }

      const normalizedModel = trimmedModel;

      let normalizedTemperature = null;
      if (temperature !== undefined && temperature !== null) {
        const parsedTemperature = Number(temperature);
        if (Number.isNaN(parsedTemperature)) {
          return reply.sendError('temperature must be a number', 400);
        }
        if (parsedTemperature < 0 || parsedTemperature > 2) {
          return reply.sendError('temperature must be between 0 and 2', 400);
        }
        normalizedTemperature = Number(parsedTemperature.toFixed(2));
      }

      let normalizedMaxTokens = null;
      if (maxTokens !== undefined && maxTokens !== null) {
        const parsedMaxTokens = Number(maxTokens);
        if (!Number.isInteger(parsedMaxTokens) || parsedMaxTokens <= 0) {
          return reply.sendError('maxTokens must be a positive integer', 400);
        }
        normalizedMaxTokens = parsedMaxTokens;
      }

      let metadataPayload = metadata;

      if (metadataPayload === undefined && messages !== undefined) {
        metadataPayload = { messages };
      }

      let metadataJson;

      try {
        metadataJson = ensureJson(metadataPayload, 'metadata');
      } catch (error) {
        return reply.sendError(error.message, 400);
      }

      try {
        const result = await fastify.mysql.query(
          'INSERT INTO conversation (creator_id, title, metadata, provider, model, temperature, max_tokens, main_agent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            normalizedUserId,
            normalizedTitle,
            metadataJson,
            normalizedProvider,
            normalizedModel,
            normalizedTemperature,
            normalizedMaxTokens,
            normalizedMainAgent
          ]
        );

        const conversationId = result && typeof result.insertId === 'number' ? result.insertId : null;

        if (!conversationId) {
          return reply.sendError('Failed to determine created conversation id', 500);
        }

        if (normalizedAgentIds.length > 0) {
          try {
            for (const agentIdValue of normalizedAgentIds) {
              await fastify.mysql.query(
                'INSERT INTO agent_conversation (agent_id, conversation_id) VALUES (?, ?)',
                [agentIdValue, conversationId]
              );
            }
          } catch (linkError) {
            await fastify.mysql.query('DELETE FROM agent_conversation WHERE conversation_id = ?', [conversationId]);
            await fastify.mysql.query('DELETE FROM conversation WHERE id = ?', [conversationId]);
            throw linkError;
          }
        }

        const rows = await fastify.mysql.query(
          'SELECT id, creator_id, title, metadata, provider, model, temperature, max_tokens, main_agent_id, created_at, updated_at FROM conversation WHERE id = ? LIMIT 1',
          [conversationId]
        );

        if (!Array.isArray(rows) || rows.length === 0) {
          return reply.sendError('Failed to load created conversation', 500);
        }

        const row = rows[0];

        let linkedAgentIds = [];
        if (normalizedAgentIds.length > 0) {
          const agentLinkRows = await fastify.mysql.query(
            'SELECT agent_id FROM agent_conversation WHERE conversation_id = ? ORDER BY agent_id ASC',
            [conversationId]
          );
          if (Array.isArray(agentLinkRows) && agentLinkRows.length > 0) {
            linkedAgentIds = agentLinkRows.map((link) => Number(link.agent_id));
          } else {
            linkedAgentIds = normalizedAgentIds;
          }
        }

        const mainAgentIdResponse =
          row.main_agent_id === undefined || row.main_agent_id === null
            ? null
            : Number(row.main_agent_id);

        if (mainAgentIdResponse !== null && !linkedAgentIds.includes(mainAgentIdResponse)) {
          linkedAgentIds = [mainAgentIdResponse, ...linkedAgentIds];
        }

        const conversationIdResponse = Number(row.id);
        const userIdResponse = Number(row.creator_id);

        return reply.sendSuccess(
          {
            conversation: {
              id: conversationIdResponse,
              userId: userIdResponse,
              mainAgent: mainAgentIdResponse,
              agentIds: linkedAgentIds,
              title: row.title || null,
              metadata: parseJsonColumn(row.metadata),
              provider: row.provider || null,
              model: row.model || null,
              temperature:
                row.temperature === undefined || row.temperature === null ? null : Number(row.temperature),
              maxTokens:
                row.max_tokens === undefined || row.max_tokens === null ? null : Number(row.max_tokens),
              createdAt: normalizeDate(row.created_at),
              updatedAt: normalizeDate(row.updated_at)
            }
          },
          201
        );
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to create conversation');

        if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
          const message = typeof error.sqlMessage === 'string' ? error.sqlMessage : '';
          if (message.includes('agent_id')) {
            return reply.sendError('Agent does not exist', 404);
          }
          if (message.includes('main_agent_id')) {
            return reply.sendError('Agent does not exist', 404);
          }
          if (message.includes('creator_id')) {
            return reply.sendError('User does not exist', 404);
          }
          return reply.sendError('Related record does not exist', 404);
        }

        return reply.sendError('Failed to create conversation', 500);
      }
    }
  });

  fastify.route({
    method: 'GET',
    url: `${basePath}/list`,
    schema: {
      tags: swaggerTags,
      summary: 'List conversations for a user',
      querystring: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'integer', minimum: 1 }
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
                    conversations: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          userId: { type: 'integer' },
                          mainAgent: { type: ['integer', 'null'] },
                          agentIds: {
                            type: 'array',
                            items: { type: 'integer' },
                            nullable: true
                          },
                          title: { type: ['string', 'null'] },
                          metadata: {},
                          provider: { type: ['string', 'null'] },
                          model: { type: ['string', 'null'] },
                          temperature: { type: ['number', 'null'] },
                          maxTokens: { type: ['integer', 'null'] },
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
        400: { $ref: 'ResponseBase#' },
        404: { $ref: 'ResponseBase#' },
        503: { $ref: 'ResponseBase#' }
      }
    },
    handler: async (request, reply) => {
      const { userId } = request.query || {};

      if (!fastify.mysql || typeof fastify.mysql.query !== 'function') {
        return reply.sendError('Database is not configured', 503);
      }

      const normalizedUserId = Number(userId);

      if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
        return reply.sendError('userId must be a positive integer', 400);
      }

      try {
        const rows = await fastify.mysql.query(
          'SELECT id, creator_id, title, metadata, provider, model, temperature, max_tokens, main_agent_id, created_at, updated_at FROM conversation WHERE creator_id = ? ORDER BY created_at DESC',
          [normalizedUserId]
        );

        let agentLinksMap = new Map();
        if (Array.isArray(rows) && rows.length > 0) {
          const conversationIds = rows.map((row) => Number(row.id));
          const placeholders = conversationIds.map(() => '?').join(', ');

          if (placeholders.length > 0) {
            const agentLinkRows = await fastify.mysql.query(
              `SELECT conversation_id, agent_id FROM agent_conversation WHERE conversation_id IN (${placeholders}) ORDER BY conversation_id, agent_id`,
              conversationIds
            );

            if (Array.isArray(agentLinkRows)) {
              for (const link of agentLinkRows) {
                const conversationId = Number(link.conversation_id);
                const agentIdValue = Number(link.agent_id);
                if (!agentLinksMap.has(conversationId)) {
                  agentLinksMap.set(conversationId, []);
                }
                agentLinksMap.get(conversationId).push(agentIdValue);
              }
            }
          }
        }

        const conversations = Array.isArray(rows)
          ? rows.map((row) => {
              const conversationId = Number(row.id);
              const linkedAgents = agentLinksMap.get(conversationId) || [];
              const mainAgentId =
                row.main_agent_id === undefined || row.main_agent_id === null
                  ? null
                  : Number(row.main_agent_id);

              const normalizedAgentIdsForConversation = [];

              if (mainAgentId !== null) {
                normalizedAgentIdsForConversation.push(mainAgentId);
              }

              for (const agentIdValue of linkedAgents) {
                if (agentIdValue !== mainAgentId) {
                  normalizedAgentIdsForConversation.push(agentIdValue);
                }
              }

              const mainAgentResponse = mainAgentId;

              return {
                id: conversationId,
                userId: Number(row.creator_id),
                mainAgent: mainAgentResponse,
                agentIds: normalizedAgentIdsForConversation,
                title: row.title || null,
                metadata: parseJsonColumn(row.metadata),
                provider: row.provider || null,
                model: row.model || null,
                temperature:
                  row.temperature === undefined || row.temperature === null
                    ? null
                    : Number(row.temperature),
                maxTokens:
                  row.max_tokens === undefined || row.max_tokens === null ? null : Number(row.max_tokens),
                createdAt: normalizeDate(row.created_at),
                updatedAt: normalizeDate(row.updated_at)
              };
            })
          : [];

        return reply.sendSuccess({ conversations });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to list conversations');
        return reply.sendError('Failed to list conversations', 500);
      }
    }
  });

  fastify.route({
    method: 'DELETE',
    url: `${basePath}/delete`,
    schema: {
      tags: swaggerTags,
      summary: 'Delete a conversation',
      querystring: {
        type: 'object',
        required: ['conversationId'],
        properties: {
          conversationId: { type: 'integer', minimum: 1 }
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
                    id: { type: 'integer' },
                    deleted: { type: 'boolean' }
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
      const { conversationId } = request.query || {};

      if (!fastify.mysql || typeof fastify.mysql.query !== 'function') {
        return reply.sendError('Database is not configured', 503);
      }

      const normalizedId = Number(conversationId);

      if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        return reply.sendError('conversationId must be a positive integer', 400);
      }

      try {
        await fastify.mysql.query('DELETE FROM agent_conversation WHERE conversation_id = ?', [normalizedId]);
        const result = await fastify.mysql.query('DELETE FROM conversation WHERE id = ?', [normalizedId]);
        const affected = result && typeof result.affectedRows === 'number' ? result.affectedRows : 0;

        if (affected === 0) {
          return reply.sendError('Conversation not found', 404);
        }

        return reply.sendSuccess({ id: normalizedId, deleted: true });
      } catch (error) {
        fastify.log.error({ err: error }, 'Failed to delete conversation');
        return reply.sendError('Failed to delete conversation', 500);
      }
    }
  });
};
