import { prisma } from '../db/prisma.client';
import { MessageRole } from '@prisma/client';

export class ConversationRepository {
  async getOrCreateConversation(notebookId: string, workspaceId: string, title?: string) {
    // Ensure parent workspace exists
    const ws = await prisma.workspace.upsert({
      where: { id: workspaceId },
      create: {
        id: workspaceId,
        name: 'Personal Workspace',
        slug: `ws-${workspaceId}`,
      },
      update: {},
    });

    // Ensure parent notebook exists
    await prisma.notebook.upsert({
      where: { id: notebookId },
      create: {
        id: notebookId,
        workspaceId: ws.id,
        title: 'Active Research Notebook',
        userId: 'system',
      },
      update: {},
    });

    let conversation = await prisma.conversation.findFirst({
      where: { notebookId, workspaceId: ws.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { citations: true },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          notebookId,
          workspaceId: ws.id,
          title: title || 'Chat Overview',
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: { citations: true },
          },
        },
      });
    }

    return conversation;
  }

  async getConversationsForNotebook(notebookId: string, workspaceId: string) {
    return prisma.conversation.findMany({
      where: { notebookId, workspaceId },
      orderBy: { updatedAt: 'desc' },
      include: {
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

  async getMessages(conversationId: string, workspaceId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });

    if (!conversation) return [];

    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        citations: true,
        generations: true,
      },
    });
  }
}

export const conversationRepository = new ConversationRepository();
