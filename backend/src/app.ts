import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import apiV1Routes from './routes/v1';
import { errorHandler } from './middlewares/error.middleware';
import { checkRedisConnection } from './queue/ingestion.queue';
import { config } from './config/env.config';

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// Correlation ID & Request Tracing Middleware
app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// Strict CORS in production; permissive localhost in development
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isAllowed =
        config.corsOrigins.includes(origin) ||
        (config.nodeEnv !== 'production' &&
          (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')));

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy error: Origin ${origin} is not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'x-request-id'],
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

// Health Check with Redis Status
app.get('/health', async (_req, res) => {
  const redisStatus = await checkRedisConnection();
  res.status(200).json({
    status: 'OK',
    service: 'ChaiBook LLM Backend',
    redis: redisStatus,
  });
});

// API Routes
app.use('/api/v1', apiV1Routes);

// Global Error Handler
app.use(errorHandler);

export default app;
