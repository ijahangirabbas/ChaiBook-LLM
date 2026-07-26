import { Response, NextFunction } from 'express';
import { ragService } from '../services/rag.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class ChatController {
  // POST /api/v1/notebooks/:notebookId/chat
  async streamChat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const { message, conversationId } = req.body;
      const workspaceId = req.user?.workspaceId || 'default';

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          code: 'BAD_REQUEST',
          message: 'Field "message" is required.',
        });
        return;
      }

      await ragService.streamRAGResponse(message, notebookId, res, workspaceId, conversationId);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
