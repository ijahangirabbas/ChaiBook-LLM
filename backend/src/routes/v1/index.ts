import { Router } from 'express';
import sourceRoutes from './source.routes';
import chatRoutes from './chat.routes';
import notebookRoutes from './notebook.routes';

const router = Router();

router.use(notebookRoutes);
router.use(sourceRoutes);
router.use(chatRoutes);

export default router;

