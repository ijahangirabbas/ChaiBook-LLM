import { Request, Response, NextFunction } from 'express';
import { ragService } from '../services/rag.service';

export class ChatController {
  // POST /api/v1/notebooks/:notebookId/chat
  async streamChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Field "message" is required.',
        });
        return;
      }

      await ragService.streamRAGResponse(message, notebookId, res);
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
