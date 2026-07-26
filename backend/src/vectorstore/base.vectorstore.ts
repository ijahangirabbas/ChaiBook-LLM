import { Document } from '@langchain/core/documents';

export interface VectorSearchResult {
  document: Document;
  score: number;
}

export interface IVectorStore {
  upsertDocuments(documents: Document[]): Promise<void>;
  similaritySearch(query: string, notebookId: string, limit?: number, workspaceId?: string): Promise<VectorSearchResult[]>;
  deleteBySourceId(sourceId: string): Promise<void>;
}
