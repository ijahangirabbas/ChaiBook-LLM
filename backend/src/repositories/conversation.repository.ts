import { prisma } from '../db/prisma.client';
import { MessageRole } from '@prisma/client';

export class ConversationRepository {
  async getConversation(conversationId: string, notebookId: string, workspaceId: string) {
    return prisma.conversation.findFirst({
      where: { id: conversationId, notebookId, workspaceId },
    });
  }

  async getConversationById(conversationId: string, workspaceId: string) {
    return prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });
  }

  async createConversation(notebookId: string, workspaceId: string, title?: string) {
    return prisma.conversation.create({
      data: {
        notebookId,
        workspaceId,
        title: title || 'New Conversation',
      },
    });
  }

  async getConversationsForNotebook(
    notebookId: string,
    workspaceId: string,
    options?: { cursor?: string | null; limit?: number }
  ) {
    const limit = options?.limit ?? 20;
    const cursor = options?.cursor ? JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8')) as { updatedAt: string; id: string } : null;

    const rows = await prisma.conversation.findMany({
      where: {
        notebookId,
        workspaceId,
        ...(cursor
          ? {
              OR: [
                { updatedAt: { lt: new Date(cursor.updatedAt) } },
                { updatedAt: new Date(cursor.updatedAt), id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        _count: { select: { messages: true } },
      },
    });

    return rows;
  }

  async getConversationsForWorkspace(
    workspaceId: string,
    options?: { cursor?: string | null; limit?: number }
  ) {
    const limit = options?.limit ?? 20;
    const cursor = options?.cursor ? JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8')) as { updatedAt: string; id: string } : null;

    return prisma.conversation.findMany({
      where: {
        workspaceId,
        ...(cursor
          ? {
              OR: [
                { updatedAt: { lt: new Date(cursor.updatedAt) } },
                { updatedAt: new Date(cursor.updatedAt), id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        notebook: { select: { id: true, title: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  async deleteConversation(conversationId: string, workspaceId: string): Promise<boolean> {
    const existing = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });

    if (!existing) return false;

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return true;
  }

  async addMessage(data: {
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: any;
  }) {
    const prismaRole = data.role === 'user' ? MessageRole.USER : MessageRole.ASSISTANT;

    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        role: prismaRole,
        content: data.content,
        sources: data.sources ? JSON.parse(JSON.stringify(data.sources)) : undefined,
      },
    });

    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async saveCitationsForMessage(
    messageId: string,
    citations: Array<{
      sourceId?: string;
      chunkId?: string;
      title: string;
      snippet: string;
      page?: number;
      score?: number;
    }>
  ) {
    if (citations.length === 0) return;

    await prisma.messageCitation.createMany({
      data: citations.map((c) => ({
        messageId,
        sourceId: c.sourceId,
        chunkId: c.chunkId,
        title: c.title,
        snippet: c.snippet,
        page: c.page,
        score: c.score,
      })),
    });
  }

  async saveGenerationStats(data: {
    messageId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
  }) {
    return prisma.generation.create({
      data: {
        messageId: data.messageId,
        model: data.model,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        latencyMs: data.latencyMs,
      },
    });
  }

  async getMessages(
    conversationId: string,
    workspaceId: string,
    options?: { cursor?: string | null; limit?: number }
  ) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });

    if (!conversation) return [];

    const limit = options?.limit ?? 50;
    const cursor = options?.cursor
      ? (JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8')) as { updatedAt: string; id: string })
      : null;

    return prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { gt: new Date(cursor.updatedAt) } },
                { createdAt: new Date(cursor.updatedAt), id: { gt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      include: {
        citations: true,
        generations: true,
      },
    });
  }
}

export const conversationRepository = new ConversationRepository();
