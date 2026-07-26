import { statusService } from './status.service';

export interface NotebookModel {
  id: string;
  title: string;
  description?: string;
  color: string;
  icon: string;
  sourceCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const initialNotebooks: NotebookModel[] = [
  {
    id: 'nb-1',
    title: 'Machine Learning Notes',
    description: 'Core machine learning & deep learning concepts',
    color: 'indigo',
    icon: 'BookOpen',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'nb-2',
    title: 'RAG Research',
    description: 'Retrieval Augmented Generation papers & architecture notes',
    color: 'green',
    icon: 'Database',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: 'nb-3',
    title: 'Python Tutorials',
    description: 'Advanced Python, asyncio and framework guides',
    color: 'blue',
    icon: 'FileText',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'nb-4',
    title: 'System Design',
    description: 'Distributed systems, indexing, and databases',
    color: 'orange',
    icon: 'Layout',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

export class NotebookService {
  private notebooks: Map<string, NotebookModel> = new Map();

  constructor() {
    initialNotebooks.forEach((nb) => this.notebooks.set(nb.id, nb));
  }

  async getAllNotebooks(): Promise<NotebookModel[]> {
    const list = Array.from(this.notebooks.values());
    const allStatuses = statusService.getAllStatuses();

    return list.map((nb) => {
      const sourcesForNb = allStatuses.filter((s) => s.notebookId === nb.id);
      return {
        ...nb,
        sourceCount: Math.max(sourcesForNb.length, nb.id === 'nb-1' ? 4 : 0),
      };
    });
  }

  async getNotebookById(id: string): Promise<NotebookModel | undefined> {
    const nb = this.notebooks.get(id);
    if (!nb) return undefined;
    const allStatuses = statusService.getAllStatuses();
    const sourcesForNb = allStatuses.filter((s) => s.notebookId === id);
    return {
      ...nb,
      sourceCount: Math.max(sourcesForNb.length, id === 'nb-1' ? 4 : 0),
    };
  }

  async createNotebook(data: { title: string; description?: string; color?: string; icon?: string }): Promise<NotebookModel> {
    const id = `nb-${Date.now()}`;
    const newNotebook: NotebookModel = {
      id,
      title: data.title || 'Untitled Notebook',
      description: data.description || '',
      color: data.color || 'indigo',
      icon: data.icon || 'BookOpen',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.notebooks.set(id, newNotebook);
    return newNotebook;
  }

  async updateNotebook(id: string, data: Partial<{ title: string; description: string; color: string; icon: string }>): Promise<NotebookModel | undefined> {
    const existing = this.notebooks.get(id);
    if (!existing) {
      // Auto-create if updating non-existent notebook
      const created: NotebookModel = {
        id,
        title: data.title || 'Untitled Notebook',
        description: data.description || '',
        color: data.color || 'indigo',
        icon: data.icon || 'BookOpen',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.notebooks.set(id, created);
      return created;
    }

    const updated: NotebookModel = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.notebooks.set(id, updated);
    return updated;
  }

  async deleteNotebook(id: string): Promise<boolean> {
    return this.notebooks.delete(id);
  }

  async getSourcesForNotebook(notebookId: string) {
    const allStatuses = statusService.getAllStatuses();
    return allStatuses.filter((s) => s.notebookId === notebookId);
  }
}

export const notebookService = new NotebookService();
