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
    req.user = { id: 'user_1' }
    return next()
  }

  try {
    
    console.log("req headerrs from middleware is...")
    console.log(req.headers);
    console.log("////////")
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : authHeader.trim()
      console.log("token from middleware is ...")
      console.log(token)
    if (!token) {
      return res.status(401).json({ error: 'Invalid authorization format' })
    }

    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
    if (!secret) {
      // Misconfiguration: verification secret missing
      return res.status(500).json({ error: 'Auth not configured' })
    }

    const payload = jwt.verify(token, secret) as {
      id?: string
      email?: string
      sub?: string
    }
    console.log("payload from middleware is...")
    console.log(payload)

    req.user = {
      id: (payload?.id || payload?.sub)!,
      email: payload?.email,
    }

    next()
  } catch (err) {
    console.log(err)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}
