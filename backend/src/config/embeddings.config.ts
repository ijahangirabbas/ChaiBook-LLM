import { OpenAIEmbeddings } from '@langchain/openai';
import { Embeddings } from '@langchain/core/embeddings';
import { config } from './env.config';

export class JinaEmbeddings extends Embeddings {
  private apiKey: string;
  private modelName: string;
  private fallback: LocalDeterministicEmbeddings;

  constructor(fields?: { apiKey?: string; modelName?: string }) {
    super({});
    this.apiKey = fields?.apiKey || process.env.JINA_API_KEY || process.env.JENA_API_KEY || '';
    this.modelName = fields?.modelName || process.env.JINA_EMBEDDING_MODEL || 'jina-embeddings-v5-text-small';
    this.fallback = new LocalDeterministicEmbeddings();
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      return this.fallback.embedDocuments(texts);
    }

    try {
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
        console.warn(`⚠️ Jina API error (${response.status}): ${errText.substring(0, 100)}. Falling back to local embeddings.`);
        return this.fallback.embedDocuments(texts);
      }

      const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
      return data.data.map((item) => item.embedding);
    } catch (err: any) {
      console.warn(`⚠️ Jina embeddings request failed (${err.message}). Falling back to local embeddings.`);
      return this.fallback.embedDocuments(texts);
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    const embeddings = await this.embedDocuments([text]);
    return embeddings[0];
  }
}

export class LocalDeterministicEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.generateVector(t));
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.generateVector(text);
  }

  private generateVector(text: string, dimensions = 1536): number[] {
    const vector = new Array(dimensions).fill(0);
    const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

    if (words.length === 0) return vector;

    words.forEach((word) => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dimensions;
      vector[idx] += 1;
    });

    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((val) => val / norm);
  }
}

export function getEmbeddingsProvider(): Embeddings {
  const jinaKey = process.env.JINA_API_KEY || process.env.JENA_API_KEY;
  const jinaModel = process.env.JINA_EMBEDDING_MODEL || 'jina-embeddings-v5-text-small';

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

  console.log('⚡ Using Local Deterministic Embeddings Engine (no API key required)...');
  return new LocalDeterministicEmbeddings();
}
