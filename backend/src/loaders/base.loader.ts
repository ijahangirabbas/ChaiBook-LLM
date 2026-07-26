import { Document } from '@langchain/core/documents';
import { SourceType } from '../types/source.types';

export interface LoaderInput {
  notebookId: string;
  sourceId: string;
  sourceType: SourceType;
  title: string;
  url?: string;
  filePath?: string;
  rawContent?: string;
}

export abstract class BaseLoader {
  abstract load(input: LoaderInput): Promise<Document[]>;
}
