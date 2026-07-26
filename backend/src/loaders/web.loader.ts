import { Document } from '@langchain/core/documents';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { BaseLoader, LoaderInput } from './base.loader';

export class WebLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    if (!input.url) {
      throw new Error('Web Loader requires a valid target URL.');
    }

    const loader = new CheerioWebBaseLoader(input.url, {
      selector: 'p, h1, h2, h3, h4, h5, h6, li, article, section',
    });

    const docs = await loader.load();
    const domain = new URL(input.url).hostname;

    return docs.map((doc) => {
      // Clean up whitespace
      const cleanContent = doc.pageContent
        .replace(/\s+/g, ' ')
        .trim();

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
