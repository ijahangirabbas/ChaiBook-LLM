import { Document } from '@langchain/core/documents';
import { VectorSearchResult } from '../vectorstore/base.vectorstore';

const JINA_RERANK_URL = 'https://api.jina.ai/v1/rerank';
const DEFAULT_RERANK_MODEL = 'jina-reranker-v2-base-multilingual';

export async function rerankWithJina(
  query: string,
  results: VectorSearchResult[],
  topN: number
): Promise<VectorSearchResult[] | null> {
  const apiKey = process.env.JINA_API_KEY || process.env.JENA_API_KEY;
  if (!apiKey || results.length === 0) return null;

  const model = process.env.JINA_RERANK_MODEL || DEFAULT_RERANK_MODEL;

  try {
    const response = await fetch(JINA_RERANK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        query,
        documents: results.map((r) => r.document.pageContent),
        top_n: Math.min(topN, results.length),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`⚠️ Jina rerank failed (${response.status}): ${errText.substring(0, 150)}`);
      return null;
    }

    const data = (await response.json()) as {
      results: Array<{ index: number; relevance_score: number }>;
    };

    return data.results.map((item) => {
      const original = results[item.index];
      return {
        document: new Document({
          pageContent: original.document.pageContent,
          metadata: original.document.metadata,
        }),
        score: item.relevance_score,
      };
    });
  } catch (err) {
    console.warn(`⚠️ Jina rerank error: ${(err as Error).message}`);
    return null;
  }
}
