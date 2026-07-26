import fs from 'fs';
import { LoaderFactory } from '../loaders/loader.factory';
import { LoaderInput } from '../loaders/base.loader';
import { vectorService } from './vector.service';
import { statusService } from './status.service';
import { SourceType } from '../types/source.types';

export interface ProcessSourceParams {
  sourceId: string;
  notebookId: string;
  workspaceId?: string;
  sourceType: SourceType;
  title: string;
  url?: string;
  filePath?: string;
  rawContent?: string;
}

const sourceParamStore = new Map<string, ProcessSourceParams>();

export class SourceService {
  async processAndIndexSource(params: ProcessSourceParams): Promise<void> {
    const { sourceId, notebookId, workspaceId = 'default', sourceType, title } = params;

    sourceParamStore.set(sourceId, params);

    try {
      await statusService.updateStatus(sourceId, 'indexing', 20);

      const loader = LoaderFactory.getLoader(sourceType);

      const loaderInput: LoaderInput = {
        notebookId,
        sourceId,
        sourceType,
        title,
        url: params.url,
        filePath: params.filePath,
        rawContent: params.rawContent,
      };

      const documents = await loader.load(loaderInput);

      // Enrich document metadata with workspaceId for tenant isolation
      documents.forEach((doc) => {
        doc.metadata = {
          ...doc.metadata,
          workspace_id: workspaceId,
          notebook_id: notebookId,
          source_id: sourceId,
        };
      });

      await statusService.updateStatus(sourceId, 'indexing', 50);

      await statusService.updateStatus(sourceId, 'indexing', 80);
      await vectorService.indexDocuments(documents);

      if (params.filePath && fs.existsSync(params.filePath)) {
        try {
          fs.unlinkSync(params.filePath);
        } catch {
          // ignore cleanup errors
        }
      }

      await statusService.updateStatus(sourceId, 'ready', 100);
      console.log(`🎉 Source processing complete for sourceId: ${sourceId} (${title})`);
    } catch (error) {
      const errMsg = (error as Error).message || 'Unknown processing error';
      console.error(`❌ Error processing sourceId ${sourceId}:`, errMsg);
      await statusService.updateStatus(sourceId, 'error', 0, errMsg);
    }
  }

  async reindexSource(sourceId: string): Promise<void> {
    const cachedParams = sourceParamStore.get(sourceId);
    if (!cachedParams) {
      throw new Error(`Source parameters for sourceId ${sourceId} not found for re-indexing.`);
    }

    await vectorService.deleteSourceVectors(sourceId);
    await statusService.updateStatus(sourceId, 'uploading', 0);

    setImmediate(() => {
      this.processAndIndexSource(cachedParams);
    });
  }

  async deleteSource(sourceId: string): Promise<void> {
    await vectorService.deleteSourceVectors(sourceId);
    await statusService.deleteStatus(sourceId);
    sourceParamStore.delete(sourceId);
    console.log(`🗑️ Source ${sourceId} completely deleted from system.`);
  }
}

export const sourceService = new SourceService();
