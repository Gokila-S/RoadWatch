import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Missing authorization token' })
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user?.role) {
    return res.status(403).json({ message: 'Forbidden: role missing' })
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient privileges' })
  }

  return next()
}
