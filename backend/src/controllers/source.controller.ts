import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sourceService } from '../services/source.service';
import { statusService } from '../services/status.service';
import { SourceType } from '../types/source.types';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class SourceController {
  // POST /api/v1/notebooks/:notebookId/sources
  async createSource(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const file = req.file;
      const url = req.body.url;
      const content = req.body.content;

      if (!file && !url && !content) {
        res.status(400).json({
          success: false,
          code: 'MISSING_SOURCE_DATA',
          message: 'No file, URL, or raw text content was provided in the upload request.',
        });
        return;
      }

      const sourceType = (req.body.type || (file ? this.detectFileType(file.originalname) : 'text')) as SourceType;
      const title = req.body.title || (file ? file.originalname : url || 'Untitled Source');

      const sourceId = uuidv4();

      // Initialize status in DB / statusService (with FK safety)
      await statusService.createStatus(sourceId, notebookId, title, sourceType, 'uploading', 10, workspaceId);

      // Launch background processing
      setImmediate(() => {
        sourceService.processAndIndexSource({
          sourceId,
          notebookId,
          workspaceId,
          sourceType,
          title,
          url,
          filePath: file?.path,
          rawContent: content,
        });
      });

      // Immediate 202 Accepted response
      res.status(202).json({
        success: true,
        sourceId,
        notebookId,
        workspaceId,
        status: 'uploading',
        progress: 10,
        message: 'Source upload accepted. Processing started in background.',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/sources/:sourceId/status
  async getSourceStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      const statusState = await statusService.getStatus(sourceId);

      if (!statusState) {
        res.status(404).json({
          success: false,
          message: `Source status for ID "${sourceId}" not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        sourceId: statusState.sourceId,
        status: statusState.status,
        progress: statusState.progress,
        errorMessage: statusState.errorMessage,
        updatedAt: statusState.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/sources/:sourceId
  async deleteSource(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      await sourceService.deleteSource(sourceId);

      res.status(200).json({
        success: true,
        sourceId,
        message: `Source "${sourceId}" and its vectors deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/sources/:sourceId/reindex
  async reindexSource(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      await sourceService.reindexSource(sourceId);

      res.status(202).json({
        success: true,
        sourceId,
        status: 'uploading',
        message: `Re-indexing triggered for source "${sourceId}".`,
      });
    } catch (error) {
      next(error);
    }
  }

  private detectFileType(filename: string): SourceType {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.vtt')) return 'vtt';
    if (lower.endsWith('.srt')) return 'srt';
    if (lower.endsWith('.md')) return 'markdown';
    return 'text';
  }
}

export const sourceController = new SourceController();
