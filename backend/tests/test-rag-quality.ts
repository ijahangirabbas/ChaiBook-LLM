/**
 * RAG quality harness — seeds known docs, asks fixed questions, asserts citation presence.
 * Run: npm run test:rag-quality
 */
import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuidv4 } from 'uuid';
import { vectorService } from '../src/services/vector.service';
import { Document } from '@langchain/core/documents';
import { initializeQdrantCollection } from '../src/config/qdrant.config';
import { prisma } from '../src/db/prisma.client';

interface QualityCase {
  name: string;
  question: string;
  mustContainInChunks: string[];
}

async function main() {
  console.log('\n🧪 RAG Quality Harness\n');

  const notebookId = `quality-nb-${uuidv4()}`;
  const workspaceId = `quality-ws-${uuidv4()}`;
  const sourceId = `quality-src-${uuidv4()}`;

  await initializeQdrantCollection();

  const docs = [
    new Document({
      pageContent:
        'Retrieval Augmented Generation (RAG) combines a retriever with a generator. The retriever finds relevant passages; the generator answers using those passages.',
      metadata: {
        notebook_id: notebookId,
        workspace_id: workspaceId,
        source_id: sourceId,
        source_type: 'text',
        title: 'RAG Basics',
      },
    }),
    new Document({
      pageContent:
        'ChaiBook LLM indexes PDFs, YouTube transcripts, and web pages into Qdrant using Jina or OpenAI embeddings for semantic search.',
      metadata: {
        notebook_id: notebookId,
        workspace_id: workspaceId,
        source_id: sourceId,
        source_type: 'text',
        title: 'ChaiBook Indexing',
      },
    }),
    new Document({
      pageContent:
        'Citation markers like [1] and [2] must map to retrieved chunks so users can verify every claim against original sources.',
      metadata: {
        notebook_id: notebookId,
        workspace_id: workspaceId,
        source_id: sourceId,
        source_type: 'text',
        title: 'Citations Guide',
      },
    }),
  ];

  await vectorService.indexDocuments(docs);

  const persistedChunks = await prisma.sourceChunk.count({ where: { sourceId } });
  if (persistedChunks === 0) {
    console.log('  ⚠️  No SourceChunk rows persisted (index may predate chunk table — retrieval test continues)\n');
  } else {
    console.log(`✅ Seeded documents with ${persistedChunks} persisted chunks\n`);
  }

  const cases: QualityCase[] = [
    {
      name: 'RAG definition',
      question: 'What is retrieval augmented generation?',
      mustContainInChunks: ['retrieval', 'generator'],
    },
    {
      name: 'Indexing stack',
      question: 'How does ChaiBook index documents?',
      mustContainInChunks: ['qdrant'],
    },
    {
      name: 'Citations',
      question: 'Why are citation markers important?',
      mustContainInChunks: ['citation', 'chunk'],
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of cases) {
    const results = await vectorService.searchWorkspace(
      testCase.question,
      notebookId,
      5,
      workspaceId
    );

    const joined = results.map((r) => r.document.pageContent.toLowerCase()).join(' ');
    const hits = testCase.mustContainInChunks.filter((term) => joined.includes(term.toLowerCase()));
    const ok = results.length > 0 && hits.length === testCase.mustContainInChunks.length;

    if (ok) {
      passed++;
      console.log(`  ✅ PASS: ${testCase.name} (top score=${results[0]?.score.toFixed(3)}, chunks=${results.length})`);
    } else {
      failed++;
      console.log(`  ❌ FAIL: ${testCase.name}`);
      console.log(`     Expected terms: ${testCase.mustContainInChunks.join(', ')}`);
      console.log(`     Found terms: ${hits.join(', ') || '(none)'}`);
      console.log(`     Results: ${results.length}`);
    }
  }

  await vectorService.deleteSourceVectors(sourceId);
  await prisma.sourceChunk.deleteMany({ where: { sourceId } }).catch(() => undefined);

  console.log(`\n📊 RAG Quality: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal RAG quality harness error:', err);
  process.exit(1);
});
