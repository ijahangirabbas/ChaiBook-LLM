import { Document } from '@langchain/core/documents';
import { YoutubeTranscript } from 'youtube-transcript';
import { BaseLoader, LoaderInput } from './base.loader';
import { TranscriptEntry } from '../types/source.types';
import { secondsToTimeString } from '../utils/timestamp.utils';
import { assertSafeUrl } from '../utils/url-safety.utils';

const TRANSCRIPT_LANGS = ['en', 'en-US', 'en-GB', 'hi', 'es', 'fr', 'de', 'pt', 'ja', 'ko'];

function isLiveOrShortsUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes('/live/') || lower.includes('&live=1')) {
    return 'Live stream URLs are not supported for transcript ingestion.';
  }
  if (lower.includes('/shorts/')) {
    return null; // shorts can have captions
  }
  return null;
}

async function fetchTranscriptWithFallback(url: string) {
  const errors: string[] = [];

  for (const lang of TRANSCRIPT_LANGS) {
    try {
      const raw = await YoutubeTranscript.fetchTranscript(url, { lang });
      if (raw && raw.length > 0) return raw;
    } catch (err) {
      errors.push(`${lang}: ${(err as Error).message}`);
    }
  }

  try {
    const raw = await YoutubeTranscript.fetchTranscript(url);
    if (raw && raw.length > 0) return raw;
  } catch (err) {
    errors.push(`default: ${(err as Error).message}`);
  }

  throw new Error(
    `No captions found for this video in any supported language. ${errors.slice(0, 2).join(' ')}`
  );
}

export class YoutubeLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    if (!input.url && !input.rawContent) {
      throw new Error('YouTube Loader requires a valid video URL or transcript content.');
    }

    let transcriptEntries: TranscriptEntry[] = [];

    if (input.url) {
      await assertSafeUrl(input.url);
      const liveError = isLiveOrShortsUrl(input.url);
      if (liveError) throw new Error(liveError);

      const rawTranscript = await fetchTranscriptWithFallback(input.url);
      transcriptEntries = rawTranscript.map((item) => {
        const startSeconds = Math.floor(item.offset / 1000);
        return {
          timestamp: secondsToTimeString(startSeconds),
          seconds: startSeconds,
          text: item.text,
        };
      });
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
      throw new Error(
        `No transcript content available for YouTube source "${input.title || input.url || 'unknown'}". ` +
          'Upload a video with captions enabled or provide transcript text.'
      );
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
