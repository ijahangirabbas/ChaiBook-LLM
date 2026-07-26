import { CitedSource } from './chat.types';

export type SSEEventType =
  | 'token'
  | 'token.delta'
  | 'citations'
  | 'done'
  | 'error'
  | 'message.started'
  | 'completed'
  | 'failed';

export interface SSETokenPayload {
  type: 'token';
  content: string;
}

export interface SSETokenDeltaPayload {
  type: 'token.delta';
  text: string;
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

export interface SSEMessageStartedPayload {
  type: 'message.started';
  conversationId?: string;
}

export interface SSECompletedPayload {
  type: 'completed';
  conversationId?: string;
}

export interface SSEFailedPayload {
  type: 'failed';
  error: string;
}

export type SSEPayload =
  | SSETokenPayload
  | SSETokenDeltaPayload
  | SSECitationsPayload
  | SSEDonePayload
  | SSEErrorPayload
  | SSEMessageStartedPayload
  | SSECompletedPayload
  | SSEFailedPayload;
