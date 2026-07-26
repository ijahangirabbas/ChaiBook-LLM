import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email?: string
    role?: string
  }
}

/**
 * Express Middleware to authenticate incoming request using Supabase JWT token
 */
export const authenticateUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid authorization header',
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Decode Supabase JWT payload
    const decoded = jwt.decode(token) as any

    if (!decoded || !decoded.sub) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid or expired token',
      })
    }

    // Attach decoded user metadata (Supabase user UUID & email)
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    }

    next()
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized: Failed to authenticate token',
    })
  }
}
