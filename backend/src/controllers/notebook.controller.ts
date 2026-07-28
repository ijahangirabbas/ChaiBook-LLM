import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { notebookRepository } from '../repositories/notebook.repository';
import { sourceRepository } from '../repositories/source.repository';
import { createNotebookSchema, updateNotebookSchema, paginationQuerySchema } from '../validators';
import { enqueueIngestionJob } from '../queue/ingestion.queue';
import { prisma } from '../db/prisma.client';
import { SourceType } from '../types/source.types';
import { sendError, sendSuccess } from '../utils/http-response.utils';
import { invalidateNotebookCache } from '../services/notebook-cache.service';

export class NotebookController {
  async getNotebooks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.user?.workspaceId || 'default';
      const { page, limit } = paginationQuerySchema.parse(req.query);

      const result = await notebookRepository.getNotebooks(workspaceId, page, limit);

      sendSuccess(res, result.data, 200, {
        nextCursor: null,
        hasMore: result.pagination.page < result.pagination.totalPages,
        limit,
      });
    } catch (error) {
      next(error);
    }
  }

  async getNotebookById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const notebook = await notebookRepository.getNotebookById(id, workspaceId);

      if (!notebook) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${id}" not found.`);
        return;
      }

      const sources = await sourceRepository.getSourcesForNotebook(id, workspaceId);
      sendSuccess(res, { ...notebook, sources });
    } catch (error) {
      next(error);
    }
  }

  async createNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createNotebookSchema.parse(req.body);
      const workspaceId = req.user?.workspaceId || 'default';
      const userId = req.user?.id || 'default-user';

      const newNotebook = await notebookRepository.createNotebook({
        ...validated,
        workspaceId,
        userId,
      });

      sendSuccess(res, newNotebook, 201);
      await invalidateNotebookCache(workspaceId);
    } catch (error) {
      next(error);
    }
  }

  async updateNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const validated = updateNotebookSchema.parse(req.body);

      const updated = await notebookRepository.updateNotebook(id, workspaceId, validated);

      if (!updated) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${id}" not found.`);
        return;
      }

      sendSuccess(res, updated);
      await invalidateNotebookCache(workspaceId);
    } catch (error) {
      next(error);
    }
  }

  async duplicateNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const userId = req.user?.id || 'default-user';

      const duplicated = await notebookRepository.duplicateNotebook(id, workspaceId, userId);
      if (!duplicated) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${id}" not found.`);
        return;
      }

      const duplicatedSources = await prisma.source.findMany({
        where: { notebookId: duplicated.id, workspaceId, deletedAt: null },
      });

      for (const source of duplicatedSources) {
        await enqueueIngestionJob({
          sourceId: source.id,
          notebookId: duplicated.id,
          workspaceId,
          sourceType: source.type.toLowerCase() as SourceType,
          title: source.title,
          url: source.url || undefined,
          s3Key: source.s3Key || undefined,
          rawContent: source.rawContent || undefined,
        });
      }

      sendSuccess(res, duplicated, 201);
      await invalidateNotebookCache(workspaceId);
    } catch (error) {
      next(error);
    }
  }

  async favoriteNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const success = await notebookRepository.toggleFavorite(id, workspaceId);
      if (!success) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${id}" not found.`);
        return;
      }

      sendSuccess(res, { message: 'Notebook favorite status toggled.' });
      await invalidateNotebookCache(workspaceId);
    } catch (error) {
      next(error);
    }
  }

  async archiveNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const success = await notebookRepository.toggleArchive(id, workspaceId);
      if (!success) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${id}" not found.`);
        return;
      }

      sendSuccess(res, { message: 'Notebook archive status toggled.' });
      await invalidateNotebookCache(workspaceId);
    } catch (error) {
      next(error);
    }
  }

  async deleteNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const deleted = await notebookRepository.deleteNotebook(id, workspaceId);

      if (!deleted) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${id}" not found or already deleted.`);
        return;
      }

      sendSuccess(res, { message: `Notebook "${id}" deleted successfully.` });
      await invalidateNotebookCache(workspaceId);
    } catch (error) {
      next(error);
    }
  }

  async getNotebookSources(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const notebook = await notebookRepository.getNotebookById(id, workspaceId);
      if (!notebook) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${id}" not found.`);
        return;
      }

      const sources = await sourceRepository.getSourcesForNotebook(id, workspaceId);
      sendSuccess(res, sources);
    } catch (error) {
      next(error);
    }
  }
}

export const notebookController = new NotebookController();
