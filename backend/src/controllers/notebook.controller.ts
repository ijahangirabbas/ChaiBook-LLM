import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { notebookRepository } from '../repositories/notebook.repository';
import { sourceRepository } from '../repositories/source.repository';
import { createNotebookSchema, updateNotebookSchema, paginationQuerySchema } from '../validators';

export class NotebookController {
  // GET /api/v1/notebooks
  async getNotebooks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.user?.workspaceId || 'default';
      const { page, limit } = paginationQuerySchema.parse(req.query);

      const result = await notebookRepository.getNotebooks(workspaceId, page, limit);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/notebooks/:id
  async getNotebookById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const notebook = await notebookRepository.getNotebookById(id, workspaceId);

      if (!notebook) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Notebook with ID "${id}" not found.`,
        });
        return;
      }

      const sources = await sourceRepository.getSourcesForNotebook(id, workspaceId);

      res.status(200).json({
        success: true,
        data: {
          ...notebook,
          sources,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/notebooks
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

      res.status(201).json({
        success: true,
        data: newNotebook,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/notebooks/:id
  async updateNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const validated = updateNotebookSchema.parse(req.body);

      const updated = await notebookRepository.updateNotebook(id, workspaceId, validated);

      if (!updated) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Notebook with ID "${id}" not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/notebooks/:id/duplicate
  async duplicateNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const userId = req.user?.id || 'default-user';

      const duplicated = await notebookRepository.duplicateNotebook(id, workspaceId, userId);
      if (!duplicated) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Notebook with ID "${id}" not found.`,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: duplicated,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/notebooks/:id/favorite
  async favoriteNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const success = await notebookRepository.toggleFavorite(id, workspaceId);
      if (!success) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Notebook with ID "${id}" not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notebook favorite status toggled.',
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/notebooks/:id/archive
  async archiveNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const success = await notebookRepository.toggleArchive(id, workspaceId);
      if (!success) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Notebook with ID "${id}" not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Notebook archive status toggled.',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/notebooks/:id
  async deleteNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const deleted = await notebookRepository.deleteNotebook(id, workspaceId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Notebook with ID "${id}" not found or already deleted.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Notebook "${id}" deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/notebooks/:id/sources
  async getNotebookSources(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      // Verify notebook ownership
      const notebook = await notebookRepository.getNotebookById(id, workspaceId);
      if (!notebook) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Notebook with ID "${id}" not found.`,
        });
        return;
      }

      const sources = await sourceRepository.getSourcesForNotebook(id, workspaceId);

      res.status(200).json({
        success: true,
        data: sources,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notebookController = new NotebookController();
