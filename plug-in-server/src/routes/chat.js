module.exports = async function chatRoute(fastify, opts) {
  const routePath = (opts && opts.routePath) || '/chat';
  const swaggerTags = (opts && opts.swaggerTags) || ['openai'];
  const summarize = (opts && opts.summary) || 'Chat with OpenAI-compatible model';

  fastify.route({
    method: 'POST',
    url: routePath,
    schema: {
      tags: swaggerTags,
      summary: summarize,
      body: {
        type: 'object',
        required: ['messages'],
        properties: {
          messages: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['role', 'content'],
              properties: {
                role: { type: 'string', enum: ['system', 'user', 'assistant', 'tool'] },
                content: { type: 'string' }
              }
            }
          },
          provider: { type: 'string', enum: ['gpt', 'deepseek'] },
          model: { type: 'string' },
          temperature: { type: 'number', minimum: 0, maximum: 2, default: 0.7 },
          maxTokens: { type: 'integer', minimum: 1 }
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
                    role: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          ]
        },
        400: { $ref: 'ResponseError#' },
        502: { $ref: 'ResponseError#' },
        503: { $ref: 'ResponseError#' }
      }
    },
    handler: async (request, reply) => {
      const { messages, provider, model, temperature, maxTokens } = request.body || {};

      if (!Array.isArray(messages) || messages.length === 0) {
        return reply.sendError('messages must be a non-empty array', 400);
      }

      const client = fastify.getOpenAIClient ? fastify.getOpenAIClient(provider) : fastify.openAIClient;

      if (!client) {
        return reply.sendError('Requested provider is not configured', 503);
      }

      const resolvedProvider = provider || fastify.openAISettings?.defaultProvider;
      const resolvedModel =
        model ||
        fastify.openAISettings?.defaultModelByProvider?.[resolvedProvider] ||
        client.defaultModel;

      try {
        const response = await client.chat({
          messages,
          model: resolvedModel,
          temperature,
          maxTokens
        });

        return reply.sendSuccess({
          role: response.role,
          message: response.content
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.sendError('Chat request failed', 502);
      }
    }
  });
};
