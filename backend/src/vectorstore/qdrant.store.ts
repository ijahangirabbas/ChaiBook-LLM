import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { v4 as uuidv4 } from 'uuid';
import { qdrantClient } from '../config/qdrant.config';
import { config } from '../config/env.config';
import { getEmbeddingsProvider } from '../config/embeddings.config';
import { IVectorStore, VectorSearchResult } from './base.vectorstore';

export class QdrantVectorStore implements IVectorStore {
  private embeddings: Embeddings;
  private textSplitter: RecursiveCharacterTextSplitter;
  private inMemoryFallbackStore: Array<{ id: string; vector: number[]; document: Document }> = [];

  constructor() {
    this.embeddings = getEmbeddingsProvider();

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });
  }

  async upsertDocuments(documents: Document[]): Promise<void> {
    const splitDocs = await this.textSplitter.splitDocuments(documents);

    if (splitDocs.length === 0) return;

    const texts = splitDocs.map((doc) => doc.pageContent);
    const vectors = await this.embeddings.embedDocuments(texts);

    try {
      const points = splitDocs.map((doc, index) => ({
        id: uuidv4(),
        vector: vectors[index],
        payload: {
          pageContent: doc.pageContent,
          metadata: doc.metadata,
          notebook_id: doc.metadata.notebook_id,
          workspace_id: doc.metadata.workspace_id,
          source_id: doc.metadata.source_id,
          title: doc.metadata.title,
        },
      }));

      // Also store in memory fallback store for instant local search
      splitDocs.forEach((doc, index) => {
        this.inMemoryFallbackStore.push({
          id: uuidv4(),
          vector: vectors[index],
          document: doc,
        });
      });

      await qdrantClient.upsert(config.qdrantCollectionName, {
        wait: true,
        points: points,
      });

      console.log(`✅ Successfully indexed ${points.length} chunks into Qdrant collection "${config.qdrantCollectionName}".`);
    } catch (qdrantError) {
      console.warn(`⚠️ Qdrant server unavailable (${(qdrantError as Error).message}). Storing ${splitDocs.length} chunks in memory fallback.`);

      splitDocs.forEach((doc, index) => {
        this.inMemoryFallbackStore.push({
          id: uuidv4(),
          vector: vectors[index],
          document: doc,
        });
      });
    }
  }

  async similaritySearch(query: string, notebookId: string, limit = 5, workspaceId?: string): Promise<VectorSearchResult[]> {
    const queryVector = await this.embeddings.embedQuery(query);

    // Primary search: Qdrant with compound tenant + notebook filters
    try {
      const mustFilters: Array<Record<string, unknown>> = [
        {
          should: [
            { key: 'metadata.notebook_id', match: { value: notebookId } },
            { key: 'notebook_id', match: { value: notebookId } },
          ],
        },
      ];

      if (workspaceId) {
        mustFilters.push({
          should: [
            { key: 'metadata.workspace_id', match: { value: workspaceId } },
            { key: 'workspace_id', match: { value: workspaceId } },
          ],
        });
      }

      const searchResult = await qdrantClient.search(config.qdrantCollectionName, {
        vector: queryVector,
        limit: limit,
        filter: { must: mustFilters },
      });

      if (searchResult.length > 0) {
        return searchResult.map((hit) => {
          const payload = hit.payload as { pageContent: string; metadata: Record<string, any> };
          return {
            document: new Document({
              pageContent: payload.pageContent,
              metadata: payload.metadata || payload,
            }),
            score: hit.score,
          };
        });
      }
    } catch {
      // Qdrant search failed, fall through to in-memory fallback search
    }

    // In-memory fallback: filter by notebook ID, with soft fallback if empty
    let filtered = this.inMemoryFallbackStore.filter(
      (item) => item.document.metadata.notebook_id === notebookId
    );

    if (filtered.length === 0 && this.inMemoryFallbackStore.length > 0) {
      filtered = this.inMemoryFallbackStore;
    }

    if (workspaceId) {
      const wsMatched = filtered.filter(
        (item) => !item.document.metadata.workspace_id || item.document.metadata.workspace_id === workspaceId
      );
      if (wsMatched.length > 0) {
        filtered = wsMatched;
      }
    }

    if (filtered.length === 0) {
      return [];
    }

    const scored = filtered.map((item) => {
      const score = this.cosineSimilarity(queryVector, item.vector);
      return {
        document: item.document,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  async deleteBySourceId(sourceId: string): Promise<void> {
    try {
      await qdrantClient.delete(config.qdrantCollectionName, {
        filter: {
          must: [
            {
              key: 'metadata.source_id',
              match: {
                value: sourceId,
              },
            },
          ],
        },
      });
      console.log(`🗑️ Deleted vectors for sourceId: "${sourceId}" from Qdrant.`);
    } catch (error) {
      console.warn(`⚠️ Could not delete vectors from Qdrant for sourceId "${sourceId}": ${(error as Error).message}`);
    }

    this.inMemoryFallbackStore = this.inMemoryFallbackStore.filter(
      (item) => item.document.metadata.source_id !== sourceId
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }
}
