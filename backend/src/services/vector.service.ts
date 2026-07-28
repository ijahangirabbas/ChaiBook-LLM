import { Document } from '@langchain/core/documents';
import { VectorFactory } from '../vectorstore/vector.factory';
import { VectorSearchResult } from '../vectorstore/base.vectorstore';
import {
  applyMMR,
  filterByMinScore,
  rerankByKeywordOverlap,
} from '../utils/retrieval.utils';
import { rerankWithJina } from './rerank.service';

const RETRIEVE_CANDIDATES = 20;
const FINAL_TOP_K = 5;

export class VectorService {
  private vectorStore = VectorFactory.getVectorStore();

  async indexDocuments(documents: Document[]): Promise<void> {
    await this.vectorStore.upsertDocuments(documents);
  }

  async searchWorkspace(
    query: string,
    notebookId: string,
    limit = FINAL_TOP_K,
    workspaceId?: string
  ): Promise<VectorSearchResult[]> {
    const candidates = await this.vectorStore.similaritySearch(
      query,
      notebookId,
      RETRIEVE_CANDIDATES,
      workspaceId
    );

    const aboveThreshold = filterByMinScore(candidates);

    // Prefer Jina cross-encoder rerank when API key is available; fall back to keyword+MMR
    const jinaReranked = await rerankWithJina(query, aboveThreshold, Math.max(limit * 2, 10));
    if (jinaReranked && jinaReranked.length > 0) {
      return applyMMR(jinaReranked, limit);
    }

    const reranked = rerankByKeywordOverlap(query, aboveThreshold);
    return applyMMR(reranked, limit);
  }

  async deleteSourceVectors(sourceId: string): Promise<void> {
    await this.vectorStore.deleteBySourceId(sourceId);
  }
}

export const vectorService = new VectorService();
