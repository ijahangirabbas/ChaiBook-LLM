import { Response } from 'express';
import { SSEPayload } from '../types/sse.types';

export function sendSSEEvent(res: Response, payload: SSEPayload): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}
