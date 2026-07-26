import { Response } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { vectorService } from './vector.service';
import { config } from '../config/env.config';
import { RAG_SYSTEM_PROMPT } from '../constants/rag.constants';
import { CitedSource } from '../types/chat.types';
import { sendSSEEvent } from '../utils/sse.utils';

export class RagService {
  async streamRAGResponse(
    query: string,
    notebookId: string,
    res: Response
  ): Promise<void> {
    try {
      // Step 1: Retrieve top 5 matching chunks filtered by notebookId
      const searchResults = await vectorService.searchWorkspace(query, notebookId, 5);

      if (searchResults.length === 0) {
        sendSSEEvent(res, {
          type: 'token',
          content: 'I could not find any relevant information or sources in this notebook to answer your question.',
        });
        sendSSEEvent(res, { type: 'citations', sources: [] });
        sendSSEEvent(res, { type: 'done' });
        return;
      }

      // Step 2: Format context text with explicit index tags [1], [2], etc.
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

      // Step 3: Build Prompt Template
      const promptTemplate = PromptTemplate.fromTemplate(RAG_SYSTEM_PROMPT);
      const formattedPrompt = await promptTemplate.format({
        context: formattedContext,
        question: query,
      });

      // Step 4: Initialize ChatOpenAI with streaming
      const llm = new ChatOpenAI({
        openAIApiKey: config.openaiApiKey,
        modelName: config.chatModel,
        temperature: 0.2,
        streaming: true,
      });

      // Step 5: Stream Tokens over SSE
      const stream = await llm.stream(formattedPrompt);

      for await (const chunk of stream) {
        const textToken = typeof chunk.content === 'string' ? chunk.content : String(chunk.content || '');
        if (textToken) {
          sendSSEEvent(res, { type: 'token', content: textToken });
        }
      }

      // Step 6: Send Citations Payload for UI Drawer deep linking
      sendSSEEvent(res, { type: 'citations', sources: citedSources });

      // Step 7: Signal Completion
      sendSSEEvent(res, { type: 'done' });
    } catch (error) {
      const errMsg = (error as Error).message || 'An error occurred during RAG generation.';
      console.error('❌ Error in RagService:', errMsg);
      sendSSEEvent(res, { type: 'error', message: errMsg });
    }
  }
}

export const ragService = new RagService();
