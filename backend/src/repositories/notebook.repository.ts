import { prisma } from '../db/prisma.client';
import { NotebookModel } from '../services/notebook.service';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class NotebookRepository {
  async getNotebooks(
    workspaceId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<NotebookModel>> {
    const skip = (page - 1) * limit;

    try {
      const [notebooks, total] = await Promise.all([
        prisma.notebook.findMany({
          where: { workspaceId, deletedAt: null },
          include: {
            _count: {
              select: { sources: { where: { deletedAt: null } } },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notebook.count({
          where: { workspaceId, deletedAt: null },
        }),
      ]);

      const data: NotebookModel[] = notebooks.map((nb) => ({
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

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (err) {
      return {
        data: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 1,
        },
      };
    }
  }

  async getNotebookById(id: string, workspaceId: string): Promise<NotebookModel | undefined> {
    try {
      const nb = await prisma.notebook.findFirst({
        where: { id, workspaceId, deletedAt: null },
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
    } catch (err) {
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
    try {
      const ws = await prisma.workspace.upsert({
        where: { id: data.workspaceId },
        create: {
          id: data.workspaceId,
          name: 'Personal Workspace',
          slug: `ws-${data.workspaceId}`,
        },
        update: {},
      });

      const user = await prisma.user.upsert({
        where: { id: data.userId },
        create: {
          id: data.userId,
          email: `${data.userId}@auth.local`,
          name: 'Workspace User',
          provider: 'system',
        },
        update: {},
      });

      const created = await prisma.notebook.create({
        data: {
          title: data.title,
          description: data.description || '',
          color: data.color || 'indigo',
          icon: data.icon || 'book',
          workspaceId: ws.id,
          userId: user.id,
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
    } catch (err: any) {
      console.warn(`⚠️ Database connection error during createNotebook: ${err.message || err}. Falling back to transient notebook object.`);
      return {
        id: `nb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: data.title,
        description: data.description || undefined,
        color: data.color || 'indigo',
        icon: data.icon || 'book',
        sourceCount: 0,
        workspaceId: data.workspaceId,
        userId: data.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }


  async updateNotebook(
    id: string,
    workspaceId: string,
    data: { title?: string; description?: string; color?: string; icon?: string }
  ): Promise<NotebookModel | undefined> {
    const existing = await prisma.notebook.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });

    if (!existing) return undefined;

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
  }

  async duplicateNotebook(id: string, workspaceId: string, userId: string): Promise<NotebookModel | undefined> {
    const sourceNotebook = await prisma.notebook.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: { sources: { where: { deletedAt: null } } },
    });

    if (!sourceNotebook) return undefined;

    const duplicated = await prisma.notebook.create({
      data: {
        title: `${sourceNotebook.title} (Copy)`,
        description: sourceNotebook.description,
        color: sourceNotebook.color,
        icon: sourceNotebook.icon,
        workspaceId,
        userId,
        sources: {
          create: sourceNotebook.sources.map((s) => ({
            workspaceId,
            type: s.type,
            title: s.title,
            url: s.url,
            s3Key: s.s3Key,
            status: s.status,
          })),
        },
      },
    });

    return {
      id: duplicated.id,
      title: duplicated.title,
      description: duplicated.description || undefined,
      color: duplicated.color,
      icon: duplicated.icon,
      sourceCount: sourceNotebook.sources.length,
      workspaceId: duplicated.workspaceId,
      userId: duplicated.userId,
      createdAt: duplicated.createdAt,
      updatedAt: duplicated.updatedAt,
    };
  }

  async toggleFavorite(id: string, workspaceId: string): Promise<boolean> {
    const existing = await prisma.notebook.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });

    if (!existing) return false;

    await prisma.notebook.update({
      where: { id },
      data: { favoritedAt: existing.favoritedAt ? null : new Date() },
    });

    return true;
  }

  async toggleArchive(id: string, workspaceId: string): Promise<boolean> {
    const existing = await prisma.notebook.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });

    if (!existing) return false;

    await prisma.notebook.update({
      where: { id },
      data: { archivedAt: existing.archivedAt ? null : new Date() },
    });

    return true;
  }

  async deleteNotebook(id: string, workspaceId: string): Promise<boolean> {
    const existing = await prisma.notebook.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });

    if (!existing) return false;

    await prisma.notebook.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return true;
  }
}

export const notebookRepository = new NotebookRepository();
