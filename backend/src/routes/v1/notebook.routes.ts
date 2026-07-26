import { Router } from 'express';
import { notebookController } from '../../controllers/notebook.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticateUser);

router.get('/notebooks', (req, res, next) => notebookController.getNotebooks(req, res, next));
router.post('/notebooks', (req, res, next) => notebookController.createNotebook(req, res, next));
router.get('/notebooks/:id', (req, res, next) => notebookController.getNotebookById(req, res, next));
router.patch('/notebooks/:id', (req, res, next) => notebookController.updateNotebook(req, res, next));
router.post('/notebooks/:id/duplicate', (req, res, next) => notebookController.duplicateNotebook(req, res, next));
router.patch('/notebooks/:id/favorite', (req, res, next) => notebookController.favoriteNotebook(req, res, next));
router.patch('/notebooks/:id/archive', (req, res, next) => notebookController.archiveNotebook(req, res, next));
router.delete('/notebooks/:id', (req, res, next) => notebookController.deleteNotebook(req, res, next));
router.get('/notebooks/:id/sources', (req, res, next) => notebookController.getNotebookSources(req, res, next));

export default router;
