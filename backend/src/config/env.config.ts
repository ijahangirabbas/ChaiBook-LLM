import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
  qdrantApiKey: process.env.QDRANT_API_KEY || undefined,
  qdrantCollectionName: process.env.QDRANT_COLLECTION_NAME || 'chaibook_sources',
  embeddingModel: process.env.EMBEDDING_MODEL || 'jina-embeddings-v5-text-small',
  chatModel: 'gpt-4o',
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()),
};

if (!config.openaiApiKey) {
  console.warn('⚠️ WARNING: OPENAI_API_KEY environment variable is not set!');
}
