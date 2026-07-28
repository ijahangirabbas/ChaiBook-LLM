import type { AuthenticatedUser } from '../middlewares/auth.middleware';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthenticatedUser;
    }
  }
}

export {};
