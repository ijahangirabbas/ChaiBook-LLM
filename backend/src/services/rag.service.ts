import { Response } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { vectorService } from './vector.service';
import { config } from '../config/env.config';
import { RAG_SYSTEM_PROMPT } from '../constants/rag.constants';
import { CitedSource } from '../types/chat.types';
import { sendSSEEvent, resetSSEEventCounter } from '../utils/sse.utils';
import { conversationRepository } from '../repositories/conversation.repository';
import { recordTokenUsage } from './workspace-quota.service';
import { llmTokensTotal } from '../lib/metrics';

function emptyTokenStats() {
  return { totalTokens: 0, promptTokens: 0, completionTokens: 0 };
}

export class RagService {
  async streamRAGResponse(
    query: string,
    notebookId: string,
    res: Response,
    workspaceId = 'default',
    conversationId?: string
  ): Promise<{ totalTokens: number; promptTokens: number; completionTokens: number }> {
    const startTime = Date.now();
    let fullResponseText = '';
    let completionTokens = 0;

    try {
      resetSSEEventCounter();
      const activeConversationId = conversationId;

      if (!activeConversationId) {
        sendSSEEvent(res, { type: 'failed', error: 'Missing conversation ID for chat stream.' });
        sendSSEEvent(res, { type: 'error', message: 'Missing conversation ID for chat stream.' });
        return emptyTokenStats();
      }

      sendSSEEvent(res, { type: 'message.started', conversationId: activeConversationId });

      const searchResults = await vectorService.searchWorkspace(query, notebookId, 5, workspaceId);

      if (searchResults.length === 0) {
        const fallbackText =
          'No indexed sources were found for this notebook yet. Please click "+ Add Source" to upload a PDF, web page link, YouTube video, or text file.';
        sendSSEEvent(res, { type: 'token.delta', text: fallbackText });
        sendSSEEvent(res, { type: 'citations', sources: [] });
        sendSSEEvent(res, { type: 'completed' });
        sendSSEEvent(res, { type: 'done' });

        try {
          await conversationRepository.addMessage({
            conversationId: activeConversationId,
            role: 'assistant',
            content: fallbackText,
          });
        } catch {
          // Ignore DB save errors
        }
        return emptyTokenStats();
      }

      let formattedContext = '';
      const citedSources: CitedSource[] = [];

      searchResults.forEach((result, index) => {
        const citationNum = index + 1;
        const meta = result.document.metadata;
        const chunkId = String(meta.chunk_id || '');

        formattedContext += `<source id="${citationNum}" chunk_id="${chunkId}" trusted="false">\nTitle: ${meta.title || 'Untitled'}\nType: ${meta.source_type || 'Unknown'}\nContent: ${result.document.pageContent}\n</source>\n\n`;

        citedSources.push({
          citationNumber: citationNum,
          chunk_id: chunkId || undefined,
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
          retrievedChunk: result.document.pageContent,
          similarity: parseFloat(result.score.toFixed(4)),
        });
      });

      const userPrompt = `<context>\n${formattedContext}</context>\n\nQuestion: ${query}`;
      let promptTokens = Math.round((RAG_SYSTEM_PROMPT.length + userPrompt.length) / 4);

      let clientDisconnected = false;
      const onClose = () => {
        clientDisconnected = true;
      };
      res.on('close', onClose);

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
            streamUsage: true,
            ...(config.openaiBaseUrl ? { configuration: { baseURL: config.openaiBaseUrl } } : {}),
          });

          const stream = await llm.stream([
            new SystemMessage(RAG_SYSTEM_PROMPT),
            new HumanMessage(userPrompt),
          ]);

          let actualPromptTokens = 0;
          let actualCompletionTokens = 0;

          for await (const chunk of stream) {
            if (clientDisconnected) break;

            if (chunk.usage_metadata) {
              actualPromptTokens = chunk.usage_metadata.input_tokens || actualPromptTokens;
              actualCompletionTokens = chunk.usage_metadata.output_tokens || actualCompletionTokens;
            }

            const textToken = typeof chunk.content === 'string' ? chunk.content : String(chunk.content || '');
            if (textToken) {
              fullResponseText += textToken;
              sendSSEEvent(res, { type: 'token.delta', text: textToken });
            }
          }

          if (actualPromptTokens > 0) {
            promptTokens = actualPromptTokens;
          }
          if (actualCompletionTokens > 0) {
            completionTokens = actualCompletionTokens;
          } else {
            completionTokens = Math.round(fullResponseText.length / 4);
          }
        } catch (llmErr: any) {
          if (clientDisconnected) {
            res.off('close', onClose);
            return emptyTokenStats();
          }
          console.error(
            `❌ LLM Streaming Error for model 'openai/gpt-oss-120b':`,
            llmErr?.message || llmErr
          );
          if (llmErr?.response?.data) {
            console.error('❌ Provider Error Details:', JSON.stringify(llmErr.response.data));
          }
          fullResponseText = `[LLM Error: ${llmErr?.message || 'Streaming failed'}]. Synthesized response from retrieved chunks:\n\n${searchResults.map((r, i) => `[${i + 1}] ${r.document.pageContent}`).join('\n\n')}`;
          sendSSEEvent(res, { type: 'token.delta', text: fullResponseText });
          completionTokens = Math.round(fullResponseText.length / 4);
        }
      }

      if (clientDisconnected) {
        res.off('close', onClose);
        return emptyTokenStats();
      }

      if (!completionTokens) {
        completionTokens = Math.round(fullResponseText.length / 4);
      }
      const totalTokens = promptTokens + completionTokens;

      sendSSEEvent(res, { type: 'citations', sources: citedSources });

      try {
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
            chunkId: c.chunk_id,
            title: c.title,
            snippet: c.retrievedChunk,
            page: c.pageNumber,
            score: c.similarity,
          }))
        );

        await conversationRepository.saveGenerationStats({
          messageId: assistantMsg.id,
          model: config.chatModel,
          promptTokens,
          completionTokens,
          latencyMs: Date.now() - startTime,
        });
      } catch {
        // Ignore DB save errors
      }

      await recordTokenUsage(workspaceId, totalTokens);
      llmTokensTotal.inc({ type: 'prompt' }, promptTokens);
      llmTokensTotal.inc({ type: 'completion' }, completionTokens);

      sendSSEEvent(res, { type: 'completed', conversationId: activeConversationId });
      sendSSEEvent(res, { type: 'done' });
      res.off('close', onClose);

      return { totalTokens, promptTokens, completionTokens };
    } catch (error) {
      const errMsg = (error as Error).message || 'An error occurred during RAG generation.';
      console.error('❌ Error in RagService:', errMsg);
      sendSSEEvent(res, { type: 'failed', error: errMsg });
      sendSSEEvent(res, { type: 'error', message: errMsg });
      return emptyTokenStats();
    }
  }
}

export const ragService = new RagService();
