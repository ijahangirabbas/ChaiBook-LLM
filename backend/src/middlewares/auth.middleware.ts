import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.client';
import { verifyBearerToken } from '../lib/clerk.auth';
import { sendError } from '../utils/http-response.utils';
import { logger } from '../lib/logger';

export interface AuthenticatedUser {
  id: string;
  authSubject: string;
  email: string;
  workspaceId: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, 'UNAUTHORIZED', 'Unauthorized: Missing or invalid authorization header');
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    sendError(res, 401, 'UNAUTHORIZED', 'Unauthorized: Empty token provided');
    return;
  }

  try {
    const claims = await verifyBearerToken(token);

    const sub = claims.sub;
    const email = claims.email || `${sub}@chaibook.ai`;
    const name = claims.name || email.split('@')[0];
    const role = claims.role || 'authenticated';

    let primaryWorkspaceId = `ws-${sub}`;
    let userId = `usr-${sub}`;

    try {
      let user = await prisma.user.findUnique({
        where: { authSubject: sub },
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
            authSubject: sub,
            email,
            name,
            provider: 'clerk',
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
      logger.error({ err: dbErr }, 'Database connection error in auth middleware');
      sendError(
        res,
        500,
        'DATABASE_UNAVAILABLE',
        'Server error: Unable to connect to database for tenant authorization.'
      );
      return;
    }

    req.user = {
      id: userId,
      authSubject: sub,
      email,
      workspaceId: primaryWorkspaceId,
      role,
    };

    return next();
  } catch (error: any) {
    logger.warn({ err: error?.message || error }, 'Auth middleware token verification failed');
    sendError(res, 401, 'AUTH_FAILED', 'Unauthorized: Invalid or expired authentication token');
    return;
  }
};
