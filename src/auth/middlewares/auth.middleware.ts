import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Extract the token
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    // 401 if the token is absent
    return res.status(401).json({ error: 'Missing token' })
  }

  try {
    // Check and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number
      email: string
    }

    // Data attached to the request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    }

    // Call the next middleware
    return next()
  } catch (error) {
    // 401 if the token is invalid
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
