import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../lib/auth';

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * Middleware to authenticate requests using JWT from cookies
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({ error: 'Autentificare necesară' });
    return;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(403).json({ error: 'Token invalid sau expirat' });
    return;
  }

  req.user = decoded;
  next();
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Autentificare necesară' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Nu ai permisiunea necesară' });
      return;
    }

    next();
  };
}
