import { verifyToken } from '@clerk/backend';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../config/env.config';

export interface VerifiedAuthClaims {
  sub: string;
  email?: string;
  name?: string;
  role: string;
}

/**
 * Cryptographically verifies a Bearer token.
 * - Production / development: Clerk session JWT via @clerk/backend (JWKS + signature check).
 * - Automated tests only: HS256 tokens signed with TEST_JWT_SECRET when NODE_ENV=test.
 */
export async function verifyBearerToken(token: string): Promise<VerifiedAuthClaims> {
  if (config.nodeEnv === 'test' && process.env.TEST_JWT_SECRET) {
    const decoded = jwt.verify(token, process.env.TEST_JWT_SECRET) as JwtPayload;

    const sub = decoded.sub || decoded.user_id;
    if (!sub || typeof sub !== 'string') {
      throw new Error('Token is missing required user claims (sub/user_id)');
    }

    const email =
      (typeof decoded.email === 'string' && decoded.email) ||
      (typeof decoded.primary_email === 'string' && decoded.primary_email) ||
      undefined;

    const name =
      (typeof decoded.name === 'string' && decoded.name) ||
      (typeof decoded.full_name === 'string' && decoded.full_name) ||
      undefined;

    return {
      sub,
      email,
      name,
      role: typeof decoded.role === 'string' ? decoded.role : 'authenticated',
    };
  }

  if (!config.clerkSecretKey) {
    throw new Error('CLERK_SECRET_KEY is not configured on the server');
  }

  const payload = await verifyToken(token, {
    secretKey: config.clerkSecretKey,
  });

  if (!payload.sub) {
    throw new Error('Clerk token is missing required subject (sub) claim');
  }

  const email =
    (typeof payload.email === 'string' && payload.email) ||
    (typeof payload.primary_email_address === 'string' && payload.primary_email_address) ||
    undefined;

  const name =
    (typeof payload.name === 'string' && payload.name) ||
    (typeof payload.full_name === 'string' && payload.full_name) ||
    (typeof payload.first_name === 'string' ? payload.first_name : undefined);

  return {
    sub: payload.sub,
    email,
    name,
    role: 'authenticated',
  };
}

export const isClerkConfigured = Boolean(config.clerkSecretKey);
