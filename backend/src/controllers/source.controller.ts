import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sourceService } from '../services/source.service';
import { statusService } from '../services/status.service';
import { SourceType } from '../types/source.types';

export class SourceController {
  // POST /api/v1/notebooks/:notebookId/sources
  async createSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const file = req.file;

      const sourceType = (req.body.type || (file ? this.detectFileType(file.originalname) : 'text')) as SourceType;
      const title = req.body.title || (file ? file.originalname : req.body.url || 'Untitled Source');
      const url = req.body.url;
      const content = req.body.content;

      const sourceId = uuidv4();

      // Initialize status to uploading
      statusService.createStatus(sourceId, notebookId, title, sourceType, 'uploading', 10);

      // Launch async background processing
      setImmediate(() => {
        sourceService.processAndIndexSource({
          sourceId,
          notebookId,
          sourceType,
          title,
          url,
          filePath: file?.path,
          rawContent: content,
        });
      });

      // Immediate 202 Accepted response with sourceId & status
      res.status(202).json({
        success: true,
        sourceId,
        notebookId,
        status: 'uploading',
        progress: 10,
        message: 'Source upload accepted. Processing started in background.',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/sources/:sourceId/status
  async getSourceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      const statusState = statusService.getStatus(sourceId);

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
  async deleteSource(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  async reindexSource(req: Request, res: Response, next: NextFunction): Promise<void> {
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
