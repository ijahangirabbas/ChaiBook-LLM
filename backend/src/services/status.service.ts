import { SourceIndexingState, SourceIndexingStatus, SourceType } from '../types/source.types';
import { prisma } from '../db/prisma.client';
import { IndexingStatus, SourceType as PrismaSourceType } from '@prisma/client';

class StatusService {
  private memoryCache: Map<string, SourceIndexingState> = new Map();

  private mapPrismaStatus(status: IndexingStatus): SourceIndexingStatus {
    switch (status) {
      case IndexingStatus.UPLOADING:
        return 'uploading';
      case IndexingStatus.INDEXING:
        return 'indexing';
      case IndexingStatus.READY:
        return 'ready';
      case IndexingStatus.ERROR:
      default:
        return 'error';
    }
  }

  private mapToPrismaStatus(status: SourceIndexingStatus): IndexingStatus {
    switch (status) {
      case 'uploading':
        return IndexingStatus.UPLOADING;
      case 'indexing':
        return IndexingStatus.INDEXING;
      case 'ready':
        return IndexingStatus.READY;
      case 'error':
      default:
        return IndexingStatus.ERROR;
    }
  }

  async createStatus(
    sourceId: string,
    notebookId: string,
    title: string,
    type: SourceType,
    status: SourceIndexingStatus = 'uploading',
    progress = 0,
    workspaceId = 'default'
  ): Promise<SourceIndexingState> {
    const state: SourceIndexingState = {
      sourceId,
      notebookId,
      title,
      type,
      status,
      progress,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.memoryCache.set(sourceId, state);

    try {
      await prisma.source.upsert({
        where: { id: sourceId },
        create: {
          id: sourceId,
          notebookId,
          workspaceId,
          title,
          type: (type.toUpperCase() as PrismaSourceType) || PrismaSourceType.TEXT,
          status: this.mapToPrismaStatus(status),
          indexingProgress: progress,
        },
        update: {
          title,
          status: this.mapToPrismaStatus(status),
          indexingProgress: progress,
        },
      });
    } catch {
      // Ignore DB errors during cache fallback
    }

    return state;
  }

  async updateStatus(
    sourceId: string,
    status: SourceIndexingStatus,
    progress?: number,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<SourceIndexingState | undefined> {
    const current = this.memoryCache.get(sourceId) || {
      sourceId,
      notebookId: 'unknown',
      title: 'Source',
      type: 'text' as SourceType,
      status,
      progress: progress || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    current.status = status;
    if (progress !== undefined) {
      current.progress = progress;
    }
    if (errorMessage !== undefined) {
      current.errorMessage = errorMessage;
    }
    if (metadata) {
      current.metadata = { ...current.metadata, ...metadata };
    }
    current.updatedAt = new Date();

    this.memoryCache.set(sourceId, current);

    try {
      await prisma.source.update({
        where: { id: sourceId },
        data: {
          status: this.mapToPrismaStatus(status),
          indexingProgress: progress !== undefined ? progress : undefined,
          errorMessage: errorMessage !== undefined ? errorMessage : undefined,
        },
      });
    } catch {
      // Ignore DB errors during cache update
    }

    return current;
  }

  async getStatus(sourceId: string): Promise<SourceIndexingState | undefined> {
    const cached = this.memoryCache.get(sourceId);
    if (cached) return cached;

    try {
      const source = await prisma.source.findUnique({ where: { id: sourceId } });
      if (!source) return undefined;

      const state: SourceIndexingState = {
        sourceId: source.id,
        notebookId: source.notebookId,
        title: source.title,
        type: source.type.toLowerCase() as SourceType,
        status: this.mapPrismaStatus(source.status),
        progress: source.indexingProgress,
        errorMessage: source.errorMessage || undefined,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      };

      this.memoryCache.set(sourceId, state);
      return state;
    } catch {
      return undefined;
    }
  }

  async deleteStatus(sourceId: string): Promise<boolean> {
    this.memoryCache.delete(sourceId);
    try {
      await prisma.source.update({
        where: { id: sourceId },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAllStatuses(workspaceId?: string): Promise<SourceIndexingState[]> {
    try {
      const sources = await prisma.source.findMany({
        where: {
          ...(workspaceId ? { workspaceId } : {}),
          deletedAt: null,
        },
      });

      if (sources.length > 0) {
        return sources.map((s) => ({
          sourceId: s.id,
          notebookId: s.notebookId,
          title: s.title,
          type: s.type.toLowerCase() as SourceType,
          status: this.mapPrismaStatus(s.status),
          progress: s.indexingProgress,
          errorMessage: s.errorMessage || undefined,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }));
      }
    } catch {
      // Fallback to in-memory cache
    }

    return Array.from(this.memoryCache.values());
  }
}

export const statusService = new StatusService();
