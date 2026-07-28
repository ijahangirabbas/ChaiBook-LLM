process.env.NODE_ENV = 'test';
process.env.SILENT_PRISMA = 'true';
process.env.TEST_JWT_SECRET = process.env.TEST_JWT_SECRET || 'chaibook-test-jwt-secret';

import jwt from 'jsonwebtoken';
import app from '../src/app';
import http from 'http';

async function runJwtTests() {
  console.log('🧪 Starting ChaiBook LLM JWT Verification Test Suite...\n');

  const testSecret = process.env.TEST_JWT_SECRET!;

  let server: http.Server | null = null;
  let baseUrl = '';

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server!.address() as { port: number };
      baseUrl = `http://localhost:${address.port}/api/v1`;
      console.log(`📡 Test server listening at ${baseUrl}`);
      console.log(`🔑 Using TEST_JWT_SECRET for signed test tokens\n`);
      resolve();
    });
  });

  let passed = 0;
  let failed = 0;

  async function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    const validPayload = {
      sub: 'usr_test_uuid_999',
      email: 'alex.researcher@chaibook.ai',
      name: 'Alex Researcher',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const validJwtToken = jwt.sign(validPayload, testSecret);

    const res1 = await fetch(`${baseUrl}/notebooks`, {
      headers: { Authorization: `Bearer ${validJwtToken}` },
    });
    await assert(
      'Valid signed test JWT grants access (HTTP 200 OK)',
      res1.status === 200,
      `Received status ${res1.status}`
    );

    const res2 = await fetch(`${baseUrl}/notebooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validJwtToken}`,
      },
      body: JSON.stringify({
        title: 'JWT Test Research Notebook',
        description: 'Created via automated JWT test suite',
        color: 'indigo',
        icon: 'book',
      }),
    });
    const body2 = (await res2.json()) as any;
    await assert(
      'Notebook creation with valid JWT token returns HTTP 201 Created',
      res2.status === 201 && body2.success === true && Boolean(body2.data?.id),
      `Received status ${res2.status}, body: ${JSON.stringify(body2)}`
    );

    const invalidSecretToken = jwt.sign(validPayload, 'wrong-fake-jwt-secret-key-999');

    const res3 = await fetch(`${baseUrl}/notebooks`, {
      headers: { Authorization: `Bearer ${invalidSecretToken}` },
    });

    await assert(
      'Invalid JWT signature is rejected (HTTP 401)',
      res3.status === 401,
      `Received status ${res3.status}`
    );

    const expiredPayload = {
      ...validPayload,
      exp: Math.floor(Date.now() / 1000) - 3600,
    };
    const expiredJwtToken = jwt.sign(expiredPayload, testSecret);

    const res4 = await fetch(`${baseUrl}/notebooks`, {
      headers: { Authorization: `Bearer ${expiredJwtToken}` },
    });

    await assert(
      'Expired JWT token is rejected (HTTP 401)',
      res4.status === 401,
      `Received status ${res4.status}`
    );

    const res5 = await fetch(`${baseUrl}/notebooks`, {
      headers: { Authorization: 'Bearer dev-token' },
    });
    await assert(
      'Dev-token is rejected (HTTP 401)',
      res5.status === 401,
      `Received status ${res5.status}`
    );

    console.log(`\n📊 JWT Test Results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error('💥 Error running JWT test suite:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      (server as http.Server).close();
    }
  }
}

runJwtTests();
