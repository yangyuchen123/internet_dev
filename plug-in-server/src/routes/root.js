module.exports = async function rootRoute(fastify) {
  fastify.get('/', {
    schema: {
      summary: 'Health check',
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
                    status: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          ]
        }
      }
    }
  }, async (request, reply) => reply.sendSuccess({
    status: 'ok',
    message: 'Fastify server is running'
  }));
};
