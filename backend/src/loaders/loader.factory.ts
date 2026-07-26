import { BaseLoader } from './base.loader';
import { PdfLoader } from './pdf.loader';
import { WebLoader } from './web.loader';
import { YoutubeLoader } from './youtube.loader';
import { CaptionLoader } from './caption.loader';
import { TextLoader } from './text.loader';
import { SourceType } from '../types/source.types';

export class LoaderFactory {
  static getLoader(sourceType: SourceType): BaseLoader {
    switch (sourceType) {
      case 'pdf':
        return new PdfLoader();
      case 'webpage':
        return new WebLoader();
      case 'youtube':
        return new YoutubeLoader();
      case 'srt':
      case 'vtt':
        return new CaptionLoader();
      case 'text':
      case 'markdown':
      default:
        return new TextLoader();
    }
  }
}
