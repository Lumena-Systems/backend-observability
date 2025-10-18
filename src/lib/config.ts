export interface Config {
  env: 'development' | 'staging' | 'production';
  port: number;
  database: {
    url: string;
    poolSize: number;
    connectionTimeout: number;
    idleTimeout: number;
  };
  cache: {
    host: string;
    port: number;
    ttl: number;
  };
  externalServices: {
    validationService: {
      url: string;
      timeout: number;
      apiKey: string;
    };
    paymentGateway: {
      url: string;
      timeout: number;
    };
  };
  api: {
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
    timeout: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };
}

const config: Config = {
  env: (process.env.NODE_ENV as any) || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/app',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '200', 10),
    connectionTimeout: 10000, // 10 seconds
    idleTimeout: 30000, // 30 seconds
  },
  cache: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    ttl: 3600,
  },
  externalServices: {
    validationService: {
      url: process.env.VALIDATION_SERVICE_URL || 'https://validation-service.external/validate',
      timeout: 30000,
      apiKey: process.env.VALIDATION_API_KEY || 'demo-key',
    },
    paymentGateway: {
      url: process.env.PAYMENT_GATEWAY_URL || 'https://payments.example.com',
      timeout: 15000,
    },
  },
  api: {
    rateLimit: {
      windowMs: 60000,
      maxRequests: 1000,
    },
    timeout: 30000,
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    format: 'json',
  },
};

export default config;

