import type { Notebook, SourceIndexingStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export class ApiService {
  // ─── Notebook Endpoints ──────────────────────────────────────────────────
  static async getNotebooks(): Promise<Notebook[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/notebooks`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      return json.data.map((nb: any) => ({
        id: nb.id,
        title: nb.title,
        description: nb.description,
        sourceCount: nb.sourceCount || 0,
        updatedAt: new Date(nb.updatedAt),
        color: nb.color || 'indigo',
        icon: nb.icon || 'BookOpen',
      }));
    } catch (err) {
      console.warn('API connection offline, using fallback state:', err);
      return [];
    }
  }

  static async createNotebook(data: { title: string; description?: string; color?: string; icon?: string }): Promise<Notebook> {
    try {
      const res = await fetch(`${API_BASE_URL}/notebooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
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
    } catch (err) {
      const fallbackId = `nb-${Date.now()}`;
      return {
        id: fallbackId,
        title: data.title || 'Untitled Notebook',
        description: data.description,
        sourceCount: 0,
        updatedAt: new Date(),
        color: (data.color as any) || 'indigo',
        icon: data.icon || 'BookOpen',
      };
    }
  }

  static async updateNotebook(id: string, data: { title?: string; description?: string }): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/notebooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn('Failed to update notebook remotely:', err);
    }
  }

  static async deleteNotebook(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/notebooks/${id}`, { method: 'DELETE' });
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
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE_URL}/sources/${sourceId}/status`);
    if (!res.ok) throw new Error('Source status fetch failed');
    const json = await res.json();
    return {
      status: json.status,
      progress: json.progress ?? 0,
      errorMessage: json.errorMessage,
    };
  }

  static async reindexSource(sourceId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/sources/${sourceId}/reindex`, { method: 'POST' });
  }

  static async deleteSource(sourceId: string): Promise<void> {
    await fetch(`${API_BASE_URL}/sources/${sourceId}`, { method: 'DELETE' });
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
        headers: { 'Content-Type': 'application/json' },
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
              if (parsed.token) {
                onChunk(parsed.token);
              } else if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch {
              // Direct string token fallback
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
