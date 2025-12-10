require('dotenv').config();

const { buildServer } = require('./src/buildServer');
const { loadConfig } = require('./src/config');
const { verifyTable } = require('./src/startup/verifyTable');
const { startDeepseekServer } = require('./agents/deepseek/server');
const { startSensorServer } = require('./agents/sensor/server');

const start = async () => {
  const app = buildServer();
  const config = loadConfig();
  const { port, host, deepseekServer, sensorServer } = config;
  let deepseekApp;
  let sensorApp;

  try {
    await app.ready();
    await verifyTable(app);
    if (deepseekServer?.enabled) {
      deepseekApp = await startDeepseekServer({
        host: deepseekServer.host,
        port: deepseekServer.port
      });
    }

    if (sensorServer?.enabled) {
        sensorApp = await startSensorServer({
        host: sensorServer.host,
        port: sensorServer.port
      });
    }

    const address = await app.listen({ port, host });
    app.log.info({ address }, 'Plugin server listening');

    const shutdown = async (signal) => {
      app.log.info({ signal }, 'Shutting down servers');

      try {
        await app.close();
      } catch (mainCloseError) {
        app.log.error(mainCloseError, 'Failed to close plugin server');
      }

      if (deepseekApp) {
        try {
          await deepseekApp.close();
        } catch (deepseekCloseError) {
          app.log.error(deepseekCloseError, 'Failed to close deepseek server');
        }
      }


      if (sensorApp) {
        try {
          await sensorApp.close();
        } catch (sensorCloseError) {
          app.log.error(sensorCloseError, 'Failed to close sensor server');
        }
      }

      process.exit(0);
    };

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
      process.once(signal, () => shutdown(signal));
    });
  } catch (error) {
    app.log.error(error, 'Failed to start server');

    if (deepseekApp) {
      try {
        await deepseekApp.close();
      } catch (deepseekCloseError) {
        app.log.error(deepseekCloseError, 'Failed to close deepseek server after startup failure');
      }
    }

    if (sensorApp) {
      try {
        await sensorApp.close();
      } catch (sensorCloseError) {
        app.log.error(sensorCloseError, 'Failed to close sensor server after startup failure');
      }
    }

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
