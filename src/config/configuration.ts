export interface AppConfig {
  server: {
    port: number;
    nodeEnv: string;
  };
  llm: {
    apiUrl: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  fraud: {
    configPath: string;
    riskBlockThreshold: number;
    amountThreshold: number;
    amountRisk: number;
    domainRisk: number;
    velocityThreshold: number;
    velocityRisk: number;
    geoMismatchRisk: number;
  };
  logging: {
    level: string;
  };
  api: {
    prefix: string;
    swagger: {
      title: string;
      description: string;
      version: string;
      path: string;
    };
  };
  security: {
    corsOrigin: string;
    rateLimitTtl: number;
    rateLimitLimit: number;
  };
}

export const configuration = (): AppConfig => ({
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  llm: {
    apiUrl: process.env.LLM_API_URL || 'http://ollama:11434',
    model: process.env.LLM_MODEL || 'tinyllama',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '50', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  },
  fraud: {
    configPath: process.env.FRAUD_CONFIG_PATH || './fraud-config.json',
    riskBlockThreshold: parseFloat(process.env.RISK_BLOCK_THRESHOLD || '0.5'),
    amountThreshold: parseInt(process.env.RISK_AMOUNT_THRESHOLD || '1000', 10),
    amountRisk: parseFloat(process.env.RISK_AMOUNT_INCREMENT || '0.3'),
    domainRisk: parseFloat(process.env.RISK_DOMAIN_INCREMENT || '0.3'),
    velocityThreshold: parseInt(process.env.RISK_VELOCITY_THRESHOLD || '3', 10),
    velocityRisk: parseFloat(process.env.RISK_VELOCITY_INCREMENT || '0.25'),
    geoMismatchRisk: parseFloat(process.env.RISK_GEO_MISMATCH_INCREMENT || '0.2'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
  api: {
    prefix: process.env.API_PREFIX || 'api',
    swagger: {
      title: process.env.SWAGGER_TITLE || 'Payment Gateway API',
      description: process.env.SWAGGER_DESCRIPTION || 'Production-ready payment gateway with fraud detection',
      version: process.env.SWAGGER_VERSION || '1.0',
      path: process.env.SWAGGER_PATH || 'docs',
    },
  },
  security: {
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    rateLimitLimit: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10),
  },
}); 