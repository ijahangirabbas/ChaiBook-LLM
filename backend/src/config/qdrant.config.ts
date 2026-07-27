import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from './env.config';

export const qdrantClient = new QdrantClient({
  url: config.qdrantUrl,
  apiKey: config.qdrantApiKey,
});

export function getExpectedVectorDimension(): number {
  const provider = (process.env.EMBEDDING_PROVIDER || (process.env.JINA_API_KEY ? 'jina' : 'openai')).toLowerCase();
  if (provider === 'jina') {
    return 768; // Jina Embeddings dimension (jina-embeddings-v5-text-small / jina-embeddings-v2-base-en)
  }
  return 1536; // OpenAI text-embedding-3-small dimension
}

export async function initializeQdrantCollection(): Promise<void> {
  const vectorSize = getExpectedVectorDimension();

  try {
    const collections = await qdrantClient.getCollections();
    const existingCol = collections.collections.find(
      (col) => col.name === config.qdrantCollectionName
    );

    let needsCreation = !existingCol;

    if (existingCol) {
      try {
        const info = await qdrantClient.getCollection(config.qdrantCollectionName);
        const currentSize = typeof info.config?.params?.vectors === 'object'
          ? (info.config.params.vectors as any)?.size
          : undefined;

        if (currentSize && currentSize !== vectorSize) {
          console.log(`⚠️ Vector dimension mismatch in Qdrant collection "${config.qdrantCollectionName}" (expected ${vectorSize}, found ${currentSize}). Re-creating collection...`);
          await qdrantClient.deleteCollection(config.qdrantCollectionName);
          needsCreation = true;
        }
      } catch {
        // If collection check fails, proceed
      }
    }

    if (needsCreation) {
      console.log(`📦 Creating Qdrant collection: "${config.qdrantCollectionName}" (vector size: ${vectorSize})...`);
      await qdrantClient.createCollection(config.qdrantCollectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });

      // Create payload index for fast multi-tenant filtering on notebook_id, source_id, workspace_id
      await qdrantClient.createPayloadIndex(config.qdrantCollectionName, {
        field_name: 'metadata.notebook_id',
        field_schema: 'keyword',
      });

      await qdrantClient.createPayloadIndex(config.qdrantCollectionName, {
        field_name: 'metadata.source_id',
        field_schema: 'keyword',
      });

      await qdrantClient.createPayloadIndex(config.qdrantCollectionName, {
        field_name: 'metadata.workspace_id',
        field_schema: 'keyword',
      });

      console.log(`✅ Qdrant collection "${config.qdrantCollectionName}" initialized with payload indexes (dimension ${vectorSize}).`);
    }
  } catch (error) {
    console.warn(`⚠️ Qdrant connection/initialization warning: ${(error as Error).message}. Running with in-memory fallback if Qdrant is unavailable.`);
  }
}
