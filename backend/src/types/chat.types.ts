import { SourceMetadata } from './source.types';

export interface ChatRequest {
  message: string;
  notebookId?: string;
}

export interface CitedSource {
  citationNumber: number;
  source_id: string;
  source_type: string;
  title: string;
  url?: string;
  domain?: string;
  pageNumber?: number;
  totalPages?: number;
  startSeconds?: number;
  timelineSegment?: {
    start: string;
    startSeconds: number;
    end: string;
    endSeconds: number;
  };
  charOffset?: { start: number; end: number };
  retrievedChunk: string;
  similarity: number;
}
