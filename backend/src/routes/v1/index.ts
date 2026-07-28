import { Router } from 'express';
import sourceRoutes from './source.routes';
import chatRoutes from './chat.routes';
import notebookRoutes from './notebook.routes';
import userRoutes from './user.routes';
import chunkRoutes from './chunk.routes';
import searchRoutes from './search.routes';
import openapiRoutes from './openapi.routes';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

router.use(openapiRoutes);

// Require verified authentication for all private v1 API endpoints
router.use(authenticateUser);

router.use(userRoutes);
router.use(notebookRoutes);
router.use(sourceRoutes);
router.use(chatRoutes);
router.use(chunkRoutes);
router.use(searchRoutes);

export default router;


