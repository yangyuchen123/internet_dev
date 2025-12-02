const fp = require('fastify-plugin');

module.exports = fp((fastify, opts = {}) => {
  const successKey = opts.successKey || 'data';
  const errorKey = opts.errorKey || 'message';

  fastify.decorateReply('sendSuccess', function sendSuccess(payload = null, statusCode = 200) {
    this.code(statusCode);
    return this.send({
      success: true,
      [successKey]: payload
    });
  });

  fastify.decorateReply('sendError', function sendError(message, statusCode = 400) {
    this.code(statusCode);
    return this.send({
      success: false,
      error: {
        [errorKey]: message
      }
    });
  });

  fastify.addSchema({
    $id: 'ResponseSuccess',
    type: 'object',
    properties: {
      success: { type: 'boolean', const: true },
      [successKey]: {}
    },
    required: ['success']
  });

  fastify.addSchema({
    $id: 'ResponseError',
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          [errorKey]: { type: 'string' }
        }
      }
    },
    required: ['success']
  });
});
