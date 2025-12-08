module.exports = async function messageRoute(fastify, opts) {
  const routePath = (opts && opts.routePath) || '/message/send';
  const swaggerTags = (opts && opts.swaggerTags) || ['messages'];
  const summary = (opts && opts.summary) || 'Message endpoint placeholder';

  fastify.route({
    method: 'POST',
    url: routePath,
    schema: {
      tags: swaggerTags,
      summary,
      description: 'Endpoint reserved for future message implementation.'
    },
    handler: async (request, reply) => {
      // Placeholder handler to indicate the endpoint is intentionally inactive.
      return reply.code(501).send({
        success: false,
        message: 'Message endpoint not implemented.'
      });
    }
  });
};
