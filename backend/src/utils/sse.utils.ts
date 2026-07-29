import { Response } from 'express';
import { SSEPayload } from '../types/sse.types';

let eventCounter = 0;

export function resetSSEEventCounter(): void {
  eventCounter = 0;
}

export function sendSSEEvent(res: Response, payload: SSEPayload): number {
  const eventId = ++eventCounter;
  if (!res.writableEnded) {
    res.write(`id: ${eventId}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
  return eventId;
}

export function endSSE(res: Response): void {
  if (!res.writableEnded) {
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

export function getLastEventIdHeader(req: { headers: Record<string, unknown> }): number | null {
  const raw = req.headers['last-event-id'];
  if (!raw || typeof raw !== 'string') return null;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
