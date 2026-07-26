import { Router } from 'express';
import sourceRoutes from './source.routes';
import chatRoutes from './chat.routes';
import notebookRoutes from './notebook.routes';
import userRoutes from './user.routes';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

// Require verified authentication for all private v1 API endpoints
router.use(authenticateUser);

router.use(userRoutes);
router.use(notebookRoutes);
router.use(sourceRoutes);
router.use(chatRoutes);

export default router;


