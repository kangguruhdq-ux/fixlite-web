import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { RoleType } from '@pixellift/types';

export const JWT_SECRET = process.env.JWT_SECRET || 'pixellift_secret_jwt_key_super_secure_2026';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  membership: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function authenticateJwt(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    // Verify user exists and is active in database
    const user = db.prepare('SELECT id, name, email, role, membership, status FROM users WHERE id = ?').get(decoded.id) as any;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'Account has been suspended' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as RoleType,
      membership: user.membership,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function optionalJwt(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      const user = db.prepare('SELECT id, name, email, role, membership, status FROM users WHERE id = ?').get(decoded.id) as any;
      if (user && user.status !== 'Suspended') {
        req.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as RoleType,
          membership: user.membership,
        };
      }
    } catch {
      // Ignore invalid optional tokens
    }
  }
  next();
}

export function requireRole(allowedRoles: RoleType[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Role '${req.user.role}' lacks permission` });
    }
    next();
  };
}
