import fs from 'fs';
import { Document } from '@langchain/core/documents';
import { BaseLoader, LoaderInput } from './base.loader';

const MAX_TEXT_BYTES = 2 * 1024 * 1024; // 2MB

function readUtf8Content(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length > MAX_TEXT_BYTES) {
    throw new Error(`Text file exceeds maximum size of ${MAX_TEXT_BYTES / (1024 * 1024)}MB.`);
  }
  let content = buffer.toString('utf-8');
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  return content;
}

function splitMarkdownAware(content: string): string[] {
  const sections: string[] = [];
  const lines = content.split('\n');
  let current: string[] = [];
  let inFence = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inFence = !inFence;
    }
    if (!inFence && line.trim() === '' && current.length > 0) {
      sections.push(current.join('\n').trim());
      current = [];
      continue;
    }
    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current.join('\n').trim());
  }

  return sections.filter((s) => s.length > 0);
}

export class TextLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    let content = input.rawContent || '';

    if (!content && input.filePath) {
      content = readUtf8Content(input.filePath);
    }

    if (!content) {
      throw new Error('Text Loader requires raw content or a valid file path.');
    }

    if (Buffer.byteLength(content, 'utf-8') > MAX_TEXT_BYTES) {
      throw new Error(`Text content exceeds maximum size of ${MAX_TEXT_BYTES / (1024 * 1024)}MB.`);
    }

    const isMarkdown = input.sourceType === 'markdown' || input.title?.toLowerCase().endsWith('.md');
    const paragraphs = isMarkdown ? splitMarkdownAware(content) : content.split(/\n\s*\n/);
    const documents: Document[] = [];
    let currentOffset = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        currentOffset += paragraph.length + 2;
        continue;
      }

      const startOffset = content.indexOf(trimmed, currentOffset);
      const endOffset = startOffset + trimmed.length;

      documents.push(
        new Document({
          pageContent: trimmed,
          metadata: {
            notebook_id: input.notebookId,
            source_id: input.sourceId,
            source_type: input.sourceType || 'text',
            title: input.title,
            charOffset: {
              start: startOffset >= 0 ? startOffset : currentOffset,
              end: endOffset >= 0 ? endOffset : currentOffset + trimmed.length,
            },
          },
        })
      );

      currentOffset = endOffset > 0 ? endOffset : currentOffset + paragraph.length;
    }

    return documents.length > 0
      ? documents
      : [
          new Document({
            pageContent: content,
            metadata: {
              notebook_id: input.notebookId,
              source_id: input.sourceId,
              source_type: input.sourceType || 'text',
              title: input.title,
              charOffset: { start: 0, end: content.length },
            },
          }),
        ];
  }
}
