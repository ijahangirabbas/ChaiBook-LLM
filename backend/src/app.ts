import express from 'express';
import cors from 'cors';
import apiV1Routes from './routes/v1';
import { errorHandler } from './middlewares/error.middleware';
import { checkRedisConnection } from './queue/ingestion.queue';

const app = express();

// Middlewares
app.use(cors({ origin: '*' }));
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
