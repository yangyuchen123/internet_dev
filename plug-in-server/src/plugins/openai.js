const fp = require('fastify-plugin');
const path = require('path');
const fs = require('fs/promises');
const { OpenAI } = require('openai');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', 'config', 'models.json');

const loadModelConfig = async (configPath, log) => {
  try {
    const fileContents = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(fileContents);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Model configuration must be a JSON object');
    }

    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      log.warn({ configPath }, 'Model configuration file not found; skipping provider setup');
      return { providers: {} };
    }

    log.error({ err: error, configPath }, 'Failed to load model configuration');
    return { providers: {} };
  }
};

const resolveApiKey = (providerName, providerConfig, log) => {
  if (providerConfig.apiKey && typeof providerConfig.apiKey === 'string') {
    return providerConfig.apiKey.trim() || null;
  }

  const envKey = providerConfig.apiKeyEnv;
  if (envKey && typeof envKey === 'string') {
    const value = process.env[envKey];

    if (value && value.trim()) {
      return value.trim();
    }

    log.warn({ provider: providerName, envKey }, 'API key environment variable is not set');
  }

  return null;
};

const createChatClient = (providerName, providerConfig, log) => {
  const apiKey = resolveApiKey(providerName, providerConfig, log);

  if (!apiKey) {
    log.warn({ provider: providerName }, 'Skipping provider because API key is missing');
    return null;
  }

  const baseURL = providerConfig.baseURL || undefined;
  const defaultModel = providerConfig.defaultModel || providerConfig.availableModels?.[0] || null;

  if (!defaultModel) {
    log.warn({ provider: providerName }, 'No default model configured; requests must specify a model explicitly');
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: providerConfig.defaultHeaders,
    timeout: providerConfig.timeout
  });

  return {
    defaultModel,
    availableModels: Array.isArray(providerConfig.availableModels)
      ? providerConfig.availableModels
      : [],
    async chat({ messages, model, temperature, maxTokens }) {
      const resolvedModel = model || defaultModel;

      if (!resolvedModel) {
        throw new Error(`No model specified for provider "${providerName}"`);
      }

      const payload = {
        model: resolvedModel,
        messages
      };

      if (typeof temperature === 'number') {
        payload.temperature = temperature;
      }

      if (typeof maxTokens === 'number') {
        payload.max_tokens = maxTokens;
      }

      const response = await client.chat.completions.create(payload);
      const choice = response?.choices?.[0]?.message;

      if (!choice) {
        throw new Error(`Provider "${providerName}" did not return any completion choices`);
      }

      return {
        role: choice.role,
        content: choice.content
      };
    }
  };
};

const buildAvailableModelsMap = (providersConfig = {}) => {
  return Object.entries(providersConfig).reduce((acc, [providerName, providerConfig]) => {
    const models = Array.isArray(providerConfig.availableModels) ? providerConfig.availableModels : [];
    acc[providerName] = models;
    return acc;
  }, {});
};

const pickDefaultProvider = ({
  explicitDefault,
  configDefault,
  availableClients,
  previousDefault
}) => {
  const hasClient = (name) => name && availableClients[name];

  if (hasClient(explicitDefault)) {
    return explicitDefault;
  }

  if (hasClient(configDefault)) {
    return configDefault;
  }

  if (hasClient(previousDefault)) {
    return previousDefault;
  }

  const [firstAvailable] = Object.keys(availableClients).filter((name) => hasClient(name));
  return firstAvailable || null;
};

module.exports = fp(async (fastify, opts = {}) => {
  const {
    configPath = DEFAULT_CONFIG_PATH,
    clients: providedClients = {},
    defaultProvider: explicitDefaultProvider
  } = opts;

  if (!fastify.hasDecorator('openAIClients')) {
    fastify.decorate('openAIClients', {});
  }

  if (!fastify.hasDecorator('openAISettings')) {
    fastify.decorate('openAISettings', {});
  }

  const modelConfig = await loadModelConfig(configPath, fastify.log);
  const providersConfig = modelConfig.providers || {};

  const generatedClients = Object.entries(providersConfig).reduce(
    (acc, [providerName, providerConfig]) => {
      const client = providedClients[providerName] || createChatClient(providerName, providerConfig, fastify.log);

      if (client) {
        acc[providerName] = client;
      }

      return acc;
    },
    {}
  );

  fastify.openAIClients = {
    ...fastify.openAIClients,
    ...generatedClients,
    ...providedClients
  };

  const mergedDefaultModelByProvider = {
    ...(fastify.openAISettings.defaultModelByProvider || {}),
    ...Object.entries(providersConfig).reduce((acc, [providerName, providerConfig]) => {
      const client = fastify.openAIClients[providerName];
      const defaultModel = providerConfig.defaultModel || client?.defaultModel || null;

      if (defaultModel) {
        acc[providerName] = defaultModel;
      }

      return acc;
    }, {})
  };

  const resolvedDefaultProvider = pickDefaultProvider({
    explicitDefault: explicitDefaultProvider,
    configDefault: modelConfig.defaultProvider,
    availableClients: fastify.openAIClients,
    previousDefault: fastify.openAISettings.defaultProvider
  });

  fastify.openAISettings = {
    ...fastify.openAISettings,
    defaultProvider: resolvedDefaultProvider,
    defaultModelByProvider: mergedDefaultModelByProvider,
    availableModelsByProvider: {
      ...(fastify.openAISettings.availableModelsByProvider || {}),
      ...buildAvailableModelsMap(providersConfig)
    },
    configPath
  };

  if (!resolvedDefaultProvider) {
    fastify.log.warn('No OpenAI providers are configured; chat requests will fail until configured');
  }

  const getClient = (provider) => {
    const key = provider || fastify.openAISettings.defaultProvider;
    return fastify.openAIClients[key] || null;
  };

  if (!fastify.hasDecorator('getOpenAIClient')) {
    fastify.decorate('getOpenAIClient', getClient);
  } else {
    fastify.getOpenAIClient = getClient;
  }

  const fallbackClient = getClient();

  if (!fastify.hasDecorator('openAIClient')) {
    fastify.decorate('openAIClient', fallbackClient);
  } else {
    fastify.openAIClient = fallbackClient;
  }
});
