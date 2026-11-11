import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser, OWNER_ADMIN_EMAIL } from '../db/users.ts';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
  };
}

export async function requireOwnerAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in with sabbircse72@gmail.com.',
      });
      return;
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || '').trim().toLowerCase();

    if (!email || !decoded.email_verified) {
      res.status(403).json({
        success: false,
        error: 'Verified Google email is required.',
      });
      return;
    }

    if (email !== OWNER_ADMIN_EMAIL) {
      res.status(403).json({
        success: false,
        error: `Unauthorized email (${email}). Only ${OWNER_ADMIN_EMAIL} is permitted.`,
      });
      return;
    }

    const dbUser = await getOrCreateUser(decoded.uid, email);
    req.user = {
      uid: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    };

    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE ERROR]', err);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication session. Please sign in again.',
    });
  }
}
