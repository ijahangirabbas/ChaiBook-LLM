import * as cheerio from 'cheerio';
import { Document } from '@langchain/core/documents';
import { BaseLoader, LoaderInput } from './base.loader';
import { safeFetch } from '../utils/url-safety.utils';

function extractReadableText(html: string, pageUrl: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  const pageTitle =
    $('meta[property="og:title"]').attr('content') ||
    $('title').first().text().trim() ||
    'Web Page';

  $('script, style, noscript, nav, footer, header, aside, iframe').remove();

  const candidateSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '#content',
  ];

  let text = '';
  for (const selector of candidateSelectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      text = el.text().replace(/\s+/g, ' ').trim();
      if (text.length >= 200) break;
    }
  }

  if (text.length < 200) {
    text = $('p, h1, h2, h3, h4, h5, h6, li')
      .map((_, el) => $(el).text())
      .get()
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (!text) {
    text = $('body').text().replace(/\s+/g, ' ').trim();
  }

  return { title: pageTitle, text };
}

export class WebLoader extends BaseLoader {
  async load(input: LoaderInput): Promise<Document[]> {
    if (!input.url && !input.rawContent) {
      throw new Error('Web Loader requires a valid target URL or content.');
    }

    const fetchedAt = new Date().toISOString();
    let pageTitle = input.title || 'Web Page';
    let pageContent = input.rawContent || '';
    let domain = 'webpage';

    if (input.url && !input.rawContent) {
      const parsed = new URL(input.url);
      domain = parsed.hostname;

      const response = await safeFetch(input.url);
      const html = await response.text();
      const extracted = extractReadableText(html, input.url);
      pageTitle = extracted.title || pageTitle;
      pageContent = extracted.text;
    } else if (input.url) {
      const parsed = new URL(input.url);
      domain = parsed.hostname;
    }

    const cleanContent = pageContent.replace(/\s+/g, ' ').trim();
    const lowerContent = cleanContent.toLowerCase();

    const isSpaPlaceholder =
      cleanContent.length < 100 ||
      lowerContent.includes('enable javascript to run this app') ||
      lowerContent.includes('javascript is required') ||
      lowerContent.includes('you need to enable javascript') ||
      lowerContent.includes('please enable javascript') ||
      lowerContent.includes('browser does not support javascript');

    if (!cleanContent || isSpaPlaceholder) {
      throw new Error(
        `Could not extract readable text from "${input.url || input.title}". ` +
          'This webpage appears to be a Single-Page Application (SPA) or requires JavaScript to render content. ' +
          'Please copy and paste the page text directly into ChaiBook using "+ Add Source" -> "Copy-Pasted Text".'
      );
    }

    return [
      new Document({
        pageContent: cleanContent,
        metadata: {
          notebook_id: input.notebookId,
          source_id: input.sourceId,
          source_type: 'webpage',
          title: pageTitle,
          url: input.url,
          domain,
          pageTitle,
          fetchedAt,
        },
      }),
    ];
  }
}
