export type SourceType = 'youtube' | 'pdf' | 'webpage' | 'text' | 'markdown' | 'word' | 'powerpoint' | 'srt' | 'vtt';

export type SourceIndexingStatus = 'uploading' | 'indexing' | 'ready' | 'error';

export interface TranscriptEntry {
  timestamp: string;
  seconds: number;
  text: string;
  isCited?: boolean;
}

export interface TimelineSegment {
  start: string;
  startSeconds: number;
  end: string;
  endSeconds: number;
}

export interface SourceMetadata {
  notebook_id: string;
  source_id: string;
  source_type: SourceType;
  title: string;
  url?: string;
  domain?: string;
  pageNumber?: number;
  totalPages?: number;
  startSeconds?: number;
  timelineSegment?: TimelineSegment;
  charOffset?: { start: number; end: number };
  transcript?: TranscriptEntry[];
  chunkIndex?: number;
}

export interface SourceIndexingState {
  sourceId: string;
  notebookId: string;
  title: string;
  type: SourceType;
  status: SourceIndexingStatus;
  progress: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Partial<SourceMetadata>;
}

export interface IngestSourceRequest {
  type: SourceType;
  url?: string;
  title?: string;
  content?: string; // For raw text/markdown submission
}
