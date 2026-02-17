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
  if (process.env.DISABLE_AUTH === 'true' || process.env.DISABLE_AUTH === '1') {
    req.user = { id: 'test' }
    return next()
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : authHeader.trim()
    if (!token) {
      return res.status(401).json({ error: 'Invalid authorization format' })
    }

    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
    if (!secret) {
      // Misconfiguration: verification secret missing
      return res.status(500).json({ error: 'Auth not configured' })
    }

    const payload = jwt.verify(token, secret) as {
      sub: string
      email?: string
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
    }

    next()
  } catch (err) {
    console.log(err)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
