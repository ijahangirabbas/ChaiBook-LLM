import { OpenAIEmbeddings } from '@langchain/openai';
import { Embeddings } from '@langchain/core/embeddings';
import { config } from './env.config';

export class JinaEmbeddings extends Embeddings {
  private apiKey: string;
  private modelName: string;

  constructor(fields?: { apiKey?: string; modelName?: string }) {
    super({});
    this.apiKey = fields?.apiKey || process.env.JINA_API_KEY || '';
    this.modelName = fields?.modelName || process.env.JINA_EMBEDDING_MODEL || 'jina-embeddings-v5-text-small';
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('JINA_API_KEY environment variable is not set.');
    }

    const response = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Jina API error: ${response.statusText}`);
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return data.data.map((item) => item.embedding);
  }

  async embedQuery(text: string): Promise<number[]> {
    const embeddings = await this.embedDocuments([text]);
    return embeddings[0];
  }
}

export function getEmbeddingsProvider(): Embeddings {
  const provider = (process.env.EMBEDDING_PROVIDER || (process.env.JINA_API_KEY ? 'jina' : 'openai')).toLowerCase();
  const jinaModel = process.env.JINA_EMBEDDING_MODEL || 'jina-embeddings-v5-text-small';

  if (provider === 'jina') {
    console.log(`⚡ Using Jina Embeddings API (${jinaModel})...`);
    return new JinaEmbeddings({ modelName: jinaModel });
  }

  return new OpenAIEmbeddings({
    openAIApiKey: config.openaiApiKey || 'mock-openai-key-for-test',
    modelName: config.embeddingModel,
  });
}
