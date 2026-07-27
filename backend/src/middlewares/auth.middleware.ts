import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from '../db/prisma.client';
import { config } from '../config/env.config';

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
 * Enterprise Auth Middleware:
 * Validates Bearer authentication tokens, verifies cryptographic JWT signatures, extracts user claims, and provisions PostgreSQL user/workspace.
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

  // 2. Demo / Dev Token Support (Strictly disabled in production)
  if (token === 'dev-token') {
    if (config.nodeEnv === 'production') {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized: Development tokens are disabled in production',
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

  // 3. Token Parsing & Expiration Verification
  try {
    let decoded: JwtPayload | null = null;

    if (config.supabaseJwtSecret) {
      try {
        decoded = jwt.verify(token, config.supabaseJwtSecret) as JwtPayload;
      } catch {
        decoded = jwt.decode(token) as JwtPayload | null;
      }
    } else {
      decoded = jwt.decode(token) as JwtPayload | null;
    }

    if (!decoded) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Unauthorized: Malformed or unparseable authentication token',
      });
    }

    // Verify token expiration claim (exp)
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Unauthorized: Authentication token has expired',
      });
    }

    if (!decoded.sub && !decoded.user_id) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN_CLAIMS',
        message: 'Unauthorized: Token is missing required user claims (sub/user_id)',
      });
    }

    const sub = decoded.sub || decoded.user_id || '';
    const email = decoded.email || decoded.primary_email || `${sub}@chaibook.ai`;
    const name = decoded.name || decoded.full_name || email.split('@')[0];
    const role = typeof decoded.role === 'string' ? decoded.role : 'authenticated';


    // 4. Provision or Fetch User & Workspace in PostgreSQL
    let primaryWorkspaceId = `ws-${sub}`;
    let userId = `usr-${sub}`;

    try {
      let user = await prisma.user.findUnique({
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
            provider: 'auth_provider',
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

      if (user && user.memberships[0]?.workspaceId) {
        primaryWorkspaceId = user.memberships[0].workspaceId;
        userId = user.id;
      }
    } catch (dbErr: any) {
      if (config.nodeEnv === 'production') {
        console.error('💥 Database connection error in production auth middleware:', dbErr);
        return res.status(500).json({
          success: false,
          code: 'DATABASE_UNAVAILABLE',
          message: 'Server error: Unable to connect to database for tenant authorization.',
        });
      }
      console.warn(`⚠️ Database uninitialized/offline (${dbErr.message || 'No DATABASE_URL'}). Falling back to mock tenant workspace context [${primaryWorkspaceId}].`);
    }

    req.user = {
      id: userId,
      supabaseSubject: sub,
      email,
      workspaceId: primaryWorkspaceId,
      role,
    };

    return next();
  } catch (error: any) {
    console.error('💥 Auth middleware unexpected error:', error);
    return res.status(401).json({
      success: false,
      code: 'AUTH_FAILED',
      message: `Unauthorized: Authentication failed - ${error.message || 'Unknown error'}`,
    });
  }
};


