import { OpenAIEmbeddings } from '@langchain/openai';
import { Embeddings } from '@langchain/core/embeddings';
import { config } from './env.config';

const EMBED_BATCH_SIZE = 50;
const EMBED_MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedWithRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const message = (err as Error).message || '';
    const isRateLimit = message.includes('429') || message.toLowerCase().includes('rate');
    if (isRateLimit && attempt < EMBED_MAX_RETRIES) {
      const delay = Math.min(2000 * 2 ** (attempt - 1), 10_000);
      await sleep(delay);
      return embedWithRetry(fn, attempt + 1);
    }
    throw err;
  }
}

export class JinaEmbeddings extends Embeddings {
  private apiKey: string;
  private modelName: string;

  constructor(fields?: { apiKey?: string; modelName?: string }) {
    super({});
    this.apiKey = fields?.apiKey || process.env.JINA_API_KEY || process.env.JENA_API_KEY || '';
    this.modelName = fields?.modelName || process.env.JINA_EMBEDDING_MODEL || 'jina-embeddings-v5-text-small';
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    return embedWithRetry(async () => {
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
        const errText = await response.text();
        throw new Error(`Jina embeddings API error (${response.status}): ${errText.substring(0, 200)}`);
      }

      const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
      return data.data.map((item) => item.embedding);
    });
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await this.embedBatch(batch);
      results.push(...embeddings);
    }
    return results;
  }

  async embedQuery(text: string): Promise<number[]> {
    const embeddings = await this.embedDocuments([text]);
    return embeddings[0];
  }
}

export function getEmbeddingModelName(): string {
  const jinaKey = process.env.JINA_API_KEY || process.env.JENA_API_KEY;
  if (jinaKey) {
    return process.env.JINA_EMBEDDING_MODEL || 'jina-embeddings-v5-text-small';
  }
  return config.embeddingModel;
}

export function getEmbeddingsProvider(): Embeddings {
  const jinaKey = process.env.JINA_API_KEY || process.env.JENA_API_KEY;
  const jinaModel = getEmbeddingModelName();

  if (jinaKey) {
    console.log(`⚡ Using Jina Embeddings API (${jinaModel})...`);
    return new JinaEmbeddings({ apiKey: jinaKey, modelName: jinaModel });
  }

  if (config.openaiApiKey && !config.openaiApiKey.startsWith('mock-')) {
    return new OpenAIEmbeddings({
      openAIApiKey: config.openaiApiKey,
      modelName: config.embeddingModel,
    });
  }

  throw new Error(
    'No embedding API configured. Set JINA_API_KEY or OPENAI_API_KEY to enable vector search and indexing.'
  );
}
