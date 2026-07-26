import { IVectorStore } from './base.vectorstore';
import { QdrantVectorStore } from './qdrant.store';

export class VectorFactory {
  private static instance: IVectorStore;

  static getVectorStore(): IVectorStore {
    if (!VectorFactory.instance) {
      VectorFactory.instance = new QdrantVectorStore();
    }
    return VectorFactory.instance;
  }
}
