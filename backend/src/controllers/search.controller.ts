import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../db/prisma.client';
import { sendSuccess } from '../utils/http-response.utils';

export class SearchController {
  async search(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.user?.workspaceId || 'default';
      const q = String(req.query.q || '').trim();

      if (!q || q.length < 2) {
        sendSuccess(res, { notebooks: [], sources: [], conversations: [] });
        return;
      }

      const [notebooks, sources, conversations] = await Promise.all([
        prisma.notebook.findMany({
          where: {
            workspaceId,
            deletedAt: null,
            title: { contains: q, mode: 'insensitive' },
          },
          orderBy: { updatedAt: 'desc' },
          take: 8,
          select: {
            id: true,
            title: true,
            updatedAt: true,
            _count: { select: { sources: true } },
          },
        }),
        prisma.source.findMany({
          where: {
            workspaceId,
            deletedAt: null,
            title: { contains: q, mode: 'insensitive' },
          },
          orderBy: { updatedAt: 'desc' },
          take: 8,
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            notebookId: true,
            notebook: { select: { title: true } },
          },
        }),
        prisma.conversation.findMany({
          where: {
            workspaceId,
            title: { contains: q, mode: 'insensitive' },
          },
          orderBy: { updatedAt: 'desc' },
          take: 8,
          select: {
            id: true,
            title: true,
            notebookId: true,
            updatedAt: true,
            notebook: { select: { title: true } },
          },
        }),
      ]);

      sendSuccess(res, {
        notebooks: notebooks.map((nb) => ({
          id: nb.id,
          title: nb.title,
          sourceCount: nb._count.sources,
          updatedAt: nb.updatedAt,
        })),
        sources: sources.map((s) => ({
          id: s.id,
          title: s.title,
          type: s.type.toLowerCase(),
          status: s.status.toLowerCase(),
          notebookId: s.notebookId,
          notebookTitle: s.notebook.title,
        })),
        conversations: conversations.map((c) => ({
          id: c.id,
          title: c.title,
          notebookId: c.notebookId,
          notebookTitle: c.notebook.title,
          updatedAt: c.updatedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const searchController = new SearchController();
