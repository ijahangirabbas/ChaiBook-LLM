import { Prisma } from '@prisma/client';
import { IndexingStatus, SourceType as PrismaSourceType } from '@prisma/client';
import { prisma } from '../db/prisma.client';
import { SourceIndexingStatus, SourceType } from '../types/source.types';
import { invalidateNotebookCache } from '../services/notebook-cache.service';

export class SourceRepository {
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

  async createSource(data: {
    sourceId?: string;
    notebookId: string;
    workspaceId: string;
    title: string;
    type: SourceType;
    url?: string;
    s3Key?: string;
    contentType?: string;
    sizeBytes?: number;
    checksum?: string;
    rawContent?: string;
    status?: SourceIndexingStatus;
  }) {
    let prismaType: PrismaSourceType = PrismaSourceType.TEXT;
    const upperType = data.type ? data.type.toUpperCase() : 'TEXT';
    if (Object.values(PrismaSourceType).includes(upperType as PrismaSourceType)) {
      prismaType = upperType as PrismaSourceType;
    }

    const created = await prisma.source.create({
      data: {
        ...(data.sourceId ? { id: data.sourceId } : {}),
        notebookId: data.notebookId,
        workspaceId: data.workspaceId,
        title: data.title,
        type: prismaType,
        url: data.url,
        s3Key: data.s3Key,
        contentType: data.contentType,
        sizeBytes: data.sizeBytes,
        checksum: data.checksum,
        rawContent: data.rawContent,
        status: this.mapToPrismaStatus(data.status || 'uploading'),
        indexingProgress: 0,
      },
    });

    await invalidateNotebookCache(data.workspaceId);

    return {
      id: created.id,
      notebookId: created.notebookId,
      workspaceId: created.workspaceId,
      title: created.title,
      type: created.type.toLowerCase() as SourceType,
      url: created.url || undefined,
      s3Key: created.s3Key || undefined,
      status: this.mapPrismaStatus(created.status),
      indexingProgress: created.indexingProgress,
      createdAt: created.createdAt,
    };
  }

  async updateSourceS3Key(
    sourceId: string,
    workspaceId: string,
    s3Key: string,
    contentType?: string
  ): Promise<boolean> {
    const updated = await prisma.source.updateMany({
      where: { id: sourceId, workspaceId, deletedAt: null },
      data: {
        s3Key,
        ...(contentType ? { contentType } : {}),
      },
    });
    return updated.count > 0;
  }

  async updateSourceStatus(
    sourceId: string,
    workspaceId: string,
    status: SourceIndexingStatus,
    progress?: number,
    errorMessage?: string
  ) {
    const updated = await prisma.source.updateMany({
      where: { id: sourceId, workspaceId, deletedAt: null },
      data: {
        status: this.mapToPrismaStatus(status),
        ...(progress !== undefined ? { indexingProgress: progress } : {}),
        ...(errorMessage !== undefined ? { errorMessage } : {}),
      },
    });

    return updated.count > 0;
  }

  async getSourceById(sourceId: string, workspaceId: string) {
    const source = await prisma.source.findFirst({
      where: { id: sourceId, workspaceId, deletedAt: null },
    });

    if (!source) return undefined;

    return {
      id: source.id,
      notebookId: source.notebookId,
      workspaceId: source.workspaceId,
      title: source.title,
      type: source.type.toLowerCase() as SourceType,
      url: source.url || undefined,
      s3Key: source.s3Key || undefined,
      status: this.mapPrismaStatus(source.status),
      indexingProgress: source.indexingProgress,
      errorMessage: source.errorMessage || undefined,
      rawContent: source.rawContent || undefined,
      metadataJson: source.metadataJson || undefined,
      pageCount: source.pageCount || undefined,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }

  async updateSourceContent(
    sourceId: string,
    workspaceId: string,
    data: { rawContent?: string; metadataJson?: Record<string, unknown>; pageCount?: number }
  ): Promise<void> {
    await prisma.source.updateMany({
      where: { id: sourceId, workspaceId, deletedAt: null },
      data: {
        ...(data.rawContent !== undefined ? { rawContent: data.rawContent } : {}),
        ...(data.metadataJson !== undefined ? { metadataJson: data.metadataJson as Prisma.InputJsonValue } : {}),
        ...(data.pageCount !== undefined ? { pageCount: data.pageCount } : {}),
      },
    });
  }

  async getSourcesForNotebook(notebookId: string, workspaceId: string) {
    const sources = await prisma.source.findMany({
      where: { notebookId, workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return sources.map((s) => ({
      id: s.id,
      notebookId: s.notebookId,
      workspaceId: s.workspaceId,
      title: s.title,
      type: s.type.toLowerCase() as SourceType,
      url: s.url || undefined,
      s3Key: s.s3Key || undefined,
      status: this.mapPrismaStatus(s.status),
      indexingProgress: s.indexingProgress,
      errorMessage: s.errorMessage || undefined,
      createdAt: s.createdAt,
    }));
  }

  async getSourcesForWorkspace(
    workspaceId: string,
    options?: { cursor?: string | null; limit?: number }
  ) {
    const limit = options?.limit ?? 20;
    const cursor = options?.cursor
      ? (JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8')) as { updatedAt: string; id: string })
      : null;

    const sources = await prisma.source.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(cursor
          ? {
              OR: [
                { updatedAt: { lt: new Date(cursor.updatedAt) } },
                { updatedAt: new Date(cursor.updatedAt), id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        notebook: { select: { id: true, title: true } },
      },
    });

    return sources.map((s) => ({
      id: s.id,
      notebookId: s.notebookId,
      notebookTitle: s.notebook.title,
      workspaceId: s.workspaceId,
      title: s.title,
      type: s.type.toLowerCase() as SourceType,
      url: s.url || undefined,
      status: this.mapPrismaStatus(s.status),
      indexingProgress: s.indexingProgress,
      errorMessage: s.errorMessage || undefined,
      updatedAt: s.updatedAt,
    }));
  }

  async deleteSource(sourceId: string, workspaceId: string): Promise<boolean> {
    const updated = await prisma.source.updateMany({
      where: { id: sourceId, workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (updated.count > 0) {
      await invalidateNotebookCache(workspaceId);
    }

    return updated.count > 0;
  }
}

export const sourceRepository = new SourceRepository();
