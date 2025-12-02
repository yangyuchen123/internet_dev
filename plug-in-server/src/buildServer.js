const fastifyFactory = require('fastify');
const registerCors = require('@fastify/cors');
const registerSwagger = require('@fastify/swagger');
const registerSwaggerUI = require('@fastify/swagger-ui');
const responderPlugin = require('./plugins/responder');
const openAIPlugin = require('./plugins/openai');
const { registerRoutes } = require('./routes');

const buildServer = ({ fastifyOptions } = {}) => {
  const app = fastifyFactory({
    logger: true,
    ...(fastifyOptions || {})
  });

  app.register(registerCors, {
    origin: true
  });

  app.register(registerSwagger, {
    mode: 'dynamic',
    openapi: {
      info: {
        title: 'Plugin Server API',
        description: 'REST API proxying chat requests to OpenAI',
        version: '0.1.0'
      }
    },
    refResolver: {
      buildLocalReference(json, baseUri, fragment, index) {
        return json.$id || `def-${index}`;
      }
    }
  });

  app.register(registerSwaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });

  app.register(responderPlugin);
  app.register(openAIPlugin);
  app.register(registerRoutes);

  return app;
};

module.exports = {
  buildServer
};
