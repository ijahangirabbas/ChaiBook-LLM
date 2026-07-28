import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiV1Routes from './routes/v1';
import { errorHandler } from './middlewares/error.middleware';
import { requestContextMiddleware } from './middlewares/request-context.middleware';
import { checkRedisConnection } from './queue/ingestion.queue';
import { config } from './config/env.config';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(requestContextMiddleware);

// Dynamic CORS Policy — explicit allowlist only (no wildcard domain suffixes in production)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isExplicitlyAllowed = config.corsOrigins.includes(origin);
      const isLocalDev =
        config.nodeEnv !== 'production' &&
        (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));

      if (isExplicitlyAllowed || isLocalDev) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'x-request-id', 'Idempotency-Key'],
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Root Welcome Route
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    message: '🚀 ChaiBook LLM RAG Backend API is running!',
    endpoints: {
      health: '/health',
      v1: '/api/v1',
    },
  });
});

// Health Check with Redis Status (no sensitive connection strings exposed)
app.get('/health', async (_req, res) => {
  const redisStatus = await checkRedisConnection();
  res.status(200).json({
    status: 'OK',
    service: 'ChaiBook LLM Backend',
    redis: {
      connected: redisStatus.connected,
      status: redisStatus.status,
    },
  });
});

// API Routes
app.use('/api/v1', apiV1Routes);

// Global Error Handler
app.use(errorHandler);

export default app;
