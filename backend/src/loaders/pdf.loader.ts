import fs from 'fs';
import pdfParse from 'pdf-parse';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { BaseLoader, LoaderInput } from './base.loader';

export class PdfLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    if (!input.filePath || !fs.existsSync(input.filePath)) {
      throw new Error(
        `PDF file not found for source "${input.title}". ` +
          'Ensure the file was uploaded successfully and S3/local storage is configured.'
      );
    }

    const buffer = fs.readFileSync(input.filePath);
    if (buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
      throw new Error(`File "${input.title}" does not appear to be a valid PDF.`);
    }

    try {
      await pdfParse(buffer);
    } catch (err) {
      const msg = (err as Error).message.toLowerCase();
      if (msg.includes('password') || msg.includes('encrypted') || msg.includes('decrypt')) {
        throw new Error(
          `PDF "${input.title}" is password-protected or encrypted. Please upload an unencrypted PDF.`
        );
      }
    }

    try {
      const pdfLoader = new PDFLoader(input.filePath, {
        splitPages: true,
      });

      const docs = await pdfLoader.load();
      const totalPages = docs.length || 1;

      if (docs.length === 0) {
        throw new Error(`PDF "${input.title}" contains no extractable text.`);
      }

      return docs.map((doc, idx) => {
        const pageNum = (doc.metadata?.loc?.pageNumber as number) || idx + 1;
        const pageContent = doc.pageContent?.trim();

        if (!pageContent) {
          throw new Error(`PDF "${input.title}" page ${pageNum} contains no extractable text.`);
        }

        return new Document({
          pageContent,
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
    } catch (err) {
      if (err instanceof Error && err.message.includes('extractable text')) {
        throw err;
      }
      if (err instanceof Error && err.message.includes('password-protected')) {
        throw err;
      }
      throw new Error(`Failed to parse PDF "${input.title}": ${(err as Error).message}`);
    }
  }
}
