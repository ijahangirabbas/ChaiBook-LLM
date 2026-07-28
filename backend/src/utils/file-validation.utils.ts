import fs from 'fs';
import path from 'path';
import { SourceType } from '../types/source.types';

export const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.markdown', '.srt', '.vtt', '.json']);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/vtt',
  'application/json',
  'application/x-subrip',
]);

export function detectSourceTypeFromFilename(filename: string): SourceType {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.vtt')) return 'vtt';
  if (lower.endsWith('.srt')) return 'srt';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  return 'text';
}

export function validateUploadedFile(filePath: string, originalName: string, mimetype: string): SourceType {
  const ext = path.extname(originalName).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `File type "${ext || 'unknown'}" is not supported. Allowed: PDF, TXT, MD, SRT, VTT, JSON.`
    );
  }

  const normalizedMime = (mimetype || '').toLowerCase();
  const mimeAllowed =
    ALLOWED_MIME_TYPES.has(normalizedMime) ||
    normalizedMime.startsWith('text/') ||
    normalizedMime === 'application/octet-stream';

  if (!mimeAllowed) {
    throw new Error(`MIME type "${mimetype}" is not allowed for uploads.`);
  }

  const header = Buffer.alloc(5);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, header, 0, 5, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (ext === '.pdf' && header.subarray(0, 4).toString('ascii') !== '%PDF') {
    throw new Error('File does not appear to be a valid PDF (invalid signature).');
  }

  return detectSourceTypeFromFilename(originalName);
}
