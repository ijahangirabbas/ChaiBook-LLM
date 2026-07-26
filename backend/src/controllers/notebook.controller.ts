import { Response, NextFunction } from 'express';
import { notebookService } from '../services/notebook.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class NotebookController {
  // GET /api/v1/notebooks
  async getNotebooks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.user?.workspaceId || 'default';
      const notebooks = await notebookService.getAllNotebooks(workspaceId);
      res.status(200).json({
        success: true,
        data: notebooks,
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
      const notebook = await notebookService.getNotebookById(id, workspaceId);

      if (!notebook) {
        res.status(404).json({
          success: false,
          message: `Notebook with ID "${id}" not found.`,
        });
        return;
      }

      const sources = await notebookService.getSourcesForNotebook(id, workspaceId);

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
      const { title, description, color, icon } = req.body;
      const workspaceId = req.user?.workspaceId || 'default';
      const userId = req.user?.id || 'default-user';

      const newNotebook = await notebookService.createNotebook({
        title,
        description,
        color,
        icon,
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
      const { title, description, color, icon } = req.body;

      const updated = await notebookService.updateNotebook(id, workspaceId, { title, description, color, icon });

      if (!updated) {
        res.status(404).json({
          success: false,
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

  // DELETE /api/v1/notebooks/:id
  async deleteNotebook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const deleted = await notebookService.deleteNotebook(id, workspaceId);

      if (!deleted) {
        res.status(404).json({
          success: false,
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
      const sources = await notebookService.getSourcesForNotebook(id, workspaceId);

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
