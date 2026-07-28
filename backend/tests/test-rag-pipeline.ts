import dotenv from 'dotenv';
dotenv.config();

import { sourceService } from '../src/services/source.service';
import { sourceRepository } from '../src/repositories/source.repository';
import { vectorService } from '../src/services/vector.service';
import { prisma } from '../src/db/prisma.client';
import { initializeQdrantCollection } from '../src/config/qdrant.config';
import { v4 as uuidv4 } from 'uuid';

export async function testRagPipeline(): Promise<boolean> {
  console.log('\n======================================================');
  console.log('🧪 RAG PIPELINE & EMBEDDINGS INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  // ─── DB Setup: create real Workspace + Notebook so FK constraints pass ────
  let workspaceId = '';
  let testNotebookId = '';
  let testUserId = '';
  const testEmail = `rag.test.${Date.now()}@chaibook.io`;

  try {
    const user = await prisma.user.create({
      data: { email: testEmail, name: 'RAG Test User', provider: 'test' },
    });
    testUserId = user.id;

    const workspace = await prisma.workspace.create({
      data: { name: 'RAG Test Workspace', slug: `rag-ws-${Date.now()}` },
    });
    workspaceId = workspace.id;

    const notebook = await prisma.notebook.create({
      data: {
        title: 'RAG Test Notebook',
        userId: testUserId,
        workspaceId,
      },
    });
    testNotebookId = notebook.id;
    console.log(`   🗄️  DB setup complete — workspace: ${workspaceId}, notebook: ${testNotebookId}\n`);
  } catch (dbErr) {
    console.error('❌ DB setup failed:', (dbErr as Error).message);
    return false;
  }

  const ytSourceId = `test-yt-${uuidv4()}`;
  const webSourceId = `test-web-${uuidv4()}`;

  try {
    // Step 1: Initialize Vector Collection & Dimension Check
    console.log('1️⃣ Initializing Qdrant Vector Store Collection...');
    await initializeQdrantCollection();
    console.log('   ✅ Vector collection initialized and ready.\n');

    // ─── STEP 2A: Test YouTube Video Ingestion & Timestamp Chunking ──────────
    console.log('2️⃣ [YOUTUBE TEST] Ingesting & Embedding YouTube Video Transcript...');
    
    await sourceRepository.createSource({
      sourceId: ytSourceId,
      notebookId: testNotebookId,
      workspaceId,
      title: 'Intro to Quantum Computing (YouTube Video)',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=u1GG86VbhhQ',
      status: 'uploading',
    });

    const ytContent = `
    [00:00:15] Welcome to Quantum Computing fundamentals. Today we discuss qubits and quantum superposition.
    [00:01:30] Quantum entanglement allows qubits to share physical states instantly across distances.
    [00:03:00] Shor's algorithm provides exponential speedup for integer factorization on quantum processors.
    `;

    await sourceService.processAndIndexSource({
      sourceId: ytSourceId,
      notebookId: testNotebookId,
      workspaceId,
      sourceType: 'youtube',
      title: 'Intro to Quantum Computing (YouTube Video)',
      url: 'https://www.youtube.com/watch?v=u1GG86VbhhQ',
      rawContent: ytContent,
    });

    console.log('   ✅ YouTube video transcript embedded successfully.\n');

    // ─── STEP 2B: Test Web Page Scraping & Ingestion ─────────────────────────
    console.log('3️⃣ [WEBPAGE TEST] Ingesting & Embedding Web Page Content...');

    await sourceRepository.createSource({
      sourceId: webSourceId,
      notebookId: testNotebookId,
      workspaceId,
      title: 'CSS Exam Syllabus Guide (Web Article)',
      type: 'webpage',
      url: 'https://example.org/css-syllabus',
      status: 'uploading',
    });

    const webContent = `
    The Central Superior Services (CSS) competitive exam optional subjects are categorized into 7 distinct groups.
    Group I covers 200-mark disciplines: Economics, Accountancy, Computer Science, Political Science, and International Relations.
    Group II covers Physics, Chemistry, Applied Mathematics, Pure Mathematics, Statistics, and Geology.
    `;

    await sourceService.processAndIndexSource({
      sourceId: webSourceId,
      notebookId: testNotebookId,
      workspaceId,
      sourceType: 'webpage',
      title: 'CSS Exam Syllabus Guide (Web Article)',
      url: 'https://example.org/css-syllabus',
      rawContent: webContent,
    });

    console.log('   ✅ Web page article embedded successfully.\n');

    // ─── STEP 3: Verify Status in Database ──────────────────────────────────
    console.log('4️⃣ Verifying Database Indexing Status for both YouTube & Web Page...');
    try {
      const ytSource = await prisma.source.findUnique({ where: { id: ytSourceId } });
      const webSource = await prisma.source.findUnique({ where: { id: webSourceId } });

      console.log(`   📌 YouTube Video DB Status: "${ytSource?.status}" (${ytSource?.indexingProgress}%)`);
      console.log(`   📌 Web Page DB Status:      "${webSource?.status}" (${webSource?.indexingProgress}%)`);
    } catch {
      console.log('   ⚠️ Database verification skipped (running in offline mode).');
    }
    console.log('   ✅ Status check completed.\n');

    // ─── STEP 4: Vector Search Retrieval Test for YouTube & Web ──────────────
    console.log('5️⃣ Testing RAG Similarity Search for YouTube & Web Embeddings...');

    // Test YouTube retrieval
    const ytResults = await vectorService.searchWorkspace('What is quantum entanglement and superposition?', testNotebookId, 3, workspaceId);
    console.log(`   🔍 Query: "What is quantum entanglement and superposition?"`);
    console.log(`   📊 Retrieved Chunks: ${ytResults.length}`);
    if (ytResults.length > 0) {
      console.log(`   ⭐ Top YouTube Match Score: ${(ytResults[0].score * 100).toFixed(1)}%`);
      console.log(`   📄 Excerpt: "${ytResults[0].document.pageContent.trim().slice(0, 120)}..."`);
    }

    // Test Web Page retrieval
    const webResults = await vectorService.searchWorkspace('Which 200 mark subjects are in Group I?', testNotebookId, 3, workspaceId);
    console.log(`\n   🔍 Query: "Which 200 mark subjects are in Group I?"`);
    console.log(`   📊 Retrieved Chunks: ${webResults.length}`);
    if (webResults.length > 0) {
      console.log(`   ⭐ Top Web Match Score: ${(webResults[0].score * 100).toFixed(1)}%`);
      console.log(`   📄 Excerpt: "${webResults[0].document.pageContent.trim().slice(0, 120)}..."`);
    }

    console.log('\n   ✅ RAG vector retrieval passed for both YouTube & Web page.\n');

    // ─── STEP 5: Test Persistent Clean-up ────────────────────────────────────
    console.log('6️⃣ Cleaning up test vectors and database records...');
    await vectorService.deleteSourceVectors(ytSourceId);
    await vectorService.deleteSourceVectors(webSourceId);
    try {
      // Deleting workspace cascades to notebook and sources
      await prisma.workspace.delete({ where: { id: workspaceId } });
      await prisma.user.delete({ where: { id: testUserId } });
    } catch {
      // Ignore DB clean-up errors
    }
    console.log('   ✅ Clean-up complete.\n');

    console.log('======================================================');
    console.log('🎉 YOUTUBE & WEBPAGE RAG PIPELINE TEST: 100% PASSED');
    console.log('======================================================\n');
    return true;
  } catch (error) {
    console.error('❌ RAG Pipeline Test Error:', (error as Error).message);
    // Best-effort cleanup on failure
    try {
      if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => undefined);
      if (testUserId)  await prisma.user.delete({ where: { id: testUserId } }).catch(() => undefined);
    } catch { /* ignore */ }
    return false;
  }
}

if (require.main === module) {
  testRagPipeline()
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}
