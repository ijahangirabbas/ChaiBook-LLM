import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { v4 as uuidv4 } from 'uuid';
import { qdrantClient } from '../config/qdrant.config';
import { config } from '../config/env.config';
import { getEmbeddingsProvider, getEmbeddingModelName } from '../config/embeddings.config';
import { IVectorStore, VectorSearchResult } from './base.vectorstore';
import { chunkRepository } from '../repositories/chunk.repository';
import { logger } from '../lib/logger';
import { embeddingDuration } from '../lib/metrics';

const QDRANT_UPSERT_BATCH_SIZE = 100;

export class QdrantVectorStore implements IVectorStore {
  private embeddings: Embeddings;
  private textSplitter: RecursiveCharacterTextSplitter;

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

    const embeddingModel = getEmbeddingModelName();
    const texts = splitDocs.map((doc) => doc.pageContent);
    const embedStart = process.hrtime.bigint();
    const vectors = await this.embeddings.embedDocuments(texts);
    embeddingDuration.observe(Number(process.hrtime.bigint() - embedStart) / 1_000_000_000);

    const chunkRecords = splitDocs.map((doc, index) => {
      const chunkId = uuidv4();
      const meta = doc.metadata || {};
      const charOffset = meta.charOffset as { start?: number; end?: number } | undefined;

      return {
        chunkId,
        doc,
        vector: vectors[index],
        record: {
          id: chunkId,
          sourceId: String(meta.source_id || ''),
          workspaceId: String(meta.workspace_id || ''),
          notebookId: String(meta.notebook_id || ''),
          text: doc.pageContent,
          chunkIndex: index,
          pageNumber: meta.pageNumber as number | undefined,
          startSeconds: meta.startSeconds as number | undefined,
          charOffsetStart: charOffset?.start,
          charOffsetEnd: charOffset?.end,
          qdrantPointId: chunkId,
          embeddingModel,
        },
      };
    });

    const points = chunkRecords.map(({ chunkId, doc, vector }) => ({
      id: chunkId,
      vector,
      payload: {
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          chunk_id: chunkId,
        },
        notebook_id: doc.metadata.notebook_id,
        workspace_id: doc.metadata.workspace_id,
        source_id: doc.metadata.source_id,
        chunk_id: chunkId,
        title: doc.metadata.title,
      },
    }));

    const sourceId = chunkRecords[0]?.record.sourceId;
    if (sourceId) {
      await chunkRepository.deleteBySourceId(sourceId);
      await chunkRepository.createChunks(chunkRecords.map((c) => c.record));
    }

    for (let i = 0; i < points.length; i += QDRANT_UPSERT_BATCH_SIZE) {
      const batch = points.slice(i, i + QDRANT_UPSERT_BATCH_SIZE);
      await qdrantClient.upsert(config.qdrantCollectionName, {
        wait: true,
        points: batch,
      });
    }

    logger.info(
      { chunkCount: points.length, batches: Math.ceil(points.length / QDRANT_UPSERT_BATCH_SIZE), embeddingModel },
      'Indexed chunks into Qdrant'
    );
  }

  async similaritySearch(
    query: string,
    notebookId: string,
    limit = 5,
    workspaceId?: string
  ): Promise<VectorSearchResult[]> {
    const queryVector = await this.embeddings.embedQuery(query);

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
      limit,
      filter: { must: mustFilters },
    });

    return searchResult.map((hit) => {
      const payload = hit.payload as {
        pageContent: string;
        metadata: Record<string, unknown>;
        chunk_id?: string;
      };
      const metadata = {
        ...(payload.metadata || payload),
        chunk_id: payload.chunk_id || payload.metadata?.chunk_id,
      };
      return {
        document: new Document({
          pageContent: payload.pageContent,
          metadata,
        }),
        score: hit.score,
      };
    });
  }

  async deleteBySourceId(sourceId: string): Promise<void> {
    await chunkRepository.deleteBySourceId(sourceId);
    await qdrantClient.delete(config.qdrantCollectionName, {
      filter: {
        must: [
          {
            key: 'metadata.source_id',
            match: { value: sourceId },
          },
        ],
      },
    });
    console.log(`🗑️ Deleted vectors and DB chunks for sourceId: "${sourceId}".`);
  }
}
