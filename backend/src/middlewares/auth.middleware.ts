import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../config/env.config';
import { prisma } from '../db/prisma.client';

export interface AuthenticatedUser {
  id: string;
  supabaseSubject: string;
  email: string;
  workspaceId: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Enterprise Production Auth Middleware:
 * Strictly verifies JWT tokens against Supabase JWT secret in production.
 * Rejects unauthenticated requests with 401 Unauthorized.
 */
export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const authHeader = req.headers.authorization;

  // 1. Enforce Presence of Bearer Authorization Header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized: Missing or invalid authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized: Empty token provided',
    });
  }

  // 2. Development/Test Mode Convenience Token Support
  if (token === 'dev-token') {
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Unauthorized: Dev tokens are disabled in production environment',
      });
    }

    req.user = {
      id: 'dev-user-id',
      supabaseSubject: 'dev-sub-123',
      email: 'dev@chaibook.local',
      workspaceId: 'default',
      role: 'OWNER',
    };
    return next();
  }

  // 3. JWT Verification & Claim Extraction
  try {
    let decoded: JwtPayload | null = null;

    if (config.supabaseJwtSecret) {
      try {
        decoded = jwt.verify(token, config.supabaseJwtSecret) as JwtPayload;
      } catch (err: any) {
        // Signature verification failure in production strictly returns 401
        if (process.env.NODE_ENV === 'production') {
          return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN',
            message: 'Unauthorized: Invalid or expired token signature',
          });
        }
        decoded = jwt.decode(token) as JwtPayload;
      }
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        success: false,
        code: 'AUTH_CONFIG_ERROR',
        message: 'Unauthorized: Server authentication secret is missing',
      });
    } else {
      // In development/testing without a secret, safely decode claims
      decoded = jwt.decode(token) as JwtPayload;
    }

    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN_CLAIMS',
        message: 'Unauthorized: Token is missing required subject claim',
      });
    }

    const sub = decoded.sub;
    const email = decoded.email || `${sub}@auth.supabase.local`;
    const name = decoded.user_metadata?.full_name || decoded.name || email.split('@')[0];

    // 4. Provision or Fetch Durable User & Workspace in PostgreSQL
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { supabaseSubject: sub },
        include: {
          memberships: {
            include: {
              workspace: true,
            },
          },
        },
      });

      if (!user) {
        const workspaceSlug = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        user = await prisma.user.create({
          data: {
            supabaseSubject: sub,
            email,
            name,
            provider: decoded.app_metadata?.provider || 'google',
            memberships: {
              create: {
                role: 'OWNER',
                workspace: {
                  create: {
                    name: `${name}'s Workspace`,
                    slug: workspaceSlug,
                  },
                },
              },
            },
          },
          include: {
            memberships: {
              include: {
                workspace: true,
              },
            },
          },
        });
      }
    } catch (dbErr) {
      // Fallback to claim-derived tenant workspace ID if DB is temporarily unreachable
    }

    const primaryWorkspaceId = user?.memberships?.[0]?.workspaceId || `ws-${sub}`;

    req.user = {
      id: user?.id || sub,
      supabaseSubject: sub,
      email,
      workspaceId: primaryWorkspaceId,
      role: typeof decoded.role === 'string' ? decoded.role : undefined,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_FAILED',
      message: 'Unauthorized: Authentication token parsing failed',
    });
  }
};
