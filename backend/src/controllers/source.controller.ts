import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sourceService } from '../services/source.service';
import { statusService } from '../services/status.service';
import { s3Service } from '../services/s3.service';
import { SourceType } from '../types/source.types';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { notebookRepository } from '../repositories/notebook.repository';
import { sourceRepository } from '../repositories/source.repository';
import { chunkRepository } from '../repositories/chunk.repository';
import { secondsToTimeString } from '../utils/timestamp.utils';
import { enqueueIngestionJob } from '../queue/ingestion.queue';
import { ingestionJobService } from '../services/job.service';
import { config } from '../config/env.config';
import { uploadIntentSchema, createSourceSchema, cursorPaginationQuerySchema } from '../validators';
import { assertSafeUrl } from '../utils/url-safety.utils';
import { validateUploadedFile } from '../utils/file-validation.utils';
import { sendError, sendSuccess, sendJson } from '../utils/http-response.utils';
import { buildCursorResult } from '../utils/cursor-pagination.utils';
import {
  assertIngestionConcurrency,
  incrementIngestionConcurrency,
} from '../services/workspace-quota.service';

export class SourceController {
  // POST /api/v1/notebooks/:notebookId/sources/upload-intent
  async createUploadIntent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const validated = uploadIntentSchema.parse(req.body);
      const { filename, contentType } = validated;

      const notebook = await notebookRepository.getNotebookById(notebookId, workspaceId);
      if (!notebook) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${notebookId}" not found in active workspace.`);
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

      sendSuccess(res, {
        sourceId,
        s3Key,
        uploadUrl: presigned?.uploadUrl || null,
        expiresInSeconds: 3600,
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
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${notebookId}" not found in active workspace.`);
        return;
      }

      const file = req.file;
      const validated = createSourceSchema.parse({
        type: req.body.type,
        title: req.body.title,
        url: req.body.url,
        content: req.body.content,
      });

      if (!file && !validated.url && !validated.content) {
        sendError(res, 400, 'MISSING_SOURCE_DATA', 'No file, URL, or raw text content was provided in the upload request.');
        return;
      }

      const sourceType = (file
        ? validateUploadedFile(file.path, file.originalname, file.mimetype || '')
        : validated.type || 'text') as SourceType;
      const title = validated.title || (file ? file.originalname : validated.url || 'Untitled Source');

      if (validated.url && (sourceType === 'webpage' || sourceType === 'youtube')) {
        await assertSafeUrl(validated.url);
      }

      await assertIngestionConcurrency(workspaceId);

      const sourceId = uuidv4();
      let s3Key: string | undefined;
      const url = validated.url;
      const content = validated.content;

      if (file) {
        s3Key = `workspaces/${workspaceId}/notebooks/${notebookId}/sources/${sourceId}-${file.originalname}`;
        const uploaded = await s3Service.uploadFile(
          file.path,
          s3Key,
          file.mimetype || 'application/octet-stream'
        );
        if (!uploaded) {
          if (config.nodeEnv === 'production') {
            throw new Error('S3 upload failed — cannot persist file for ingestion in production.');
          }
          s3Key = undefined;
        }
      }

      // Initialize status and durable source record in DB
      await statusService.createStatus(
        sourceId,
        notebookId,
        title,
        sourceType,
        'uploading',
        10,
        workspaceId,
        content || undefined,
        url || undefined
      );

      if (s3Key) {
        await sourceRepository.updateSourceS3Key(sourceId, workspaceId, s3Key, file?.mimetype);
      }

      // Enqueue job on BullMQ queue with transactional IngestionJob record
      await incrementIngestionConcurrency(workspaceId);
      const { jobId } = await enqueueIngestionJob({
        sourceId,
        notebookId,
        workspaceId,
        sourceType,
        title,
        url,
        s3Key,
        filePath: file?.path,
        rawContent: content,
      });

      // Immediate 202 Accepted response
      sendJson(res, 202, {
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
  // GET /api/v1/sources
  async listWorkspaceSources(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.user?.workspaceId || 'default';
      const { cursor, limit } = cursorPaginationQuerySchema.parse(req.query);
      const rows = await sourceRepository.getSourcesForWorkspace(workspaceId, { cursor, limit });
      const page = buildCursorResult(
        rows.map((r) => ({ id: r.id, updatedAt: r.updatedAt })),
        limit
      );
      const items = page.items.map((item) => rows.find((r) => r.id === item.id)!);

      sendSuccess(res, items, 200, {
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        limit,
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
        sendError(res, 404, 'NOT_FOUND', `Source status for ID "${sourceId}" not found.`);
        return;
      }

      sendJson(res, 200, {
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
        sendError(res, 404, 'NOT_FOUND', `Source "${sourceId}" not found.`);
        return;
      }

      const events = await ingestionJobService.getJobEvents(sourceId);

      sendJson(res, 200, {
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
        sendError(res, 404, 'NOT_FOUND', `Source "${sourceId}" not found.`);
        return;
      }

      let presignedUrl = null;
      if (source.s3Key) {
        presignedUrl = await s3Service.getPresignedDownloadUrl(source.s3Key);
      }

      sendSuccess(res, {
        id: source.id,
        title: source.title,
        type: source.type,
        url: source.url,
        s3Key: source.s3Key,
        presignedDownloadUrl: presignedUrl,
        status: source.status,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/sources/:sourceId/content
  async getSourceContent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const source = await sourceRepository.getSourceById(sourceId, workspaceId);
      if (!source) {
        sendError(res, 404, 'NOT_FOUND', `Source "${sourceId}" not found.`);
        return;
      }

      const chunks = await chunkRepository.getChunksForSource(sourceId, workspaceId);

      sendSuccess(res, {
        sourceId: source.id,
        title: source.title,
        type: source.type,
        url: source.url,
        rawContent: source.rawContent || null,
        metadata: source.metadataJson || null,
        pageCount: source.pageCount || null,
        chunks,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/sources/:sourceId/transcript
  async getSourceTranscript(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const source = await sourceRepository.getSourceById(sourceId, workspaceId);
      if (!source) {
        sendError(res, 404, 'NOT_FOUND', `Source "${sourceId}" not found.`);
        return;
      }

      const metadata = (source.metadataJson || {}) as { transcript?: Array<{ timestamp: string; seconds: number; text: string }> };
      if (metadata.transcript && metadata.transcript.length > 0) {
        sendSuccess(res, { sourceId, segments: metadata.transcript });
        return;
      }

      const chunks = await chunkRepository.getChunksForSource(sourceId, workspaceId);
      const segments = chunks
        .filter((c) => c.startSeconds != null)
        .map((c) => ({
          timestamp: secondsToTimeString(c.startSeconds!),
          seconds: c.startSeconds!,
          text: c.text,
        }));

      sendSuccess(res, { sourceId, segments });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/sources/:sourceId
  async deleteSource(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const deleted = await sourceService.deleteSource(sourceId, workspaceId);
      if (!deleted) {
        sendError(res, 404, 'NOT_FOUND', `Source "${sourceId}" not found or unauthorized.`);
        return;
      }

      sendJson(res, 200, {
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
        sendError(res, 404, 'NOT_FOUND', `Source "${sourceId}" not found or unauthorized.`);
        return;
      }

      await sourceService.reindexSource(sourceId, workspaceId);

      sendJson(res, 202, {
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
