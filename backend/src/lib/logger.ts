import pino from 'pino';
import { config } from '../config/env.config';

const REDACT_PATHS = [
  'req.headers.authorization',
  'headers.authorization',
  'authorization',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'OPENAI_API_KEY',
  'CLERK_SECRET_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'DATABASE_URL',
  'REDIS_URL',
  'QDRANT_API_KEY',
  'JINA_API_KEY',
];

export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  base: {
    service: 'chaibook-llm-backend',
    env: config.nodeEnv,
  },
  ...(config.nodeEnv !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
