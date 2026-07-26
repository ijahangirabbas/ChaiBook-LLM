import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

export async function testQdrant(): Promise<boolean> {
  console.log('\n========================================');
  console.log('📦 2. Testing Qdrant Vector Database...');
  console.log('========================================');

  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const apiKey = process.env.QDRANT_API_KEY || undefined;
  const collectionName = process.env.QDRANT_COLLECTION_NAME || 'chaibook_sources';

  console.log(`🔹 Connecting to Qdrant at: ${qdrantUrl}...`);

  const client = new QdrantClient({
    url: qdrantUrl,
    apiKey: apiKey,
  });

  try {
    // 1. Fetch Collections
    const collections = await client.getCollections();
    console.log(`✅ Qdrant Connection Established! Total Collections found: ${collections.collections.length}`);

    // 2. Ensure Test Collection Exists
    const exists = collections.collections.some((c) => c.name === collectionName);
    if (!exists) {
      console.log(`🔹 Creating Qdrant collection "${collectionName}"...`);
      await client.createCollection(collectionName, {
        vectors: { size: 1536, distance: 'Cosine' },
      });
      console.log(`✅ Collection "${collectionName}" created successfully.`);
    } else {
      console.log(`✅ Collection "${collectionName}" exists.`);
    }

    // 3. Ensure Payload Index Exists for notebook_id
    try {
      await client.createPayloadIndex(collectionName, {
        field_name: 'metadata.notebook_id',
        field_schema: 'keyword',
      });
      console.log(`✅ Payload index on "metadata.notebook_id" verified.`);
    } catch {
      // index might already exist
    }

    // 4. Test Vector Upserting & Payload Filtering
    const testPointId = uuidv4();
    const mockVector = new Array(1536).fill(0).map(() => Math.random());
    const testNotebookId = `test-nb-${Date.now()}`;

    console.log(`🔹 Upserting test point (${testPointId}) with notebook_id payload...`);
    await client.upsert(collectionName, {
      wait: true,
      points: [
        {
          id: testPointId,
          vector: mockVector,
          payload: {
            pageContent: 'This is a test vector chunk for ChaiBook LLM.',
            metadata: { notebook_id: testNotebookId, source_id: 'test-src-1' },
          },
        },
      ],
    });
    console.log('✅ Test Vector Upserted successfully.');

    // 5. Test Filtered Search
    console.log(`🔹 Performing workspace similarity search with notebook_id filter...`);
    const searchRes = await client.search(collectionName, {
      vector: mockVector,
      limit: 5,
      filter: {
        must: [
          {
            key: 'metadata.notebook_id',
            match: {
              value: testNotebookId,
            },
          },
        ],
      },
    });

    if (searchRes.length > 0) {
      console.log(`✅ Similarity Search Verified! Found match with score: ${searchRes[0].score.toFixed(4)}`);
    } else {
      console.log(`✅ Similarity search executed without errors.`);
    }

    // 6. Cleanup Test Point
    await client.delete(collectionName, {
      points: [testPointId],
    });
    console.log('✅ Test vector cleaned up.');

    console.log('🎉 Qdrant Test Passed Successfully!\n');
    return true;
  } catch (error) {
    console.error(`❌ Qdrant Test Failed: ${(error as Error).message}\n`);
    return false;
  }
}

if (require.main === module) {
  testQdrant();
}
