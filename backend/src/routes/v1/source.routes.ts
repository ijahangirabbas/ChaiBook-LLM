import { Router } from 'express';
import { sourceController } from '../../controllers/source.controller';
import { uploadMiddleware } from '../../middlewares/upload.middleware';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticateUser);

// Presigned Upload Intent
router.post(
  '/notebooks/:notebookId/sources/upload-intent',
  (req, res, next) => sourceController.createUploadIntent(req, res, next)
);

// Ingest Source into Notebook
router.post(
  '/notebooks/:notebookId/sources',
  uploadMiddleware.single('file'),
  (req, res, next) => sourceController.createSource(req, res, next)
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
