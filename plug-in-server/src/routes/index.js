const rootRoute = require('./root');
const messageRoute = require('./chat');
const mcpRoute = require('./mcp');
const conversationRoute = require('./conversation');
const agentRoute = require('./agent');

const registerRoutes = async (fastify) => {
  await fastify.register(rootRoute);
  await fastify.register(messageRoute, {
    routePath: '/message/send',
    swaggerTags: ['messages'],
    summary: 'Send message with OpenAI-compatible model'
  });
  await fastify.register(conversationRoute, {
    routePath: '/conversation',
    swaggerTags: ['conversation'],
    summary: 'Manage conversations'
  });
  await fastify.register(agentRoute, {
    routePath: '/agent',
    swaggerTags: ['agents'],
    summary: 'Manage agents'
  });
  await fastify.register(mcpRoute, {
    routePath: '/mcp',
    swaggerTags: ['mcp'],
    summary: 'Proxy MCP operations to a remote server'
  });
};

module.exports = {
  registerRoutes
};
