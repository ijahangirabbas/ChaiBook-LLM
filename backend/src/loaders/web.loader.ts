import { Document } from '@langchain/core/documents';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { BaseLoader, LoaderInput } from './base.loader';

export class WebLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    if (!input.url && !input.rawContent) {
      throw new Error('Web Loader requires a valid target URL or content.');
    }

    const domain = input.url ? new URL(input.url).hostname : 'webpage';
    let docs: Document[] = [];

    if (input.url) {
      try {
        const loader = new CheerioWebBaseLoader(input.url, {
          selector: 'p, h1, h2, h3, h4, h5, h6, li, article, section',
        });
        docs = await loader.load();
      } catch {
        // Fallback to rawContent if fetch fails
      }
    }

    if (docs.length === 0 && input.rawContent) {
      docs = [new Document({ pageContent: input.rawContent, metadata: {} })];
    }

    return docs.map((doc) => {
      const cleanContent = doc.pageContent.replace(/\s+/g, ' ').trim();
      return new Document({
        pageContent: cleanContent,
        metadata: {
          notebook_id: input.notebookId,
          source_id: input.sourceId,
          source_type: 'webpage',
          title: input.title || domain,
          url: input.url,
          domain: domain,
        },
      });
    });
  }
}
