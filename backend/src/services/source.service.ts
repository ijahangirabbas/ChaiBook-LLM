import fs from 'fs';
import { LoaderFactory } from '../loaders/loader.factory';
import { LoaderInput } from '../loaders/base.loader';
import { vectorService } from './vector.service';
import { statusService } from './status.service';
import { SourceType } from '../types/source.types';

export interface ProcessSourceParams {
  sourceId: string;
  notebookId: string;
  sourceType: SourceType;
  title: string;
  url?: string;
  filePath?: string;
  rawContent?: string;
}

// In-memory cache of source parameters for re-indexing capability
const sourceParamStore = new Map<string, ProcessSourceParams>();

export class SourceService {
  async processAndIndexSource(params: ProcessSourceParams): Promise<void> {
    const { sourceId, notebookId, sourceType, title } = params;

    // Cache parameters for re-indexing
    sourceParamStore.set(sourceId, params);

    try {
      // Step 1: Update status to indexing (20%)
      statusService.updateStatus(sourceId, 'indexing', 20);

      // Step 2: Select appropriate loader strategy
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

      // Step 3: Parse documents (50%)
      const documents = await loader.load(loaderInput);
      statusService.updateStatus(sourceId, 'indexing', 50);

      // Step 4: Chunk & Upsert into Vector Store (80%)
      statusService.updateStatus(sourceId, 'indexing', 80);
      await vectorService.indexDocuments(documents);

      // Clean up temp file if present
      if (params.filePath && fs.existsSync(params.filePath)) {
        try {
          fs.unlinkSync(params.filePath);
        } catch {
          // ignore cleanup errors
        }
      }

      // Step 5: Mark ready (100%)
      statusService.updateStatus(sourceId, 'ready', 100);
      console.log(`🎉 Source processing complete for sourceId: ${sourceId} (${title})`);
    } catch (error) {
      const errMsg = (error as Error).message || 'Unknown processing error';
      console.error(`❌ Error processing sourceId ${sourceId}:`, errMsg);
      statusService.updateStatus(sourceId, 'error', 0, errMsg);
    }
  }

  async reindexSource(sourceId: string): Promise<void> {
    const cachedParams = sourceParamStore.get(sourceId);
    if (!cachedParams) {
      throw new Error(`Source parameters for sourceId ${sourceId} not found for re-indexing.`);
    }

    // Step 1: Remove existing vectors
    await vectorService.deleteSourceVectors(sourceId);

    // Step 2: Reset status
    statusService.updateStatus(sourceId, 'uploading', 0);

    // Step 3: Trigger background re-indexing
    setImmediate(() => {
      this.processAndIndexSource(cachedParams);
    });
  }

  async deleteSource(sourceId: string): Promise<void> {
    // Step 1: Delete vectors from Qdrant
    await vectorService.deleteSourceVectors(sourceId);

    // Step 2: Remove status entry and cached params
    statusService.deleteStatus(sourceId);
    sourceParamStore.delete(sourceId);

    console.log(`🗑️ Source ${sourceId} completely deleted from system.`);
  }
}

export const sourceService = new SourceService();
