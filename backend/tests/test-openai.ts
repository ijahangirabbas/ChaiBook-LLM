import dotenv from 'dotenv';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';

dotenv.config();

export async function testOpenAI(): Promise<boolean> {
  console.log('\n========================================');
  console.log('🤖 1. Testing OpenAI LLM & Embedding Key...');
  console.log('========================================');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_openai_api_key')) {
    console.error('❌ ERROR: OPENAI_API_KEY is missing or unconfigured in .env file.');
    return false;
  }

  try {
    // 1. Test Embedding Generation
    console.log('🔹 Generating text embedding using "text-embedding-3-small"...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-3-small',
    });

    const vector = await embeddings.embedQuery('Testing ChaiBook LLM OpenAI Integration');
    console.log(`✅ Embedding Generated! Dimension size: ${vector.length} floats.`);

    if (vector.length !== 1536) {
      console.error(`⚠️ Warning: Expected vector size 1536, received ${vector.length}`);
    }

    // 2. Test LLM Chat Completion (gpt-4o)
    console.log('🔹 Testing LLM Chat response using "gpt-4o"...');
    const model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o',
      maxTokens: 20,
    });

    const response = await model.invoke('Say "OpenAI Connection Successful!"');
    console.log(`✅ LLM Response Received: "${response.content}"`);

    console.log('🎉 OpenAI Test Passed Successfully!\n');
    return true;
  } catch (error) {
    console.error(`❌ OpenAI Test Failed: ${(error as Error).message}\n`);
    return false;
  }
}

if (require.main === module) {
  testOpenAI();
}
