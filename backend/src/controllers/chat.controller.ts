import { Response, NextFunction } from 'express';
import { ragService } from '../services/rag.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { notebookRepository } from '../repositories/notebook.repository';
import { conversationRepository } from '../repositories/conversation.repository';
import { chatStreamSchema } from '../validators';

export class ChatController {
  // POST /api/v1/notebooks/:notebookId/chat
  async streamChat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const validated = chatStreamSchema.parse(req.body);

      // Verify notebook workspace ownership
      const notebook = await notebookRepository.getNotebookById(notebookId, workspaceId);
      if (!notebook) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Notebook with ID "${notebookId}" not found in active workspace.`,
        });
        return;
      }

      // Persist / fetch conversation record
      const conversation = await conversationRepository.getOrCreateConversation(
        notebookId,
        workspaceId
      );

      // Save user message to DB
      await conversationRepository.addMessage({
        conversationId: conversation.id,
        role: 'user',
        content: validated.message,
      });

      await ragService.streamRAGResponse(validated.message, notebookId, res, workspaceId, conversation.id);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/notebooks/:notebookId/conversations
  async getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const conversations = await conversationRepository.getConversationsForNotebook(notebookId, workspaceId);

      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/conversations/:conversationId/messages
  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const messages = await conversationRepository.getMessages(conversationId, workspaceId);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/conversations/:conversationId
  async deleteConversation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const deleted = await conversationRepository.deleteConversation(conversationId, workspaceId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: `Conversation "${conversationId}" not found or unauthorized.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Conversation "${conversationId}" deleted.`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
