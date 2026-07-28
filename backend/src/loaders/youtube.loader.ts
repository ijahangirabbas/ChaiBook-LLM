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

function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function fetchTranscriptWithFallback(url: string) {
  const errors: string[] = [];
  const videoId = extractYouTubeVideoId(url) || url;

  for (const lang of TRANSCRIPT_LANGS) {
    try {
      const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (raw && raw.length > 0) return raw;
    } catch (err) {
      errors.push(`${lang}: ${(err as Error).message}`);
    }
  }

  try {
    const raw = await YoutubeTranscript.fetchTranscript(videoId);
    if (raw && raw.length > 0) return raw;
  } catch (err) {
    errors.push(`default: ${(err as Error).message}`);
  }

  throw new Error(
    `No transcript found for YouTube video. Make sure captions/subtitles are enabled on this video.`
  );
}

export class YoutubeLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    if (!input.url && !input.rawContent) {
      throw new Error('YouTube Loader requires a valid video URL or transcript content.');
    }

    let transcriptEntries: TranscriptEntry[] = [];

    if (input.rawContent) {
      const lines = input.rawContent.split('\n').filter((l) => l.trim().length > 0);
      transcriptEntries = lines.map((line, idx) => {
        const tsMatch = line.match(/\[(\d{2}):(\d{2}):(\d{2})\]/);
        let startSec = idx * 15;
        if (tsMatch) {
          const hrs = parseInt(tsMatch[1], 10);
          const mins = parseInt(tsMatch[2], 10);
          const secs = parseInt(tsMatch[3], 10);
          startSec = hrs * 3600 + mins * 60 + secs;
        }
        return {
          timestamp: secondsToTimeString(startSec),
          seconds: startSec,
          text: line.replace(/\[\d{2}:\d{2}:\d{2}\]/, '').trim() || line.trim(),
        };
      });
    } else if (input.url) {
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
