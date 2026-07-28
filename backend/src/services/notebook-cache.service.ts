import { redisConnection } from '../queue/ingestion.queue';
import { NotebookModel } from './notebook.service';

const CACHE_TTL_SECONDS = 30;
const KEY_PREFIX = 'cache:notebooks:';

export interface CachedNotebookPage {
  data: NotebookModel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function cacheKey(workspaceId: string, page: number, limit: number): string {
  return `${KEY_PREFIX}${workspaceId}:${page}:${limit}`;
}

export async function getCachedNotebooks(
  workspaceId: string,
  page: number,
  limit: number
): Promise<CachedNotebookPage | null> {
  try {
    const raw = await redisConnection.get(cacheKey(workspaceId, page, limit));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedNotebookPage;
    return {
      ...parsed,
      data: parsed.data.map((nb) => ({
        ...nb,
        createdAt: new Date(nb.createdAt),
        updatedAt: new Date(nb.updatedAt),
      })),
    };
  } catch {
    return null;
  }
}

export async function setCachedNotebooks(
  workspaceId: string,
  page: number,
  limit: number,
  result: CachedNotebookPage
): Promise<void> {
  try {
    await redisConnection.set(
      cacheKey(workspaceId, page, limit),
      JSON.stringify(result),
      'EX',
      CACHE_TTL_SECONDS
    );
  } catch {
    // Cache write failures are non-fatal
  }
}

export async function invalidateNotebookCache(workspaceId: string): Promise<void> {
  try {
    const pattern = `${KEY_PREFIX}${workspaceId}:*`;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisConnection.scan(cursor, 'MATCH', pattern, 'COUNT', 50);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisConnection.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // Cache invalidation failures are non-fatal
  }
}
