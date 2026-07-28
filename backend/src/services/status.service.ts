import { SourceIndexingState, SourceIndexingStatus, SourceType } from '../types/source.types';
import { prisma } from '../db/prisma.client';
import { IndexingStatus, SourceType as PrismaSourceType } from '@prisma/client';

class StatusService {
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
    workspaceId = 'default',
    rawContent?: string,
    url?: string
  ): Promise<SourceIndexingState> {
    let prismaType: PrismaSourceType = PrismaSourceType.TEXT;
    const upperType = type ? type.toUpperCase() : 'TEXT';
    if (Object.values(PrismaSourceType).includes(upperType as PrismaSourceType)) {
      prismaType = upperType as PrismaSourceType;
    }

    const created = await prisma.source.upsert({
      where: { id: sourceId },
      create: {
        id: sourceId,
        notebookId,
        workspaceId,
        title,
        type: prismaType,
        status: this.mapToPrismaStatus(status),
        indexingProgress: progress,
        ...(rawContent ? { rawContent } : {}),
        ...(url ? { url } : {}),
      },
      update: {
        title,
        status: this.mapToPrismaStatus(status),
        indexingProgress: progress,
        ...(rawContent ? { rawContent } : {}),
        ...(url ? { url } : {}),
      },
    });

    return {
      sourceId: created.id,
      notebookId: created.notebookId,
      title: created.title,
      type: created.type.toLowerCase() as SourceType,
      status: this.mapPrismaStatus(created.status),
      progress: created.indexingProgress,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async updateStatus(
    sourceId: string,
    status: SourceIndexingStatus,
    progress?: number,
    errorMessage?: string
  ): Promise<SourceIndexingState | undefined> {
    try {
      const updated = await prisma.source.update({
        where: { id: sourceId },
        data: {
          status: this.mapToPrismaStatus(status),
          ...(progress !== undefined ? { indexingProgress: progress } : {}),
          ...(errorMessage !== undefined ? { errorMessage } : {}),
        },
      });

      return {
        sourceId: updated.id,
        notebookId: updated.notebookId,
        title: updated.title,
        type: updated.type.toLowerCase() as SourceType,
        status: this.mapPrismaStatus(updated.status),
        progress: updated.indexingProgress,
        errorMessage: updated.errorMessage || undefined,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch {
      return undefined;
    }
  }

  async getStatus(sourceId: string, workspaceId?: string): Promise<SourceIndexingState | undefined> {
    try {
      const source = await prisma.source.findFirst({
        where: {
          id: sourceId,
          deletedAt: null,
          ...(workspaceId ? { workspaceId } : {}),
        },
      });
      if (!source || source.deletedAt) return undefined;

      return {
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
    } catch {
      return undefined;
    }
  }

  async deleteStatus(sourceId: string): Promise<boolean> {
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
    } catch {
      return [];
    }
  }
}

export const statusService = new StatusService();
