import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { BaseLoader, LoaderInput } from './base.loader';

import fs from 'fs';

export class PdfLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    if (!input.filePath || !fs.existsSync(input.filePath)) {
      return [
        new Document({
          pageContent: `PDF Source Document: ${input.title}\nPage 1 of 1`,
          metadata: {
            notebook_id: input.notebookId,
            source_id: input.sourceId,
            source_type: 'pdf',
            title: input.title,
            url: input.url || '',
            pageNumber: 1,
            totalPages: 1,
          },
        }),
      ];
    }

    try {
      const pdfLoader = new PDFLoader(input.filePath, {
        splitPages: true,
      });

      const docs = await pdfLoader.load();
      const totalPages = docs.length || 1;

      if (docs.length === 0) {
        return [
          new Document({
            pageContent: `PDF Source Document: ${input.title}\nPage 1 of 1`,
            metadata: {
              notebook_id: input.notebookId,
              source_id: input.sourceId,
              source_type: 'pdf',
              title: input.title,
              url: input.url || '',
              pageNumber: 1,
              totalPages: 1,
            },
          }),
        ];
      }

      return docs.map((doc, idx) => {
        const pageNum = (doc.metadata?.loc?.pageNumber as number) || (idx + 1);

        return new Document({
          pageContent: doc.pageContent || `Content from ${input.title} page ${pageNum}`,
          metadata: {
            notebook_id: input.notebookId,
            source_id: input.sourceId,
            source_type: 'pdf',
            title: input.title,
            url: input.url || '',
            pageNumber: pageNum,
            totalPages: totalPages,
          },
        });
      });
    } catch {
      return [
        new Document({
          pageContent: `PDF Source Document: ${input.title}\nPage 1 of 1`,
          metadata: {
            notebook_id: input.notebookId,
            source_id: input.sourceId,
            source_type: 'pdf',
            title: input.title,
            url: input.url || '',
            pageNumber: 1,
            totalPages: 1,
          },
        }),
      ];
    }
  }
}
