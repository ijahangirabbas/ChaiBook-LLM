import { Router } from 'express';
import { chatController } from '../../controllers/chat.controller';
import { sseMiddleware } from '../../middlewares/sse.middleware';
import { chatRateLimitMiddleware } from '../../middlewares/rate-limit.middleware';

const router = Router();

router.post(
  '/notebooks/:notebookId/conversations',
  (req, res, next) => chatController.createConversation(req, res, next)
);

router.post(
  '/notebooks/:notebookId/chat',
  chatRateLimitMiddleware,
  sseMiddleware,
  (req, res, next) => chatController.streamChat(req, res, next)
);

// Get Notebook Conversations
router.get(
  '/notebooks/:notebookId/conversations',
  (req, res, next) => chatController.getConversations(req, res, next)
);

// Get workspace-wide conversations
router.get(
  '/conversations',
  (req, res, next) => chatController.getWorkspaceConversations(req, res, next)
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
