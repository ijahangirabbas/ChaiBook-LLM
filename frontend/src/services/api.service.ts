import type { Notebook, SourceIndexingStatus } from '../types';

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
    } catch (e) {}

    const bearerToken = token || 'dev-token';

    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${bearerToken}`,
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
        type: (s.type || 'text').toLowerCase(),
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

  // ─── SSE RAG Chat Endpoint ───────────────────────────────────────────────
  static async streamRAGChat(
    notebookId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (err: any) => void,
    onCitations?: (citations: any[]) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/chat`, {
        method: 'POST',
        headers: await this.headers(true),
        body: JSON.stringify({ message }),
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
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'citations' && Array.isArray(parsed.sources)) {
                if (onCitations) onCitations(parsed.sources);
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
              onChunk(dataStr);
            }
          }
        }
      }
      onComplete();
    } catch (err) {
      onError(err);
    }
  }
}
