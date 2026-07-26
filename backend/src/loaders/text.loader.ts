import fs from 'fs';
import { Document } from '@langchain/core/documents';
import { BaseLoader, LoaderInput } from './base.loader';

export class TextLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    let content = input.rawContent || '';

    if (!content && input.filePath) {
      content = fs.readFileSync(input.filePath, 'utf-8');
    }

    if (!content) {
      throw new Error('Text Loader requires raw content or a valid file path.');
    }

    // Split text into paragraphs to maintain character offsets
    const paragraphs = content.split(/\n\s*\n/);
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
