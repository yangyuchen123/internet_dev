const loadConfig = () => ({
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  deepseekServer: {
    enabled: process.env.DEEPSEEK_SERVER_ENABLED !== 'false',
    port: Number(process.env.DEEPSEEK_SERVER_PORT) || 3100,
    host: process.env.DEEPSEEK_SERVER_HOST || 'localhost'
  },
  sensorServer: {
      enabled: process.env.SENSOR_SERVER_ENABLED !== 'false',
      port: Number(process.env.SENSOR_SERVER_PORT) || 3200,
      host: process.env.SENSOR_SERVER_HOST || 'localhost',
  }
});

module.exports = {
  loadConfig
};
