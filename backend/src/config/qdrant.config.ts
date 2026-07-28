import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from './env.config';

export const qdrantClient = new QdrantClient({
  url: config.qdrantUrl,
  apiKey: config.qdrantApiKey,
});

export function getExpectedVectorDimension(): number {
  // QDRANT_VECTOR_SIZE is the single source of truth — always read from env first
  if (process.env.QDRANT_VECTOR_SIZE) {
    return parseInt(process.env.QDRANT_VECTOR_SIZE, 10);
  }
  const provider = (process.env.EMBEDDING_PROVIDER || (process.env.JINA_API_KEY ? 'jina' : 'openai')).toLowerCase();
  if (provider === 'jina') {
    return 1024; // jina-embeddings-v5-text-small outputs 1024 dims
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

    }

    // Ensure all payload indexes exist for fast multi-tenant filtering (metadata-nested and root fields)
    const indexFields = [
      'metadata.notebook_id',
      'notebook_id',
      'metadata.source_id',
      'source_id',
      'metadata.workspace_id',
      'workspace_id',
    ];

    for (const field of indexFields) {
      try {
        await qdrantClient.createPayloadIndex(config.qdrantCollectionName, {
          field_name: field,
          field_schema: 'keyword',
        });
      } catch (err) {
        // Ignore if index already exists or creation failed temporarily
      }
    }
  } catch (error) {
    console.warn(`⚠️ Qdrant connection/initialization warning: ${(error as Error).message}. Running with in-memory fallback if Qdrant is unavailable.`);
  }
}
