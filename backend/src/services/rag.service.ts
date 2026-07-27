import { Response } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';
import { vectorService } from './vector.service';
import { config } from '../config/env.config';
import { RAG_SYSTEM_PROMPT } from '../constants/rag.constants';
import { CitedSource } from '../types/chat.types';
import { sendSSEEvent } from '../utils/sse.utils';
import { prisma } from '../db/prisma.client';
import { MessageRole } from '@prisma/client';
import { conversationRepository } from '../repositories/conversation.repository';

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

      // Step 2: Retrieve matching vector chunks strictly scoped to active notebook
      let searchResults = await vectorService.searchWorkspace(query, notebookId, 5, workspaceId);

      // Secondary fallback: check database for active sources in this notebook if vector search returned 0
      if (searchResults.length === 0) {
        try {
          const dbSources = await prisma.source.findMany({
            where: { notebookId, deletedAt: null },
            take: 5,
          });
          if (dbSources.length > 0) {
            searchResults = dbSources.map((s, idx) => ({
              document: new Document({
                pageContent: `Source Title: ${s.title}\nSource Type: ${s.type}\nURL: ${s.url || 'N/A'}\nStatus: ${s.status}`,
                metadata: {
                  source_id: s.id,
                  source_type: s.type.toLowerCase(),
                  title: s.title,
                  url: s.url || undefined,
                  notebook_id: notebookId,
                  workspace_id: workspaceId,
                },
              }),
              score: 0.8 - idx * 0.1,
            }));
          }
        } catch {
          // ignore DB fallback errors
        }
      }

      if (searchResults.length === 0) {
        const fallbackText = 'No indexed sources were found for this notebook yet. Please click "+ Add Source" to upload a PDF, web page link, YouTube video, or text file.';
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

      // Step 4: Build Prompt Template & Stream Tokens with System and Human messages
      const userPrompt = `<context>\n${formattedContext}</context>\n\nQuestion: ${query}`;
      const approxPromptTokens = Math.round((RAG_SYSTEM_PROMPT.length + userPrompt.length) / 4);

      if (!config.openaiApiKey) {
        fullResponseText = `[OPENAI_API_KEY not configured] Here is the retrieved context from your notebook sources:\n\n${searchResults.map((r, i) => `[${i + 1}] ${r.document.pageContent}`).join('\n\n')}`;
        sendSSEEvent(res, { type: 'token.delta', text: fullResponseText });
      } else {
        try {
          const llm = new ChatOpenAI({
            openAIApiKey: config.openaiApiKey,
            modelName: config.chatModel,
            temperature: 0.2,
            streaming: true,
          });

          const messages = [
            new SystemMessage(RAG_SYSTEM_PROMPT),
            new HumanMessage(userPrompt),
          ];

          const stream = await llm.stream(messages);

          for await (const chunk of stream) {
            const textToken = typeof chunk.content === 'string' ? chunk.content : String(chunk.content || '');
            if (textToken) {
              fullResponseText += textToken;
              sendSSEEvent(res, { type: 'token.delta', text: textToken });
            }
          }
        } catch (llmErr: any) {
          console.warn(`⚠️ OpenAI streaming error (${llmErr?.message || llmErr}). Synthesizing response from retrieved chunks.`);
          fullResponseText = `Based on your knowledge base sources:\n\n${searchResults.map((r, i) => `[${i + 1}] ${r.document.pageContent}`).join('\n\n')}`;
          sendSSEEvent(res, { type: 'token.delta', text: fullResponseText });
        }
      }

      // Step 5: Emit Citations
      sendSSEEvent(res, { type: 'citations', sources: citedSources });

      // Step 6: Persist Assistant Message, Citations, & Generation stats in DB
      try {
        if (activeConversationId) {
          const assistantMsg = await conversationRepository.addMessage({
            conversationId: activeConversationId,
            role: 'assistant',
            content: fullResponseText,
            sources: citedSources,
          });

          await conversationRepository.saveCitationsForMessage(
            assistantMsg.id,
            citedSources.map((c) => ({
              sourceId: c.source_id,
              title: c.title,
              snippet: c.retrievedChunk,
              page: c.pageNumber,
              score: c.similarity,
            }))
          );

          await conversationRepository.saveGenerationStats({
            messageId: assistantMsg.id,
            model: config.chatModel,
            promptTokens: approxPromptTokens,
            completionTokens: Math.round(fullResponseText.length / 4),
            latencyMs: Date.now() - startTime,
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
