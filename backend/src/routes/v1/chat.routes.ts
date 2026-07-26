import { Router } from 'express';
import { chatController } from '../../controllers/chat.controller';
import { sseMiddleware } from '../../middlewares/sse.middleware';

const router = Router();

// SSE Grounded RAG Chat Stream
router.post(
  '/notebooks/:notebookId/chat',
  sseMiddleware,
  (req, res, next) => chatController.streamChat(req, res, next)
);

export default router;
