import { prisma } from '../db/prisma.client';
import { IndexingStatus, SourceType } from '@prisma/client';

export interface NotebookModel {
  id: string;
  title: string;
  description?: string;
  color: string;
  icon: string;
  sourceCount?: number;
  workspaceId?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class NotebookService {
  async getAllNotebooks(workspaceId: string): Promise<NotebookModel[]> {
    try {
      const notebooks = await prisma.notebook.findMany({
        where: {
          workspaceId,
          deletedAt: null,
        },
        include: {
          _count: {
            select: { sources: { where: { deletedAt: null } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return notebooks.map((nb) => ({
        id: nb.id,
        title: nb.title,
        description: nb.description || undefined,
        color: nb.color,
        icon: nb.icon,
        sourceCount: nb._count.sources,
        workspaceId: nb.workspaceId,
        userId: nb.userId,
        createdAt: nb.createdAt,
        updatedAt: nb.updatedAt,
      }));
    } catch (error) {
      return [];
    }
  }

  async getNotebookById(id: string, workspaceId: string): Promise<NotebookModel | undefined> {
    try {
      const nb = await prisma.notebook.findFirst({
        where: {
          id,
          workspaceId,
          deletedAt: null,
        },
        include: {
          _count: {
            select: { sources: { where: { deletedAt: null } } },
          },
        },
      });

      if (!nb) return undefined;

      return {
        id: nb.id,
        title: nb.title,
        description: nb.description || undefined,
        color: nb.color,
        icon: nb.icon,
        sourceCount: nb._count.sources,
        workspaceId: nb.workspaceId,
        userId: nb.userId,
        createdAt: nb.createdAt,
        updatedAt: nb.updatedAt,
      };
    } catch (error) {
      return undefined;
    }
  }

  async createNotebook(data: {
    title: string;
    description?: string;
    color?: string;
    icon?: string;
    workspaceId: string;
    userId: string;
  }): Promise<NotebookModel> {
    const created = await prisma.notebook.create({
      data: {
        title: data.title || 'Untitled Notebook',
        description: data.description || '',
        color: data.color || 'indigo',
        icon: data.icon || 'book',
        workspaceId: data.workspaceId,
        userId: data.userId,
      },
    });

    return {
      id: created.id,
      title: created.title,
      description: created.description || undefined,
      color: created.color,
      icon: created.icon,
      sourceCount: 0,
      workspaceId: created.workspaceId,
      userId: created.userId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async updateNotebook(
    id: string,
    workspaceId: string,
    data: Partial<{ title: string; description: string; color: string; icon: string }>
  ): Promise<NotebookModel | undefined> {
    try {
      const existing = await prisma.notebook.findFirst({
        where: { id, workspaceId, deletedAt: null },
      });

      if (!existing) {
        // Strict 404: Do NOT auto-create non-existent notebook on update
        return undefined;
      }

      const updated = await prisma.notebook.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.icon !== undefined && { icon: data.icon }),
        },
      });

      return {
        id: updated.id,
        title: updated.title,
        description: updated.description || undefined,
        color: updated.color,
        icon: updated.icon,
        workspaceId: updated.workspaceId,
        userId: updated.userId,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      return undefined;
    }
  }

  async deleteNotebook(id: string, workspaceId: string): Promise<boolean> {
    try {
      const existing = await prisma.notebook.findFirst({
        where: { id, workspaceId, deletedAt: null },
      });

      if (!existing) return false;

      // Soft delete
      await prisma.notebook.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSourcesForNotebook(notebookId: string, workspaceId: string) {
    try {
      const sources = await prisma.source.findMany({
        where: {
          notebookId,
          workspaceId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      return sources.map((s) => ({
        id: s.id,
        notebookId: s.notebookId,
        type: s.type,
        title: s.title,
        url: s.url || undefined,
        s3Key: s.s3Key || undefined,
        status: s.status,
        indexingProgress: s.indexingProgress,
        errorMessage: s.errorMessage || undefined,
        createdAt: s.createdAt,
      }));
    } catch (error) {
      return [];
    }
  }
}

export const notebookService = new NotebookService();
