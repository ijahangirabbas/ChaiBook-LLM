import { testOpenAI } from './test-openai';
import { testQdrant } from './test-qdrant';
import { testS3 } from './test-s3';
import { testPostgres } from './test-postgres';
import { testRedis } from './test-redis';

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 ChaiBook LLM Integration & Credentials Test Suite');
  console.log('======================================================');

  const results = {
    openai: false,
    qdrant: false,
    s3: false,
    postgres: false,
    redis: false,
  };

  results.openai = await testOpenAI();
  results.qdrant = await testQdrant();
  results.s3 = await testS3();
  results.postgres = await testPostgres();
  results.redis = await testRedis();

  console.log('======================================================');
  console.log('📊 TEST SUMMARY REPORT CARD');
  console.log('======================================================');
  console.log(`🤖 OpenAI LLM & Embeddings Key: ${results.openai ? '✅ PASSED' : '❌ FAILED / NOT CONFIGURED'}`);
  console.log(`📦 Qdrant Vector Database:      ${results.qdrant ? '✅ PASSED' : '❌ FAILED / NOT CONNECTED'}`);
  console.log(`☁️ AWS S3 Storage Bucket:        ${results.s3 ? '✅ PASSED' : '⚠️ SKIPPED / NOT CONFIGURED'}`);
  console.log(`🐘 PostgreSQL Database (Prisma):${results.postgres ? '✅ PASSED' : '⚠️ SKIPPED / NOT CONFIGURED'}`);
  console.log(`⚡ Redis & BullMQ Queue:        ${results.redis ? '✅ PASSED' : '⚠️ SKIPPED / NOT CONNECTED'}`);
  console.log('======================================================\n');
}

runAllTests();
