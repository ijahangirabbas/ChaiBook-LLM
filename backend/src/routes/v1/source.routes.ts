import { Router } from 'express';
import { sourceController } from '../../controllers/source.controller';
import { uploadMiddleware } from '../../middlewares/upload.middleware';

const router = Router();

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
