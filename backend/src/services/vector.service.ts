import { Document } from '@langchain/core/documents';
import { VectorFactory } from '../vectorstore/vector.factory';
import { VectorSearchResult } from '../vectorstore/base.vectorstore';

export class VectorService {
  private vectorStore = VectorFactory.getVectorStore();

  async indexDocuments(documents: Document[]): Promise<void> {
    await this.vectorStore.upsertDocuments(documents);
  }

  async searchWorkspace(
    query: string,
    notebookId: string,
    limit = 5
  ): Promise<VectorSearchResult[]> {
    return await this.vectorStore.similaritySearch(query, notebookId, limit);
  }

  async deleteSourceVectors(sourceId: string): Promise<void> {
    await this.vectorStore.deleteBySourceId(sourceId);
  }
}

export const vectorService = new VectorService();
