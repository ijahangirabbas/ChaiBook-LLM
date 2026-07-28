import fs from 'fs';
import { LoaderFactory } from '../loaders/loader.factory';
import { LoaderInput } from '../loaders/base.loader';
import { vectorService } from './vector.service';
import { statusService } from './status.service';
import { s3Service } from './s3.service';
import { SourceType } from '../types/source.types';
import { prisma } from '../db/prisma.client';
import { enqueueIngestionJob } from '../queue/ingestion.queue';
import { sourceRepository } from '../repositories/source.repository';
import { Document } from '@langchain/core/documents';

export interface ProcessSourceParams {
  sourceId: string;
  notebookId: string;
  workspaceId?: string;
  sourceType: SourceType;
  title: string;
  url?: string;
  filePath?: string;
  s3Key?: string;
  rawContent?: string;
  jobId?: string;
}

export class SourceService {
  async processAndIndexSource(params: ProcessSourceParams): Promise<void> {
    const { sourceId, notebookId, workspaceId = 'default', sourceType, title } = params;
    let resolvedFilePath = params.filePath;
    let tempDownloadPath: string | undefined;

    try {
      await statusService.updateStatus(sourceId, 'indexing', 20);

      if (!resolvedFilePath && params.s3Key) {
        tempDownloadPath = await s3Service.downloadToTempFile(params.s3Key);
        resolvedFilePath = tempDownloadPath;
      }

      const loader = LoaderFactory.getLoader(sourceType);

      const loaderInput: LoaderInput = {
        notebookId,
        sourceId,
        sourceType,
        title,
        url: params.url,
        filePath: resolvedFilePath,
        rawContent: params.rawContent,
      };

      const documents = await loader.load(loaderInput);

      documents.forEach((doc) => {
        doc.metadata = {
          ...doc.metadata,
          workspace_id: workspaceId,
          notebook_id: notebookId,
          source_id: sourceId,
        };
      });

      await statusService.updateStatus(sourceId, 'indexing', 50);
      await this.persistSourceContent(sourceId, workspaceId, sourceType, documents);
      await statusService.updateStatus(sourceId, 'indexing', 80);
      await vectorService.indexDocuments(documents);

      if (params.filePath && fs.existsSync(params.filePath)) {
        try {
          fs.unlinkSync(params.filePath);
        } catch {
          // ignore local cleanup errors
        }
      }

      await statusService.updateStatus(sourceId, 'ready', 100);
      console.log(`🎉 Source processing complete for sourceId: ${sourceId} (${title})`);
    } catch (error) {
      const errMsg = (error as Error).message || 'Unknown processing error';
      console.error(`❌ Error processing sourceId ${sourceId}:`, errMsg);
      await statusService.updateStatus(sourceId, 'error', 0, errMsg);
      throw error;
    } finally {
      if (tempDownloadPath && fs.existsSync(tempDownloadPath)) {
        try {
          fs.unlinkSync(tempDownloadPath);
        } catch {
          // ignore temp cleanup errors
        }
      }
    }
  }

  private async persistSourceContent(
    sourceId: string,
    workspaceId: string,
    sourceType: SourceType,
    documents: Document[]
  ): Promise<void> {
    if (documents.length === 0) return;

    if (sourceType === 'webpage') {
      const meta = documents[0].metadata || {};
      await sourceRepository.updateSourceContent(sourceId, workspaceId, {
        rawContent: documents.map((d) => d.pageContent).join('\n\n'),
        metadataJson: {
          fetchedAt: meta.fetchedAt,
          pageTitle: meta.pageTitle,
          domain: meta.domain,
        },
      });
      return;
    }

    if (sourceType === 'youtube') {
      const segments: Array<{ timestamp: string; seconds: number; text: string }> = [];
      const seen = new Set<number>();
      for (const doc of documents) {
        const entries = doc.metadata?.transcript as Array<{ timestamp: string; seconds: number; text: string }> | undefined;
        if (!entries) continue;
        for (const entry of entries) {
          if (seen.has(entry.seconds)) continue;
          seen.add(entry.seconds);
          segments.push(entry);
        }
      }
      segments.sort((a, b) => a.seconds - b.seconds);
      await sourceRepository.updateSourceContent(sourceId, workspaceId, {
        metadataJson: { transcript: segments },
      });
      return;
    }

    if (sourceType === 'pdf') {
      await sourceRepository.updateSourceContent(sourceId, workspaceId, {
        pageCount: documents.length,
      });
      return;
    }

    if (sourceType === 'text' || sourceType === 'markdown') {
      const existing = await prisma.source.findFirst({
        where: { id: sourceId, workspaceId },
        select: { rawContent: true },
      });
      if (!existing?.rawContent) {
        await sourceRepository.updateSourceContent(sourceId, workspaceId, {
          rawContent: documents.map((d) => d.pageContent).join('\n\n'),
        });
      }
    }
  }

  async reindexSource(sourceId: string, workspaceId = 'default'): Promise<void> {
    const dbSource = await prisma.source.findFirst({
      where: { id: sourceId, workspaceId, deletedAt: null },
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
      s3Key: dbSource.s3Key || undefined,
      rawContent: dbSource.rawContent || undefined,
    };

    await vectorService.deleteSourceVectors(sourceId);
    await statusService.updateStatus(sourceId, 'uploading', 0);
    await enqueueIngestionJob(processParams);
  }

  async deleteSource(sourceId: string, workspaceId = 'default'): Promise<void> {
    const dbSource = await prisma.source.findFirst({
      where: { id: sourceId, workspaceId, deletedAt: null },
    });

    if (dbSource?.s3Key) {
      try {
        await s3Service.deleteFile(dbSource.s3Key);
      } catch (err) {
        console.warn(`⚠️ Failed to delete S3 object for source ${sourceId}:`, (err as Error).message);
      }
    }

    await vectorService.deleteSourceVectors(sourceId);
    await statusService.deleteStatus(sourceId);
    console.log(`🗑️ Source ${sourceId} completely deleted from system.`);
  }
}

export const sourceService = new SourceService();
