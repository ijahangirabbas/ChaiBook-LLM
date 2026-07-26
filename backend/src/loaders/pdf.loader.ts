import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { BaseLoader, LoaderInput } from './base.loader';

export class PdfLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    if (!input.filePath) {
      throw new Error('PDF Loader requires a valid file path.');
    }

    const pdfLoader = new PDFLoader(input.filePath, {
      splitPages: true,
    });

    const docs = await pdfLoader.load();
    const totalPages = docs.length;

    return docs.map((doc, idx) => {
      const pageNum = (doc.metadata?.loc?.pageNumber as number) || (idx + 1);

      return new Document({
        pageContent: doc.pageContent,
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
  }
}
