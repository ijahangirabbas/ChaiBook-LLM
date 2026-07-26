import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../db/prisma.client';

export class UserController {
  // GET /api/v1/me
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/me/settings
  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
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

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/me/settings
  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
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

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/me/export
  async exportAccountData(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.user?.workspaceId;
      const userId = req.user?.id;

      const [notebooks, sources, conversations] = await Promise.all([
        prisma.notebook.findMany({ where: { workspaceId, deletedAt: null } }),
        prisma.source.findMany({ where: { workspaceId, deletedAt: null } }),
        prisma.conversation.findMany({
          where: { workspaceId },
          include: { messages: { include: { citations: true } } },
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          user: req.user,
          exportDate: new Date(),
          notebooks,
          sources,
          conversations,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/me
  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' });
        return;
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      res.status(200).json({
        success: true,
        message: 'Account and associated workspace data deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
