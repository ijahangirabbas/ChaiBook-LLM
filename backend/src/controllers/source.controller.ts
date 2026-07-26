import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sourceService } from '../services/source.service';
import { statusService } from '../services/status.service';
import { s3Service } from '../services/s3.service';
import { SourceType } from '../types/source.types';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { notebookRepository } from '../repositories/notebook.repository';
import { sourceRepository } from '../repositories/source.repository';
import { enqueueIngestionJob } from '../queue/ingestion.queue';
import { ingestionJobService } from '../services/job.service';

export class SourceController {
  // POST /api/v1/notebooks/:notebookId/sources/upload-intent
  async createUploadIntent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const { filename, contentType } = req.body;

      const notebook = await notebookRepository.getNotebookById(notebookId, workspaceId);
      if (!notebook) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Notebook with ID "${notebookId}" not found in active workspace.`,
        });
        return;
      }

      const sourceId = uuidv4();
      const s3Key = `workspaces/${workspaceId}/notebooks/${notebookId}/sources/${sourceId}-${filename || 'upload.bin'}`;

      const presigned = await s3Service.getPresignedUploadUrl(s3Key, contentType || 'application/octet-stream');

      await sourceRepository.createSource({
        sourceId,
        notebookId,
        workspaceId,
        title: filename || 'Direct Upload Source',
        type: this.detectFileType(filename || 'file.txt'),
        s3Key,
        contentType,
        status: 'uploading',
      });

      res.status(200).json({
        success: true,
        data: {
          sourceId,
          s3Key,
          uploadUrl: presigned?.uploadUrl || null,
          expiresInSeconds: 3600,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/notebooks/:notebookId/sources
  async createSource(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      // Enforce notebook ownership check
      const notebook = await notebookRepository.getNotebookById(notebookId, workspaceId);
      if (!notebook) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Notebook with ID "${notebookId}" not found in active workspace.`,
        });
        return;
      }

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

      // Initialize status and durable source record in DB
      await statusService.createStatus(sourceId, notebookId, title, sourceType, 'uploading', 10, workspaceId);

      // Enqueue job on BullMQ queue with transactional IngestionJob record
      const { jobId } = await enqueueIngestionJob({
        sourceId,
        notebookId,
        workspaceId,
        sourceType,
        title,
        url,
        filePath: file?.path,
        rawContent: content,
      });

      // Immediate 202 Accepted response
      res.status(202).json({
        success: true,
        sourceId,
        jobId,
        notebookId,
        workspaceId,
        status: 'uploading',
        progress: 10,
        message: 'Source upload accepted. Enqueued on durable ingestion worker pipeline.',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/sources/:sourceId/status
  async getSourceStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const source = await sourceRepository.getSourceById(sourceId, workspaceId);
      if (!source) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Source status for ID "${sourceId}" not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        sourceId: source.id,
        status: source.status,
        progress: source.indexingProgress,
        errorMessage: source.errorMessage,
        updatedAt: source.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/sources/:sourceId/events
  async getSourceEvents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const source = await sourceRepository.getSourceById(sourceId, workspaceId);
      if (!source) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Source "${sourceId}" not found.`,
        });
        return;
      }

      const events = await ingestionJobService.getJobEvents(sourceId);

      res.status(200).json({
        success: true,
        sourceId,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/sources/:sourceId/preview
  async getSourcePreview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const source = await sourceRepository.getSourceById(sourceId, workspaceId);
      if (!source) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Source "${sourceId}" not found.`,
        });
        return;
      }

      let presignedUrl = null;
      if (source.s3Key) {
        presignedUrl = await s3Service.getPresignedDownloadUrl(source.s3Key);
      }

      res.status(200).json({
        success: true,
        data: {
          id: source.id,
          title: source.title,
          type: source.type,
          url: source.url,
          s3Key: source.s3Key,
          presignedDownloadUrl: presignedUrl,
          status: source.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/sources/:sourceId
  async deleteSource(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const deleted = await sourceRepository.deleteSource(sourceId, workspaceId);
      if (!deleted) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Source "${sourceId}" not found or unauthorized.`,
        });
        return;
      }

      await sourceService.deleteSource(sourceId, workspaceId);

      res.status(200).json({
        success: true,
        sourceId,
        message: `Source "${sourceId}" deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/sources/:sourceId/reindex
  async reindexSource(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const source = await sourceRepository.getSourceById(sourceId, workspaceId);
      if (!source) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Source "${sourceId}" not found or unauthorized.`,
        });
        return;
      }

      await sourceService.reindexSource(sourceId, workspaceId);

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
