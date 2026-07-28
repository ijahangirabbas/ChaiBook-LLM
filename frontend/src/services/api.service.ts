import type { Notebook, SourceIndexingStatus, SourceType } from '../types';

declare global {
  interface Window {
    Clerk?: any;
  }
}

function getApiBaseUrl(): string {
  let raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw) return 'http://localhost:3001/api/v1';
  raw = raw.replace(/\/+$/, '');
  if (!raw.endsWith('/api/v1')) {
    return `${raw}/api/v1`;
  }
  return raw;
}

const API_BASE_URL = getApiBaseUrl();

export class ApiService {
  private static async headers(json = false): Promise<HeadersInit> {
    let token: string | undefined = undefined;

    try {
      if (window.Clerk?.session) {
        token = await window.Clerk.session.getToken();
      }
    } catch {
      // Clerk session unavailable
    }

    if (!token) {
      throw new Error('Authentication required: no valid session token available.');
    }

    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    };
  }

  private static async parseJson(res: Response): Promise<any> {
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      let errorMessage = `Server error ${res.status}`;
      if (contentType.includes('application/json')) {
        try {
          const errData = await res.json();
          errorMessage = errData.message || errData.error || errorMessage;
        } catch {
          // ignore json parse error on error response
        }
      } else {
        const text = await res.text();
        errorMessage = `API endpoint returned HTML (${res.status}). Verify VITE_API_URL environment variable. Summary: ${text.substring(0, 100)}`;
      }
      throw new Error(errorMessage);
    }

    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Expected JSON but received non-JSON response from API (${res.status}). Verify VITE_API_URL. Response summary: ${text.substring(0, 100)}`);
    }

    return res.json();
  }

  // ─── Notebook Endpoints ──────────────────────────────────────────────────
  static async getNotebooks(): Promise<Notebook[]> {
    const res = await fetch(`${API_BASE_URL}/notebooks`, { headers: await this.headers() });
    const json = await this.parseJson(res);
    return (json.data || []).map((nb: any) => ({
      id: nb.id,
      title: nb.title,
      description: nb.description,
      sourceCount: nb.sourceCount || 0,
      updatedAt: new Date(nb.updatedAt),
      color: nb.color || 'indigo',
      icon: nb.icon || 'BookOpen',
    }));
  }

  static detectSourceType(title?: string, url?: string, rawType?: string): SourceType {
    const lowerTitle = (title || '').toLowerCase();
    const lowerUrl = (url || '').toLowerCase();
    const lowerType = (rawType || '').toLowerCase();

    if (lowerTitle.endsWith('.pdf') || lowerType === 'pdf') return 'pdf';
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerType === 'youtube') return 'youtube';
    if (lowerTitle.endsWith('.srt')) return 'srt';
    if (lowerTitle.endsWith('.vtt')) return 'vtt';
    if (lowerTitle.endsWith('.md') || lowerTitle.endsWith('.markdown') || lowerType === 'markdown') return 'markdown';
    if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://') || lowerType === 'webpage') return 'webpage';

    return (lowerType as SourceType) || 'text';
  }

  static async getNotebookById(id: string): Promise<{ notebook: Notebook; sources: any[] }> {
    const res = await fetch(`${API_BASE_URL}/notebooks/${id}`, { headers: await this.headers() });
    const json = await this.parseJson(res);
    const nb = json.data || {};
    const notebook: Notebook = {
      id: nb.id,
      title: nb.title,
      description: nb.description,
      sourceCount: nb.sourceCount || (nb.sources || []).length,
      updatedAt: new Date(nb.updatedAt || Date.now()),
      color: nb.color || 'indigo',
      icon: nb.icon || 'BookOpen',
    };
    const sources = (nb.sources || []).map((s: any, idx: number) => {
      let domainStr = 'Uploaded Source';
      if (s.url) {
        try {
          domainStr = new URL(s.url).hostname;
        } catch {
          domainStr = s.url;
        }
      }
      return {
        id: s.id,
        notebookId: s.notebookId || id,
        type: ApiService.detectSourceType(s.title, s.url, s.type),
        title: s.title || 'Untitled Source',
        url: s.url,
        domain: domainStr,
        number: idx + 1,
        status: s.status || 'ready',
        indexingProgress: s.indexingProgress ?? (s.status === 'ready' ? 100 : 25),
      };
    });
    return { notebook, sources };
  }

  static async createNotebook(data: { title: string; description?: string; color?: string; icon?: string }): Promise<Notebook> {
    const res = await fetch(`${API_BASE_URL}/notebooks`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(data),
    });
    const json = await this.parseJson(res);
    const nb = json.data;
    return {
      id: nb.id,
      title: nb.title,
      description: nb.description,
      sourceCount: 0,
      updatedAt: new Date(nb.updatedAt),
      color: nb.color || 'indigo',
      icon: nb.icon || 'BookOpen',
    };
  }

  static async updateNotebook(id: string, data: { title?: string; description?: string }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notebooks/${id}`, {
      method: 'PATCH',
      headers: await this.headers(true),
      body: JSON.stringify(data),
    });
    await this.parseJson(res);
  }

  static async deleteNotebook(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notebooks/${id}`, { method: 'DELETE', headers: await this.headers() });
    await this.parseJson(res);
  }

  // ─── Source Endpoints ────────────────────────────────────────────────────
  static async uploadSourceFile(notebookId: string, file: File): Promise<{ sourceId: string; status: SourceIndexingStatus }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/sources`, {
      method: 'POST',
      headers: await this.headers(),
      body: formData,
    });
    const json = await this.parseJson(res);
    return {
      sourceId: json.sourceId,
      status: json.status || 'uploading',
    };
  }

  static async addSourceUrl(notebookId: string, url: string, type: 'youtube' | 'webpage'): Promise<{ sourceId: string; status: SourceIndexingStatus }> {
    const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/sources`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify({ url, type }),
    });
    const json = await this.parseJson(res);
    return {
      sourceId: json.sourceId,
      status: json.status || 'uploading',
    };
  }

  static async addSourceContent(notebookId: string, title: string, content: string): Promise<{ sourceId: string; status: SourceIndexingStatus }> {
    const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/sources`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify({ title, content, type: 'text' }),
    });
    const json = await this.parseJson(res);
    return {
      sourceId: json.sourceId,
      status: json.status || 'uploading',
    };
  }

  static async fetchSourceStatus(sourceId: string): Promise<{ status: SourceIndexingStatus; progress: number; errorMessage?: string }> {
    const res = await fetch(`${API_BASE_URL}/sources/${sourceId}/status`, { headers: await this.headers() });
    const json = await this.parseJson(res);
    return {
      status: json.status,
      progress: json.progress ?? 0,
      errorMessage: json.errorMessage,
    };
  }

  static async reindexSource(sourceId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/sources/${sourceId}/reindex`, { method: 'POST', headers: await this.headers() });
    await this.parseJson(res);
  }

  static async deleteSource(sourceId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/sources/${sourceId}`, { method: 'DELETE', headers: await this.headers() });
    await this.parseJson(res);
  }

  static async getSourcePreview(sourceId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/sources/${sourceId}/preview`, { headers: await this.headers() });
      const json = await this.parseJson(res);
      return json.data || null;
    } catch {
      return null;
    }
  }

  // ─── Chat History & Conversation Endpoints ────────────────────────────────
  static async createConversation(notebookId: string, title?: string): Promise<{ id: string; title: string }> {
    const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/conversations`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify({ title }),
    });
    const json = await this.parseJson(res);
    const conv = json.data;
    return { id: conv.id, title: conv.title || title || 'New Conversation' };
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: await this.headers(),
    });
    await this.parseJson(res);
  }

  static async getNotebookConversations(notebookId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/conversations`, { headers: await this.headers() });
    const json = await this.parseJson(res);
    return json.data || [];
  }

  static async getConversationMessages(conversationId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, { headers: await this.headers() });
    const json = await this.parseJson(res);
    const msgs = json.data || [];
    return msgs.map((m: any) => ({
      id: m.id,
      role: (m.role || 'user').toLowerCase(),
      content: m.content,
      timestamp: new Date(m.createdAt || Date.now()),
      sources: m.sources || (m.citations && m.citations.length > 0
        ? m.citations.map((c: any, idx: number) => ({
            id: c.sourceId || c.id || `cite-${idx}`,
            title: c.title || 'Cited Source',
            number: idx + 1,
            chunkId: c.chunkId,
            retrievedChunk: c.snippet,
            pageNumber: c.page,
            similarity: c.score,
            chunks: c.snippet
              ? [{ chunkId: c.chunkId, retrievedChunk: c.snippet, pageNumber: c.page, similarity: c.score }]
              : undefined,
            pagesText: c.page ? `p.${c.page}` : undefined,
          }))
        : undefined),
    }));
  }

  static async getChunkById(chunkId: string): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/chunks/${chunkId}`, { headers: await this.headers() });
      const json = await this.parseJson(res);
      return json.data || null;
    } catch {
      return null;
    }
  }

  static async getSourceContent(sourceId: string): Promise<{
    rawContent: string | null;
    metadata: Record<string, unknown> | null;
    pageCount: number | null;
    chunks: Array<{
      id: string;
      text: string;
      chunkIndex: number;
      pageNumber?: number;
      startSeconds?: number;
      charOffsetStart?: number;
      charOffsetEnd?: number;
    }>;
  } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/sources/${sourceId}/content`, { headers: await this.headers() });
      const json = await this.parseJson(res);
      return json.data || null;
    } catch {
      return null;
    }
  }

  static async getSourceTranscript(sourceId: string): Promise<{
    segments: Array<{ timestamp: string; seconds: number; text: string; isCited?: boolean }>;
  } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/sources/${sourceId}/transcript`, { headers: await this.headers() });
      const json = await this.parseJson(res);
      return json.data || null;
    } catch {
      return null;
    }
  }

  // ─── SSE RAG Chat Endpoint ───────────────────────────────────────────────
  static async streamRAGChat(
    notebookId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (err: unknown) => void,
    onCitations?: (citations: unknown[]) => void,
    options?: {
      signal?: AbortSignal;
      timeoutMs?: number;
      conversationId?: string;
      regenerate?: boolean;
      onConversationStarted?: (conversationId: string) => void;
    }
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 120_000;
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException('Chat stream timed out', 'TimeoutError'));
    }, timeoutMs);

    const relayAbort = () => controller.abort(options?.signal?.reason);
    options?.signal?.addEventListener('abort', relayAbort);

    try {
      const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/chat`, {
        method: 'POST',
        headers: await this.headers(true),
        body: JSON.stringify({
          message,
          ...(options?.conversationId ? { conversationId: options.conversationId } : {}),
          ...(options?.regenerate ? { regenerate: true } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Chat API error (${response.status}): ${text.substring(0, 100)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body reader not available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (controller.signal.aborted) {
          await reader.cancel().catch(() => undefined);
          throw controller.signal.reason || new Error('Stream cancelled');
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') {
            onComplete();
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'message.started' && parsed.conversationId && options?.onConversationStarted) {
              options.onConversationStarted(parsed.conversationId);
            } else if (parsed.type === 'citations' && Array.isArray(parsed.sources)) {
              if (onCitations) onCitations(parsed.sources);
            } else if (parsed.type === 'token.delta' && (parsed.text || parsed.token || parsed.content)) {
              onChunk(parsed.text || parsed.token || parsed.content);
            } else if (parsed.type === 'completed' || parsed.type === 'done') {
              onComplete();
              return;
            } else if (parsed.type === 'failed' || parsed.type === 'error') {
              onError(new Error(parsed.error || parsed.message || 'Stream failed'));
              return;
            } else if (parsed.token || parsed.content || parsed.text) {
              onChunk(parsed.token || parsed.content || parsed.text);
            }
          } catch {
            if (dataStr) onChunk(dataStr);
          }
        }
      }
      onComplete();
    } catch (err) {
      onError(err);
    } finally {
      clearTimeout(timeoutId);
      options?.signal?.removeEventListener('abort', relayAbort);
    }
  }

  // ─── User & Settings ─────────────────────────────────────────────────────
  static async getProfile(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/me`, { headers: await this.headers() });
    const json = await this.parseJson(res);
    return json.data || null;
  }

  static async getSettings(): Promise<{ theme: 'light' | 'dark'; notificationsEnabled: boolean }> {
    const res = await fetch(`${API_BASE_URL}/me/settings`, { headers: await this.headers() });
    const json = await this.parseJson(res);
    return {
      theme: json.data?.theme === 'dark' ? 'dark' : 'light',
      notificationsEnabled: json.data?.notificationsEnabled ?? true,
    };
  }

  static async updateSettings(data: {
    theme?: 'light' | 'dark';
    notificationsEnabled?: boolean;
  }): Promise<{ theme: 'light' | 'dark'; notificationsEnabled: boolean }> {
    const res = await fetch(`${API_BASE_URL}/me/settings`, {
      method: 'PATCH',
      headers: await this.headers(true),
      body: JSON.stringify(data),
    });
    const json = await this.parseJson(res);
    return {
      theme: json.data?.theme === 'dark' ? 'dark' : 'light',
      notificationsEnabled: json.data?.notificationsEnabled ?? true,
    };
  }

  static async exportAccountData(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/me/export`, {
      method: 'POST',
      headers: await this.headers(),
    });
    const json = await this.parseJson(res);
    return json.data;
  }

  static async deleteAccount(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/me`, {
      method: 'DELETE',
      headers: await this.headers(),
    });
    await this.parseJson(res);
  }

  // ─── Search & Workspace Lists ────────────────────────────────────────────
  static async search(query: string): Promise<{
    notebooks: Array<{ id: string; title: string; sourceCount?: number }>;
    sources: Array<{ id: string; title: string; type: string; notebookId: string; notebookTitle: string }>;
    conversations: Array<{ id: string; title: string; notebookId: string; notebookTitle: string }>;
  }> {
    const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`, {
      headers: await this.headers(),
    });
    const json = await this.parseJson(res);
    return json.data || { notebooks: [], sources: [], conversations: [] };
  }

  static async getWorkspaceConversations(): Promise<
    Array<{
      id: string;
      title: string;
      notebookId: string;
      updatedAt: string;
      notebook?: { id: string; title: string };
      _count?: { messages: number };
    }>
  > {
    const res = await fetch(`${API_BASE_URL}/conversations`, { headers: await this.headers() });
    const json = await this.parseJson(res);
    return json.data || [];
  }

  static async getWorkspaceSources(): Promise<
    Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      notebookId: string;
      notebookTitle?: string;
      indexingProgress?: number;
      errorMessage?: string;
    }>
  > {
    const res = await fetch(`${API_BASE_URL}/sources`, { headers: await this.headers() });
    const json = await this.parseJson(res);
    return json.data || [];
  }
}
