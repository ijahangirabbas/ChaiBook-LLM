import type { Notebook, SourceIndexingStatus } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export class ApiService {
  private static async headers(json = false): Promise<HeadersInit> {
    let token: string | undefined = undefined;

    if (isSupabaseConfigured && supabase) {
      const result = await supabase.auth.getSession();
      token = result?.data?.session?.access_token;
    }

    const bearerToken = token || 'dev-token';

    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${bearerToken}`,
    };
  }

  // ─── Notebook Endpoints ──────────────────────────────────────────────────
  static async getNotebooks(): Promise<Notebook[]> {
    const res = await fetch(`${API_BASE_URL}/notebooks`, { headers: await this.headers() });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
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

  static async createNotebook(data: { title: string; description?: string; color?: string; icon?: string }): Promise<Notebook> {
    const res = await fetch(`${API_BASE_URL}/notebooks`, {
      method: 'POST',
      headers: await this.headers(true),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Unable to create this notebook.');
    const json = await res.json();
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
    try {
      await fetch(`${API_BASE_URL}/notebooks/${id}`, {
        method: 'PATCH',
        headers: await this.headers(true),
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn('Failed to update notebook remotely:', err);
    }
  }

  static async deleteNotebook(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/notebooks/${id}`, { method: 'DELETE', headers: await this.headers() });
      if (!response.ok) throw new Error('Unable to delete this notebook.');
    } catch (err) {
      console.warn('Failed to delete notebook remotely:', err);
    }
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
    if (!res.ok) throw new Error('File upload failed');
    const json = await res.json();
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
    if (!res.ok) throw new Error('URL source creation failed');
    const json = await res.json();
    return {
      sourceId: json.sourceId,
      status: json.status || 'uploading',
    };
  }

  static async fetchSourceStatus(sourceId: string): Promise<{ status: SourceIndexingStatus; progress: number; errorMessage?: string }> {
    const res = await fetch(`${API_BASE_URL}/sources/${sourceId}/status`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Source status fetch failed');
    const json = await res.json();
    return {
      status: json.status,
      progress: json.progress ?? 0,
      errorMessage: json.errorMessage,
    };
  }

  static async reindexSource(sourceId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/sources/${sourceId}/reindex`, { method: 'POST', headers: await this.headers() });
  }

  static async deleteSource(sourceId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/sources/${sourceId}`, { method: 'DELETE', headers: await this.headers() });
  }

  // ─── SSE RAG Chat Endpoint ───────────────────────────────────────────────
  static async streamRAGChat(
    notebookId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/chat`, {
        method: 'POST',
        headers: await this.headers(true),
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.statusText}`);
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
              if (parsed.type === 'completed' || parsed.type === 'done') {
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
