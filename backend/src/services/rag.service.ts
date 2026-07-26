import { Response } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { vectorService } from './vector.service';
import { config } from '../config/env.config';
import { RAG_SYSTEM_PROMPT } from '../constants/rag.constants';
import { CitedSource } from '../types/chat.types';
import { sendSSEEvent } from '../utils/sse.utils';
import { prisma } from '../db/prisma.client';
import { MessageRole } from '@prisma/client';

export class RagService {
  async streamRAGResponse(
    query: string,
    notebookId: string,
    res: Response,
    workspaceId = 'default',
    conversationId?: string
  ): Promise<void> {
    const startTime = Date.now();
    let fullResponseText = '';

    try {
      // Step 1: Ensure or create Conversation record in DB
      let activeConversationId = conversationId;
      try {
        if (!activeConversationId) {
          const conv = await prisma.conversation.create({
            data: {
              workspaceId,
              notebookId,
              title: query.slice(0, 40) || 'New Conversation',
            },
          });
          activeConversationId = conv.id;
        }

        // Persist User Message
        await prisma.message.create({
          data: {
            conversationId: activeConversationId,
            role: MessageRole.USER,
            content: query,
          },
        });
      } catch {
        // DB fallback if offline
      }

      sendSSEEvent(res, { type: 'message.started', conversationId: activeConversationId });

      // Step 2: Retrieve matching vector chunks with workspace filter
      const searchResults = await vectorService.searchWorkspace(query, notebookId, 5, workspaceId);

      if (searchResults.length === 0) {
        const fallbackText = 'I could not find any relevant information or sources in this notebook to answer your question.';
        sendSSEEvent(res, { type: 'token', content: fallbackText });
        sendSSEEvent(res, { type: 'token.delta', text: fallbackText });
        sendSSEEvent(res, { type: 'citations', sources: [] });
        sendSSEEvent(res, { type: 'completed' });
        sendSSEEvent(res, { type: 'done' });

        try {
          if (activeConversationId) {
            await prisma.message.create({
              data: {
                conversationId: activeConversationId,
                role: MessageRole.ASSISTANT,
                content: fallbackText,
              },
            });
          }
        } catch {
          // Ignore DB save errors
        }
        return;
      }

      // Step 3: Format context text with explicit index tags
      let formattedContext = '';
      const citedSources: CitedSource[] = [];

      searchResults.forEach((res, index) => {
        const citationNum = index + 1;
        const meta = res.document.metadata;

        formattedContext += `--- SOURCE [${citationNum}] ---\nTitle: ${meta.title || 'Untitled'}\nType: ${meta.source_type || 'Unknown'}\nContent: ${res.document.pageContent}\n\n`;

        citedSources.push({
          citationNumber: citationNum,
          source_id: meta.source_id || '',
          source_type: meta.source_type || 'text',
          title: meta.title || 'Untitled Source',
          url: meta.url,
          domain: meta.domain,
          pageNumber: meta.pageNumber,
          totalPages: meta.totalPages,
          startSeconds: meta.startSeconds,
          timelineSegment: meta.timelineSegment,
          charOffset: meta.charOffset,
          retrievedChunk: res.document.pageContent,
          similarity: parseFloat(res.score.toFixed(4)),
        });
      });

      // Step 4: Build Prompt Template & Stream Tokens
      const promptTemplate = PromptTemplate.fromTemplate(RAG_SYSTEM_PROMPT);
      const formattedPrompt = await promptTemplate.format({
        context: formattedContext,
        question: query,
      });

      const llm = new ChatOpenAI({
        openAIApiKey: config.openaiApiKey,
        modelName: config.chatModel,
        temperature: 0.2,
        streaming: true,
      });

      const stream = await llm.stream(formattedPrompt);

      for await (const chunk of stream) {
        const textToken = typeof chunk.content === 'string' ? chunk.content : String(chunk.content || '');
        if (textToken) {
          fullResponseText += textToken;
          sendSSEEvent(res, { type: 'token', content: textToken });
          sendSSEEvent(res, { type: 'token.delta', text: textToken });
        }
      }

      // Step 5: Emit Citations
      sendSSEEvent(res, { type: 'citations', sources: citedSources });

      // Step 6: Persist Assistant Message & Generation stats in DB
      try {
        if (activeConversationId) {
          const assistantMsg = await prisma.message.create({
            data: {
              conversationId: activeConversationId,
              role: MessageRole.ASSISTANT,
              content: fullResponseText,
              sources: JSON.parse(JSON.stringify(citedSources)),
            },
          });

          await prisma.generation.create({
            data: {
              messageId: assistantMsg.id,
              model: config.chatModel,
              promptTokens: formattedPrompt.length / 4,
              completionTokens: fullResponseText.length / 4,
              latencyMs: Date.now() - startTime,
            },
          });
        }
      } catch {
        // Ignore DB save errors
      }

      sendSSEEvent(res, { type: 'completed', conversationId: activeConversationId });
      sendSSEEvent(res, { type: 'done' });
    } catch (error) {
      const errMsg = (error as Error).message || 'An error occurred during RAG generation.';
      console.error('❌ Error in RagService:', errMsg);
      sendSSEEvent(res, { type: 'failed', error: errMsg });
      sendSSEEvent(res, { type: 'error', message: errMsg });
    }
  }
}

export const ragService = new RagService();
