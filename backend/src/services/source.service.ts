import fs from 'fs';
import { LoaderFactory } from '../loaders/loader.factory';
import { LoaderInput } from '../loaders/base.loader';
import { vectorService } from './vector.service';
import { statusService } from './status.service';
import { SourceType } from '../types/source.types';
import { prisma } from '../db/prisma.client';

export interface ProcessSourceParams {
  sourceId: string;
  notebookId: string;
  workspaceId?: string;
  sourceType: SourceType;
  title: string;
  url?: string;
  filePath?: string;
  rawContent?: string;
  jobId?: string;
}

export class SourceService {
  async processAndIndexSource(params: ProcessSourceParams): Promise<void> {
    const { sourceId, notebookId, workspaceId = 'default', sourceType, title } = params;

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

  async reindexSource(sourceId: string, workspaceId = 'default'): Promise<void> {
    const dbSource = await prisma.source.findFirst({
      where: { id: sourceId, deletedAt: null },
    });

    if (!dbSource) {
      throw new Error(`Source ${sourceId} not found in database for re-indexing.`);
    }

    const sourceType = dbSource.type.toLowerCase() as SourceType;
    const processParams: ProcessSourceParams = {
      sourceId: dbSource.id,
      notebookId: dbSource.notebookId,
      workspaceId: dbSource.workspaceId || workspaceId,
      sourceType,
      title: dbSource.title,
      url: dbSource.url || undefined,
    };

    await vectorService.deleteSourceVectors(sourceId);
    await statusService.updateStatus(sourceId, 'uploading', 0);

    setImmediate(() => {
      this.processAndIndexSource(processParams);
    });
  }

  async deleteSource(sourceId: string, workspaceId = 'default'): Promise<void> {
    await vectorService.deleteSourceVectors(sourceId);
    await statusService.deleteStatus(sourceId);
    console.log(`🗑️ Source ${sourceId} completely deleted from system.`);
  }
}

export const sourceService = new SourceService();
