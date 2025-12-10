const ensureMysqlReady = (fastify, reply) => {
  if (!fastify.mysql || typeof fastify.mysql.query !== 'function') {
    reply.sendError('Database is not configured', 503);
    return false;
  }

  return true;
};

module.exports = {
  ensureMysqlReady
};
