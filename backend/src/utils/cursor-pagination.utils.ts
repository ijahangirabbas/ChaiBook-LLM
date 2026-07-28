import { z } from 'zod';

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = val ? parseInt(val, 10) : 20;
      if (Number.isNaN(parsed) || parsed < 1) return 20;
      return Math.min(parsed, 100);
    }),
});

export type CursorPayload = { updatedAt: string; id: string };

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor?: string): CursorPayload | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
    if (!parsed?.id || !parsed?.updatedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildCursorResult<T extends { id: string; updatedAt: Date }>(
  rows: T[],
  limit: number
): { items: T[]; nextCursor: string | null; hasMore: boolean } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ id: last.id, updatedAt: last.updatedAt.toISOString() }) : null;
  return { items, nextCursor, hasMore };
}
