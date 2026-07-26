import { Router } from 'express';
import { chatController } from '../../controllers/chat.controller';
import { sseMiddleware } from '../../middlewares/sse.middleware';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();
router.use(authenticateUser);

// SSE Grounded RAG Chat Stream
router.post(
  '/notebooks/:notebookId/chat',
  sseMiddleware,
  (req, res, next) => chatController.streamChat(req, res, next)
);

export default router;
