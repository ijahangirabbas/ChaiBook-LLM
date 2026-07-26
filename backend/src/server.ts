import app from './app';
import { config } from './config/env.config';
import { initializeQdrantCollection } from './config/qdrant.config';

async function bootstrap() {
  // Initialize Qdrant database collection and payload indexes
  await initializeQdrantCollection();

  app.listen(config.port, () => {
    console.log(`
🚀 ChaiBook LLM RAG Backend running on http://localhost:${config.port}
📚 Health Check: http://localhost:${config.port}/health
⚡ Environment: ${process.env.NODE_ENV || 'development'}
    `);
  });
}

bootstrap().catch((err) => {
  console.error('💥 Failed to start server:', err);
  process.exit(1);
});
