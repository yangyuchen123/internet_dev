require('dotenv').config();

const { buildServer } = require('./src/buildServer');
const { loadConfig } = require('./src/config');

const start = async () => {
  const app = buildServer();
  const { port, host } = loadConfig();

  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = {
  buildServer,
  start
};
