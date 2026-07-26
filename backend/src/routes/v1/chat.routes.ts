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

// Get Notebook Conversations
router.get(
  '/notebooks/:notebookId/conversations',
  (req, res, next) => chatController.getConversations(req, res, next)
);

// Get Conversation Messages
router.get(
  '/conversations/:conversationId/messages',
  (req, res, next) => chatController.getMessages(req, res, next)
);

// Delete Conversation
router.delete(
  '/conversations/:conversationId',
  (req, res, next) => chatController.deleteConversation(req, res, next)
);

export default router;
