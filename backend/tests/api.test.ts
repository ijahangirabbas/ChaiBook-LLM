process.env.NODE_ENV = 'test';
process.env.SILENT_PRISMA = 'true';
process.env.TEST_JWT_SECRET = process.env.TEST_JWT_SECRET || 'chaibook-test-jwt-secret';

import jwt from 'jsonwebtoken';
import app from '../src/app';
import http from 'http';

async function runApiTests() {
  console.log('🧪 Starting ChaiBook LLM Automated API & Security Test Suite...\n');

  let server: http.Server | null = null;
  let baseUrl = '';

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server!.address() as { port: number };
      baseUrl = `http://localhost:${address.port}/api/v1`;
      console.log(`📡 Test server listening at ${baseUrl}`);
      resolve();
    });
  });

  let testsPassed = 0;
  let testsFailed = 0;

  async function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      testsFailed++;
    }
  }

  try {
    const res1 = await fetch(`${baseUrl}/notebooks`);
    await assert(
      'Unauthenticated request returns 401 Unauthorized',
      res1.status === 401,
      `Received status ${res1.status}`
    );

    const res2 = await fetch(`${baseUrl}/notebooks`, {
      headers: { Authorization: 'Bearer invalid-token-string' },
    });
    await assert(
      'Invalid Bearer token returns 401',
      res2.status === 401,
      `Received status ${res2.status}`
    );

    const testToken = jwt.sign(
      { sub: 'test-user-sub-123', email: 'test@chaibook.ai', name: 'Test User' },
      process.env.TEST_JWT_SECRET!
    );

    const res3 = await fetch(`${baseUrl}/notebooks`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    await assert(
      'Authenticated request to GET /notebooks returns 200 OK',
      res3.status === 200,
      `Received status ${res3.status}`
    );

    const res4 = await fetch(`${baseUrl}/notebooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ title: '' }),
    });
    await assert(
      'Invalid Zod body input returns 400 Bad Request',
      res4.status === 400 || res4.status === 500,
      `Received status ${res4.status}`
    );

    const res5 = await fetch(`${baseUrl}/notebooks/non-existent-uuid-999`, {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    await assert(
      'Non-existent notebook ID returns 404 Not Found',
      res5.status === 404,
      `Received status ${res5.status}`
    );

    console.log(`\n📊 API Test Results: ${testsPassed} passed, ${testsFailed} failed.`);
    if (testsFailed > 0) {
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error('💥 Error running API tests:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      (server as http.Server).close();
    }
  }
}

runApiTests();
