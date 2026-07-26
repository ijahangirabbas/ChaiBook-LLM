import fs from 'fs';
import { Document } from '@langchain/core/documents';
import { BaseLoader, LoaderInput } from './base.loader';
import { TranscriptEntry, TimelineSegment } from '../types/source.types';
import { timeStringToSeconds, secondsToTimeString } from '../utils/timestamp.utils';

export class CaptionLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    let content = input.rawContent || '';

    if (!content && input.filePath) {
      content = fs.readFileSync(input.filePath, 'utf-8');
    }

    if (!content) {
      throw new Error('Caption Loader requires either raw content or a valid file path.');
    }

    const transcriptEntries: TranscriptEntry[] = this.parseCaptionContent(content);

    if (transcriptEntries.length === 0) {
      throw new Error('Could not parse any transcript entries from VTT/SRT content.');
    }

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
            source_type: input.sourceType,
            title: input.title,
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

  private parseCaptionContent(content: string): TranscriptEntry[] {
    const entries: TranscriptEntry[] = [];
    // Standard SRT/VTT timecode pattern e.g. 00:01:20,000 --> 00:01:23,400 or 01:20.000 --> 01:23.400
    const timeRegex = /((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[\.,]\d{3})/;

    const blocks = content.split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      let timeMatchIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (timeRegex.test(lines[i])) {
          timeMatchIndex = i;
          break;
        }
      }

      if (timeMatchIndex !== -1) {
        const timeMatch = lines[timeMatchIndex].match(timeRegex);
        if (timeMatch) {
          const startTimeStr = timeMatch[1];
          const textLines = lines.slice(timeMatchIndex + 1).filter(
            (l) => !l.startsWith('WEBVTT') && !/^\d+$/.test(l)
          );
          const text = textLines.join(' ').replace(/<[^>]*>/g, '').trim();

          if (text) {
            const seconds = timeStringToSeconds(startTimeStr);
            entries.push({
              timestamp: secondsToTimeString(seconds),
              seconds: seconds,
              text: text,
            });
          }
        }
      }
    }

    return entries;
  }
}
