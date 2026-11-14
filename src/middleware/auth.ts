import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser, OWNER_ADMIN_EMAIL, OWNER_ADMIN_EMAILS } from '../db/users.ts';
import {
  extractAdminTokenFromHeaders,
  verifySignedAdminToken,
} from '../../api/_lib/adminToken.ts';

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
    // 1. Simple Mode: Verify server-signed HMAC Admin Session Token (works on any domain without Firebase popup)
    const adminSessionToken = extractAdminTokenFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
      req.body
    );

    if (adminSessionToken && verifySignedAdminToken(adminSessionToken)) {
      const dbUser = await getOrCreateUser('sabbir_ahamed_owner', OWNER_ADMIN_EMAIL);
      req.user = {
        uid: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      };
      next();
      return;
    }

    // 2. Fallback / Optional Mode: Verify Firebase Google ID Token for sabbircse72@gmail.com
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Session required. Please unlock Admin Panel with your password.',
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

    if (!OWNER_ADMIN_EMAILS.includes(email)) {
      res.status(403).json({
        success: false,
        error: `Unauthorized email (${email}). Owner account required.`,
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
      error: 'Session expired. Please unlock Admin Panel with your password again.',
    });
  }
}
