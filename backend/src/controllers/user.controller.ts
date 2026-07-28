import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../db/prisma.client';
import { sendError, sendSuccess } from '../utils/http-response.utils';

export class UserController {
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, req.user);
    } catch (error) {
      next(error);
    }
  }

  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Unauthorized');
        return;
      }

      let settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      if (!settings) {
        settings = await prisma.userSettings.create({
          data: {
            userId,
            theme: 'light',
            notificationsEnabled: true,
          },
        });
      }

      sendSuccess(res, settings);
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Unauthorized');
        return;
      }

      const { theme, notificationsEnabled } = req.body;

      const updated = await prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          theme: theme || 'light',
          notificationsEnabled: notificationsEnabled ?? true,
        },
        update: {
          ...(theme !== undefined ? { theme } : {}),
          ...(notificationsEnabled !== undefined ? { notificationsEnabled } : {}),
        },
      });

      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }

  async exportAccountData(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.user?.workspaceId;

      const [notebooks, sources, conversations] = await Promise.all([
        prisma.notebook.findMany({ where: { workspaceId, deletedAt: null } }),
        prisma.source.findMany({ where: { workspaceId, deletedAt: null } }),
        prisma.conversation.findMany({
          where: { workspaceId },
          include: { messages: { include: { citations: true } } },
        }),
      ]);

      sendSuccess(res, {
        user: req.user,
        exportDate: new Date(),
        notebooks,
        sources,
        conversations,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Unauthorized');
        return;
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      sendSuccess(res, { message: 'Account and associated workspace data deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
