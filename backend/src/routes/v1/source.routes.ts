import { Router } from 'express';
import { sourceController } from '../../controllers/source.controller';
import { uploadMiddleware } from '../../middlewares/upload.middleware';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { uploadRateLimitMiddleware } from '../../middlewares/rate-limit.middleware';
import { idempotencyMiddleware } from '../../middlewares/idempotency.middleware';

const router = Router();
router.use(authenticateUser);

// Presigned Upload Intent
router.post(
  '/notebooks/:notebookId/sources/upload-intent',
  uploadRateLimitMiddleware,
  idempotencyMiddleware('upload-intent'),
  (req, res, next) => sourceController.createUploadIntent(req, res, next)
);

router.post(
  '/notebooks/:notebookId/sources',
  uploadRateLimitMiddleware,
  idempotencyMiddleware('upload'),
  uploadMiddleware.single('file'),
  (req, res, next) => sourceController.createSource(req, res, next)
);

// List all workspace sources
router.get(
  '/sources',
  (req, res, next) => sourceController.listWorkspaceSources(req, res, next)
);

// Get Source Indexing Status
router.get(
  '/sources/:sourceId/status',
  (req, res, next) => sourceController.getSourceStatus(req, res, next)
);

// Get Source Ingestion Events Log
router.get(
  '/sources/:sourceId/events',
  (req, res, next) => sourceController.getSourceEvents(req, res, next)
);

// Get Source Preview & Download Metadata
router.get(
  '/sources/:sourceId/preview',
  (req, res, next) => sourceController.getSourcePreview(req, res, next)
);

// Get full source content + chunk offsets
router.get(
  '/sources/:sourceId/content',
  (req, res, next) => sourceController.getSourceContent(req, res, next)
);

// Get transcript segments (YouTube / subtitles)
router.get(
  '/sources/:sourceId/transcript',
  (req, res, next) => sourceController.getSourceTranscript(req, res, next)
);

// Delete Source & Vectors
router.delete(
  '/sources/:sourceId',
  (req, res, next) => sourceController.deleteSource(req, res, next)
);

// Re-index Source
router.post(
  '/sources/:sourceId/reindex',
  (req, res, next) => sourceController.reindexSource(req, res, next)
);

export default router;
