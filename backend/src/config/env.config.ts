import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
  qdrantApiKey: process.env.QDRANT_API_KEY || undefined,
  qdrantCollectionName: process.env.QDRANT_COLLECTION_NAME || 'chaibook_sources',
  embeddingModel: 'text-embedding-3-small',
  chatModel: 'gpt-4o',
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()),
};

if (!config.openaiApiKey) {
  console.warn('⚠️ WARNING: OPENAI_API_KEY environment variable is not set!');
}
