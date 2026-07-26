import { prisma } from '../db/prisma.client';

export type PipelineStage =
  | 'queued'
  | 'uploading'
  | 'validating'
  | 'scanning'
  | 'extracting'
  | 'cleaning'
  | 'chunking'
  | 'embedding'
  | 'vectorizing'
  | 'indexing'
  | 'ready'
  | 'failed';

export class IngestionJobService {
  async createJob(sourceId: string): Promise<string> {
    const job = await prisma.ingestionJob.create({
      data: {
        sourceId,
        status: 'queued',
        stage: 'queued',
        progress: 0,
        attempts: 1,
        events: {
          create: {
            stage: 'queued',
            message: 'Ingestion job queued for background processing.',
          },
        },
      },
    });

    await prisma.source.update({
      where: { id: sourceId },
      data: {
        stage: 'queued',
        indexingProgress: 0,
      },
    });

    return job.id;
  }

  async recordStageEvent(
    jobId: string,
    sourceId: string,
    stage: PipelineStage,
    progress: number,
    message: string,
    failureCode?: string,
    failureDetail?: string
  ) {
    const status = stage === 'failed' ? 'failed' : stage === 'ready' ? 'ready' : 'processing';

    await prisma.$transaction([
      prisma.ingestionJob.update({
        where: { id: jobId },
        data: {
          stage,
          status,
          progress,
          ...(failureCode ? { failureCode, failureDetail } : {}),
        },
      }),
      prisma.ingestionEvent.create({
        data: {
          jobId,
          stage,
          message,
        },
      }),
      prisma.source.update({
        where: { id: sourceId },
        data: {
          stage,
          indexingProgress: progress,
          ...(stage === 'ready' ? { status: 'READY' } : stage === 'failed' ? { status: 'ERROR', errorMessage: message } : {}),
        },
      }),
    ]);
  }

  async getJobEvents(sourceId: string) {
    const job = await prisma.ingestionJob.findFirst({
      where: { sourceId },
      orderBy: { createdAt: 'desc' },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!job) return [];

    return job.events;
  }
}

export const ingestionJobService = new IngestionJobService();
