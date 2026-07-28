import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { chunkRepository } from '../repositories/chunk.repository';
import { sendError, sendSuccess } from '../utils/http-response.utils';

export class ChunkController {
  async getChunk(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { chunkId } = req.params;
      const workspaceId = req.user?.workspaceId || 'default';

      const chunk = await chunkRepository.getChunkById(chunkId, workspaceId);
      if (!chunk) {
        sendError(res, 404, 'NOT_FOUND', `Chunk "${chunkId}" not found or unauthorized.`);
        return;
      }

      sendSuccess(res, {
        id: chunk.id,
        sourceId: chunk.sourceId,
        notebookId: chunk.notebookId,
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        startSeconds: chunk.startSeconds,
        charOffsetStart: chunk.charOffsetStart,
        charOffsetEnd: chunk.charOffsetEnd,
        chunkIndex: chunk.chunkIndex,
        embeddingModel: chunk.embeddingModel,
        source: chunk.source,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const chunkController = new ChunkController();
