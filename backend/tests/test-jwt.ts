process.env.NODE_ENV = 'test';
process.env.SILENT_PRISMA = 'true';

import jwt from 'jsonwebtoken';
import app from '../src/app';
import http from 'http';
import { config } from '../src/config/env.config';

async function runJwtTests() {
  console.log('🧪 Starting ChaiBook LLM Comprehensive JWT Token Test Suite...\n');

  const testSecret = config.supabaseJwtSecret || 'test-supabase-jwt-secret-key-12345';
  process.env.SUPABASE_JWT_SECRET = testSecret;

  let server: http.Server | null = null;
  let baseUrl = '';

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server!.address() as { port: number };
      baseUrl = `http://localhost:${address.port}/api/v1`;
      console.log(`📡 Test server listening at ${baseUrl}`);
      console.log(`🔑 Using JWT Secret: "${testSecret.substring(0, 10)}..."\n`);
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
    // ─────────────────────────────────────────────────────────────────────────
    // Test 1: Valid Signed Supabase JWT Access Token
    // ─────────────────────────────────────────────────────────────────────────
    const validPayload = {
      sub: 'usr_supabase_uuid_999',
      email: 'alex.researcher@chaibook.ai',
      user_metadata: { full_name: 'Alex Researcher' },
      role: 'authenticated',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
    };

    const validJwtToken = jwt.sign(validPayload, testSecret);

    const res1 = await fetch(`${baseUrl}/notebooks`, {
      headers: { Authorization: `Bearer ${validJwtToken}` },
    });
    await assert(
      'Valid Supabase JWT token grants access (HTTP 200 OK)',
      res1.status === 200,
      `Received status ${res1.status}`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2: Notebook Creation with Valid JWT Token
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3: Invalid JWT Secret Signature Rejection in Production Mode
    // ─────────────────────────────────────────────────────────────────────────
    const invalidSecretToken = jwt.sign(validPayload, 'wrong-fake-jwt-secret-key-999');

    // Simulate production mode for signature enforcement
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const res3 = await fetch(`${baseUrl}/notebooks`, {
      headers: { Authorization: `Bearer ${invalidSecretToken}` },
    });
    process.env.NODE_ENV = originalNodeEnv;

    await assert(
      'Invalid JWT secret signature is rejected in production (HTTP 401)',
      res3.status === 401,
      `Received status ${res3.status}`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4: Expired JWT Token Rejection
    // ─────────────────────────────────────────────────────────────────────────
    const expiredPayload = {
      ...validPayload,
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    };
    const expiredJwtToken = jwt.sign(expiredPayload, testSecret);

    process.env.NODE_ENV = 'production';
    const res4 = await fetch(`${baseUrl}/notebooks`, {
      headers: { Authorization: `Bearer ${expiredJwtToken}` },
    });
    process.env.NODE_ENV = originalNodeEnv;

    await assert(
      'Expired JWT token is rejected (HTTP 401)',
      res4.status === 401,
      `Received status ${res4.status}`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Test 5: Convenience Dev Token Fallback
    // ─────────────────────────────────────────────────────────────────────────
    const res5 = await fetch(`${baseUrl}/notebooks`, {
      headers: { Authorization: 'Bearer dev-token' },
    });
    await assert(
      'Dev-token fallback grants default workspace access (HTTP 200 OK)',
      res5.status === 200,
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
