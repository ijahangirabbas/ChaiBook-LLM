import { CitedSource } from './chat.types';

export type SSEEventType = 'token' | 'citations' | 'done' | 'error';

export interface SSETokenPayload {
  type: 'token';
  content: string;
}

export interface SSECitationsPayload {
  type: 'citations';
  sources: CitedSource[];
}

export interface SSEDonePayload {
  type: 'done';
}

export interface SSEErrorPayload {
  type: 'error';
  message: string;
}

export type SSEPayload = SSETokenPayload | SSECitationsPayload | SSEDonePayload | SSEErrorPayload;
