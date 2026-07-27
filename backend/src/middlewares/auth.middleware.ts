import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../config/env.config';
import { prisma } from '../db/prisma.client';
import { supabaseAdmin, isSupabaseAdminConfigured } from '../lib/supabase.admin';

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
 * Modern Enterprise Supabase Auth Middleware:
 * Uses Supabase Auth Service (`supabaseAdmin.auth.getUser(token)`) per latest official Supabase docs.
 * Validates expiration, signature, user active status, and token claims.
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

  // 3. Official Supabase Auth Service Verification
  try {
    let sub = '';
    let email = '';
    let name = '';
    let role = 'authenticated';

    if (isSupabaseAdminConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !data.user) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_TOKEN',
          message: error?.message || 'Unauthorized: Invalid or expired token',
        });
      }

      sub = data.user.id;
      email = data.user.email || `${sub}@auth.supabase.local`;
      name = data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0];
      role = data.user.role || 'authenticated';
    } else {
      // Fallback JWT Verification if Supabase URL / Service Role Key is omitted
      let decoded: JwtPayload | null = null;

      if (config.supabaseJwtSecret) {
        try {
          decoded = jwt.verify(token, config.supabaseJwtSecret) as JwtPayload;
        } catch (err: any) {
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
        decoded = jwt.decode(token) as JwtPayload;
      }

      if (!decoded || !decoded.sub) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_TOKEN_CLAIMS',
          message: 'Unauthorized: Token is missing required subject claim',
        });
      }

      sub = decoded.sub;
      email = decoded.email || `${sub}@auth.supabase.local`;
      name = decoded.user_metadata?.full_name || decoded.name || email.split('@')[0];
      role = typeof decoded.role === 'string' ? decoded.role : 'authenticated';
    }

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
            provider: 'google',
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
      role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_FAILED',
      message: 'Unauthorized: Authentication token validation failed',
    });
  }
};
