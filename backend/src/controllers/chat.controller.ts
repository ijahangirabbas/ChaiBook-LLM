import { Response, NextFunction } from 'express';
import { ragService } from '../services/rag.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { notebookRepository } from '../repositories/notebook.repository';
import { conversationRepository } from '../repositories/conversation.repository';
import { chatStreamSchema, createConversationSchema, cursorPaginationQuerySchema } from '../validators';
import { sendError, sendSuccess } from '../utils/http-response.utils';
import { buildCursorResult, encodeCursor } from '../utils/cursor-pagination.utils';
import { assertTokenBudget } from '../services/workspace-quota.service';
import { runIdempotencyGuard, completeIdempotencyFromResponse } from '../middlewares/idempotency.middleware';
import { RAG_SYSTEM_PROMPT } from '../constants/rag.constants';
import { beginSSE } from '../middlewares/sse.middleware';

export class ChatController {
  async createConversation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const validated = createConversationSchema.parse(req.body);

      const notebook = await notebookRepository.getNotebookById(notebookId, workspaceId);
      if (!notebook) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${notebookId}" not found in active workspace.`);
        return;
      }

      const conversation = await conversationRepository.createConversation(
        notebookId,
        workspaceId,
        validated.title
      );

      sendSuccess(res, conversation, 201);
    } catch (error) {
      next(error);
    }
  }

  async streamChat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const idempotency = await runIdempotencyGuard(req, res, 'chat');
      if (res.headersSent) return;
      if (req.headers['idempotency-key'] && !idempotency) return;

      const { notebookId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const validated = chatStreamSchema.parse(req.body);

      const notebook = await notebookRepository.getNotebookById(notebookId, workspaceId);
      if (!notebook) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${notebookId}" not found in active workspace.`);
        return;
      }

      const estimatedTokens = Math.round(
        (RAG_SYSTEM_PROMPT.length + validated.message.length + 4000) / 4
      );
      await assertTokenBudget(workspaceId, estimatedTokens);

      let conversation;
      if (validated.conversationId) {
        conversation = await conversationRepository.getConversation(
          validated.conversationId,
          notebookId,
          workspaceId
        );
        if (!conversation) {
          sendError(res, 404, 'NOT_FOUND', `Conversation "${validated.conversationId}" not found in this notebook.`);
          return;
        }
      } else {
        conversation = await conversationRepository.createConversation(
          notebookId,
          workspaceId,
          validated.message.slice(0, 40) || 'New Conversation'
        );
      }

      if (!validated.regenerate) {
        await conversationRepository.addMessage({
          conversationId: conversation.id,
          role: 'user',
          content: validated.message,
        });
      }

      // Open SSE only after validation/persistence so JSON errors still work
      beginSSE(res);

      const result = await ragService.streamRAGResponse(
        validated.message,
        notebookId,
        res,
        workspaceId,
        conversation.id
      );

      if (idempotency) {
        await completeIdempotencyFromResponse(idempotency.workspaceId, 'chat', idempotency.key, 200, {
          success: true,
          data: {
            conversationId: conversation.id,
            tokensUsed: result.totalTokens,
            cached: false,
          },
          requestId: req.requestId,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notebookId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const { cursor, limit } = cursorPaginationQuerySchema.parse(req.query);

      const notebook = await notebookRepository.getNotebookById(notebookId, workspaceId);
      if (!notebook) {
        sendError(res, 404, 'NOT_FOUND', `Notebook with ID "${notebookId}" not found.`);
        return;
      }

      const rows = await conversationRepository.getConversationsForNotebook(notebookId, workspaceId, {
        cursor,
        limit,
      });
      const page = buildCursorResult(
        rows.map((r) => ({ ...r, updatedAt: r.updatedAt })),
        limit
      );

      sendSuccess(res, page.items, 200, {
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        limit,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';
      const { cursor, limit } = cursorPaginationQuerySchema.parse(req.query);

      const messages = await conversationRepository.getMessages(conversationId, workspaceId, {
        cursor,
        limit,
      });

      if (messages.length === 0) {
        const conversation = await conversationRepository.getConversationById(conversationId, workspaceId);
        if (!conversation) {
          sendError(res, 404, 'NOT_FOUND', `Conversation "${conversationId}" not found or unauthorized.`);
          return;
        }
      }

      const hasMore = messages.length > limit;
      const items = hasMore ? messages.slice(0, limit) : messages;
      const last = items[items.length - 1];
      const nextCursor =
        hasMore && last
          ? encodeCursor({ id: last.id, updatedAt: last.createdAt.toISOString() })
          : null;

      sendSuccess(res, items, 200, { nextCursor, hasMore, limit });
    } catch (error) {
      next(error);
    }
  }

  async getWorkspaceConversations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.user?.workspaceId || 'default';
      const { cursor, limit } = cursorPaginationQuerySchema.parse(req.query);

      const rows = await conversationRepository.getConversationsForWorkspace(workspaceId, { cursor, limit });
      const page = buildCursorResult(
        rows.map((r) => ({ ...r, updatedAt: r.updatedAt })),
        limit
      );

      sendSuccess(res, page.items, 200, {
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        limit,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteConversation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const deleted = await conversationRepository.deleteConversation(conversationId, workspaceId);

      if (!deleted) {
        sendError(res, 404, 'NOT_FOUND', `Conversation "${conversationId}" not found or unauthorized.`);
        return;
      }

      sendSuccess(res, { conversationId, deleted: true });
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
