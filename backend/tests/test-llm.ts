import dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';
import { getEmbeddingsProvider } from '../src/config/embeddings.config';
import { config } from '../src/config/env.config';

dotenv.config();

export async function testLLM(): Promise<boolean> {
  console.log('\n========================================');
  console.log('🤖 Testing LLM & Embeddings Configuration');
  console.log(`Model: ${config.chatModel}`);
  console.log(`Embedding Model: ${config.embeddingModel}`);
  console.log('========================================');

  let passed = true;

  // 1. Test Embedding Provider (Jina / OpenAI)
  try {
    console.log('🔹 Step 1: Testing Embeddings Provider...');
    const embeddings = getEmbeddingsProvider();
    const vector = await embeddings.embedQuery('Testing ChaiBook LLM embeddings provider');
    console.log(`✅ Embeddings Success! Vector dimension size: ${vector.length} floats.`);
  } catch (err) {
    console.error(`❌ Embeddings Provider Failed: ${(err as Error).message}`);
    passed = false;
  }

  // 2. Test LLM Completion (Groq / OpenAI / Custom Endpoint)
  try {
    console.log(`🔹 Step 2: Testing LLM Response for model "${config.chatModel}"...`);
    const llm = new ChatOpenAI({
      openAIApiKey: config.groqApiKey || config.openaiApiKey,
      modelName: config.chatModel,
      maxTokens: 30,
      temperature: 0.2,
      ...(config.openaiBaseUrl ? { configuration: { baseURL: config.openaiBaseUrl } } : {}),
    });

    const response = await llm.invoke('Say "ChaiBook LLM test passed!" in 5 words.');
    console.log(`✅ LLM Response Received: "${response.content}"`);
  } catch (err) {
    console.error(`❌ LLM Test Failed: ${(err as Error).message}`);
    passed = false;
  }

  if (passed) {
    console.log('🎉 LLM & Embeddings Test PASSED!\n');
  } else {
    console.error('❌ LLM & Embeddings Test FAILED!\n');
  }

  return passed;
}

if (require.main === module) {
  testLLM();
}
