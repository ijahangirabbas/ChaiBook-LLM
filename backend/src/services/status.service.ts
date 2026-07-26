import { SourceIndexingState, SourceIndexingStatus, SourceType } from '../types/source.types';

class StatusService {
  private statuses: Map<string, SourceIndexingState> = new Map();

  createStatus(
    sourceId: string,
    notebookId: string,
    title: string,
    type: SourceType,
    status: SourceIndexingStatus = 'uploading',
    progress = 0
  ): SourceIndexingState {
    const state: SourceIndexingState = {
      sourceId,
      notebookId,
      title,
      type,
      status,
      progress,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.statuses.set(sourceId, state);
    return state;
  }

  updateStatus(
    sourceId: string,
    status: SourceIndexingStatus,
    progress?: number,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): SourceIndexingState | undefined {
    const current = this.statuses.get(sourceId);
    if (!current) return undefined;

    current.status = status;
    if (progress !== undefined) {
      current.progress = progress;
    }
    if (errorMessage !== undefined) {
      current.errorMessage = errorMessage;
    }
    if (metadata) {
      current.metadata = { ...current.metadata, ...metadata };
    }
    current.updatedAt = new Date();

    this.statuses.set(sourceId, current);
    return current;
  }

  getStatus(sourceId: string): SourceIndexingState | undefined {
    return this.statuses.get(sourceId);
  }

  deleteStatus(sourceId: string): boolean {
    return this.statuses.delete(sourceId);
  }

  getAllStatuses(): SourceIndexingState[] {
    return Array.from(this.statuses.values());
  }
}

export const statusService = new StatusService();
