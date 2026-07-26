import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from './env.config';

export const qdrantClient = new QdrantClient({
  url: config.qdrantUrl,
  apiKey: config.qdrantApiKey,
});

export async function initializeQdrantCollection(): Promise<void> {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      (col) => col.name === config.qdrantCollectionName
    );

    if (!exists) {
      console.log(`📦 Creating Qdrant collection: "${config.qdrantCollectionName}"...`);
      await qdrantClient.createCollection(config.qdrantCollectionName, {
        vectors: {
          size: 1536, // OpenAI text-embedding-3-small dimension
          distance: 'Cosine',
        },
      });

      // Create payload index for fast multi-tenant filtering on notebook_id and source_id
      await qdrantClient.createPayloadIndex(config.qdrantCollectionName, {
        field_name: 'metadata.notebook_id',
        field_schema: 'keyword',
      });

      await qdrantClient.createPayloadIndex(config.qdrantCollectionName, {
        field_name: 'metadata.source_id',
        field_schema: 'keyword',
      });

      console.log(`✅ Qdrant collection "${config.qdrantCollectionName}" initialized with payload indexes.`);
    }
  } catch (error) {
    console.warn(`⚠️ Qdrant connection/initialization warning: ${(error as Error).message}. Will run in memory fallback if Qdrant server is unavailable.`);
  }
}
