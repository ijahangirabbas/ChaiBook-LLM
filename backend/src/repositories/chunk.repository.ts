import crypto from 'crypto';
import { prisma } from '../db/prisma.client';

export interface CreateChunkInput {
  id: string;
  sourceId: string;
  workspaceId: string;
  notebookId: string;
  text: string;
  chunkIndex: number;
  pageNumber?: number;
  startSeconds?: number;
  charOffsetStart?: number;
  charOffsetEnd?: number;
  qdrantPointId: string;
  embeddingModel?: string;
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export class ChunkRepository {
  async createChunks(chunks: CreateChunkInput[]): Promise<void> {
    if (chunks.length === 0) return;

    await prisma.sourceChunk.createMany({
      data: chunks.map((c) => ({
        id: c.id,
        sourceId: c.sourceId,
        workspaceId: c.workspaceId,
        notebookId: c.notebookId,
        text: c.text,
        textHash: hashText(c.text),
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber,
        startSeconds: c.startSeconds,
        charOffsetStart: c.charOffsetStart,
        charOffsetEnd: c.charOffsetEnd,
        qdrantPointId: c.qdrantPointId,
        embeddingModel: c.embeddingModel,
      })),
    });
  }

  async getChunkById(chunkId: string, workspaceId: string) {
    return prisma.sourceChunk.findFirst({
      where: { id: chunkId, workspaceId },
      include: {
        source: {
          select: { id: true, title: true, type: true, url: true, notebookId: true },
        },
      },
    });
  }

  async getChunksForSource(sourceId: string, workspaceId: string) {
    return prisma.sourceChunk.findMany({
      where: { sourceId, workspaceId },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        text: true,
        chunkIndex: true,
        pageNumber: true,
        startSeconds: true,
        charOffsetStart: true,
        charOffsetEnd: true,
      },
    });
  }

  async deleteBySourceId(sourceId: string): Promise<void> {
    await prisma.sourceChunk.deleteMany({ where: { sourceId } });
  }
}

export const chunkRepository = new ChunkRepository();
