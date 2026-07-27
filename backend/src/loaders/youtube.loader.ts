import { Document } from '@langchain/core/documents';
import { YoutubeTranscript } from 'youtube-transcript';
import { BaseLoader, LoaderInput } from './base.loader';
import { TranscriptEntry, TimelineSegment } from '../types/source.types';
import { secondsToTimeString } from '../utils/timestamp.utils';

export class YoutubeLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    if (!input.url && !input.rawContent) {
      throw new Error('YouTube Loader requires a valid video URL or transcript content.');
    }

    let transcriptEntries: TranscriptEntry[] = [];

    if (input.url) {
      try {
        const rawTranscript = await YoutubeTranscript.fetchTranscript(input.url);
        if (rawTranscript && rawTranscript.length > 0) {
          transcriptEntries = rawTranscript.map((item) => {
            const startSeconds = Math.floor(item.offset / 1000);
            return {
              timestamp: secondsToTimeString(startSeconds),
              seconds: startSeconds,
              text: item.text,
            };
          });
        }
      } catch {
        // Fallback to rawContent if YouTube transcript fetch fails (disabled CC on video)
      }
    }

    if (transcriptEntries.length === 0 && input.rawContent) {
      const lines = input.rawContent.split('\n').filter((l) => l.trim().length > 0);
      transcriptEntries = lines.map((line, idx) => {
        const startSec = idx * 15;
        return {
          timestamp: secondsToTimeString(startSec),
          seconds: startSec,
          text: line.replace(/\[\d{2}:\d{2}:\d{2}\]/, '').trim() || line.trim(),
        };
      });
    }

    if (transcriptEntries.length === 0) {
      throw new Error('No transcripts found for this YouTube video. Verify captions are enabled.');
    }

    const firstSegment = transcriptEntries[0];
    const lastSegment = transcriptEntries[transcriptEntries.length - 1];

    const timelineSegment: TimelineSegment = {
      start: firstSegment.timestamp,
      startSeconds: firstSegment.seconds,
      end: lastSegment.timestamp,
      endSeconds: lastSegment.seconds,
    };

    // Group captions into cohesive paragraph chunks (e.g. 5 caption lines per document chunk)
    const chunkSize = 5;
    const documents: Document[] = [];

    for (let i = 0; i < transcriptEntries.length; i += chunkSize) {
      const chunkItems = transcriptEntries.slice(i, i + chunkSize);
      const combinedText = chunkItems.map((c) => c.text).join(' ');

      const chunkStartSeconds = chunkItems[0].seconds;
      const chunkEndSeconds = chunkItems[chunkItems.length - 1].seconds;

      documents.push(
        new Document({
          pageContent: combinedText,
          metadata: {
            notebook_id: input.notebookId,
            source_id: input.sourceId,
            source_type: 'youtube',
            title: input.title || 'YouTube Video',
            url: input.url,
            startSeconds: chunkStartSeconds,
            timelineSegment: {
              start: secondsToTimeString(chunkStartSeconds),
              startSeconds: chunkStartSeconds,
              end: secondsToTimeString(chunkEndSeconds),
              endSeconds: chunkEndSeconds,
            },
            transcript: chunkItems,
          },
        })
      );
    }

    return documents;
  }
}
