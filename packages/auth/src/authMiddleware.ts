import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email?: string
  }
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'Invalid authorization format' })
    }

    const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as {
      sub: string
      email?: string
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
    }

    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
