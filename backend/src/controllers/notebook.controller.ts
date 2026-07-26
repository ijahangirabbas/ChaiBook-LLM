import { Request, Response, NextFunction } from 'express';
import { notebookService } from '../services/notebook.service';

export class NotebookController {
  // GET /api/v1/notebooks
  async getNotebooks(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notebooks = await notebookService.getAllNotebooks();
      res.status(200).json({
        success: true,
        data: notebooks,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/notebooks/:id
  async getNotebookById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const notebook = await notebookService.getNotebookById(id);

      if (!notebook) {
        res.status(404).json({
          success: false,
          message: `Notebook with ID "${id}" not found.`,
        });
        return;
      }

      const sources = await notebookService.getSourcesForNotebook(id);

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
  async createNotebook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, description, color, icon } = req.body;
      const newNotebook = await notebookService.createNotebook({ title, description, color, icon });

      res.status(201).json({
        success: true,
        data: newNotebook,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/notebooks/:id
  async updateNotebook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, color, icon } = req.body;
      const updated = await notebookService.updateNotebook(id, { title, description, color, icon });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/notebooks/:id
  async deleteNotebook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await notebookService.deleteNotebook(id);

      res.status(200).json({
        success: true,
        message: `Notebook "${id}" deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/notebooks/:id/sources
  async getNotebookSources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const sources = await notebookService.getSourcesForNotebook(id);

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
