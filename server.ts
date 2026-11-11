/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Backend Server Entry Point
 * Description : Express server handling PostgreSQL (Drizzle ORM) persistence,
 *               Firebase Auth (sabbircse72@gmail.com) verification, Brevo email routing,
 *               visitor analytics, and Vite dev/prod asset delivery.
 * Author      : Sabbir Ahamed
 * -----------------------------------------
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  extractAdminTokenFromHeaders,
  issueSignedAdminToken,
  verifyServerPasscode,
  verifySignedAdminToken,
} from './api/_lib/adminToken.ts';
import {
  createBugReportInDb,
  createContactMessageInDb,
  deleteBugReportFromDbServer,
  deleteContactMessageFromDbServer,
  getPortfolioSnapshotFromDb,
  getVisitorStatsFromDb,
  listBugReportsFromDb,
  listContactMessagesFromDb,
  recordVisitorHitInDb,
  savePortfolioSnapshotToDb,
  updateBugReportStatusInDbServer,
  updateContactMessageStatusInDbServer,
  type DbPortfolioSnapshotPayload,
} from './src/db/repository.ts';
import { requireOwnerAuth, type AuthenticatedRequest } from './src/middleware/auth.ts';

const RUNTIME_STORAGE_DIR = path.join(os.tmpdir(), 'sabbir-sqa-portfolio-runtime');
const SEED_PORTFOLIO_FILE = path.join(process.cwd(), 'portfolio_custom_data.json');
const ADMIN_AUTH_FILE = path.join(RUNTIME_STORAGE_DIR, 'admin_security.json');
const UPLOADS_DIR = path.join(RUNTIME_STORAGE_DIR, 'uploads');

try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (err) {
  console.error('Error creating runtime storage directory:', err);
}

interface StoredAdminSecurity {
  salt: string;
  passwordHash: string;
  updatedAt: string;
}

function loadAdminSecurity(): StoredAdminSecurity | null {
  try {
    if (fs.existsSync(ADMIN_AUTH_FILE)) {
      const raw = fs.readFileSync(ADMIN_AUTH_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.salt === 'string' && typeof parsed.passwordHash === 'string') {
        return parsed as StoredAdminSecurity;
      }
    }
  } catch (err) {
    console.error('Error reading admin security config:', err);
  }
  return null;
}

function saveAdminSecurity(newPasscode: string): void {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(newPasscode, salt, 64).toString('hex');
  const payload: StoredAdminSecurity = {
    salt,
    passwordHash,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(ADMIN_AUTH_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}

function verifyPasscodeOnServer(inputRaw: string): boolean {
  const inputPasscode = inputRaw.trim();
  if (!inputPasscode) return false;

  const customSecurity = loadAdminSecurity();
  if (customSecurity) {
    const candidateHash = crypto.scryptSync(inputPasscode, customSecurity.salt, 64).toString('hex');
    const b1 = Buffer.from(customSecurity.passwordHash, 'hex');
    const b2 = Buffer.from(candidateHash, 'hex');
    return b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
  }

  return verifyServerPasscode(inputPasscode);
}

const validOwnerTokens = new Set<string>();

async function startServer(): Promise<void> {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ------------------------------------------------------------------------
  // Transactional Contact Email Route (Brevo REST API v3)
  // ------------------------------------------------------------------------
  app.post('/api/contact', async (req: Request, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          error: 'Missing required fields (name, email, subject, message).',
        });
      }

      const brevoApiKey = process.env.BREVO_API_KEY;
      const isKeyConfigured = Boolean(brevoApiKey && brevoApiKey !== 'YOUR_BREVO_API_KEY_HERE');

      const senderEmail = process.env.BREVO_SENDER_EMAIL || 'sabbircse72@gmail.com';
      const recipientEmail = process.env.BREVO_RECIPIENT_EMAIL || 'sabbircse72@gmail.com';

      const sanitizeInput = (str: string): string =>
        str.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      if (!isKeyConfigured) {
        return res.status(200).json({
          success: true,
          message: 'Message received successfully!',
          demoMode: true,
        });
      }

      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey!,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: `${name} (Portfolio Form)`,
            email: senderEmail,
          },
          to: [
            {
              email: recipientEmail,
              name: 'Sabbir Ahamed',
            },
          ],
          replyTo: {
            email,
            name,
          },
          subject: `[Portfolio Contact] ${subject}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
              <div style="margin-bottom: 20px; text-align: center;">
                <h2 style="color: #FF6B35; margin: 0; font-size: 22px;">New Portfolio Inquiry</h2>
                <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Sent from your SQA Portfolio Contact Form</p>
              </div>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
              <div style="margin-bottom: 16px;">
                <p style="margin: 4px 0; font-size: 14px;"><strong>Sender Name:</strong> ${sanitizeInput(name)}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Sender Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a></p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Subject:</strong> ${sanitizeInput(subject)}</p>
              </div>
              <div style="background-color: #f8fafc; padding: 18px; border-left: 4px solid #FF6B35; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Message Content:</p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #334155;">${sanitizeInput(message)}</p>
              </div>
            </div>
          `,
        }),
      });

      if (!brevoResponse.ok) {
        const errorData = await brevoResponse.json().catch(() => ({}));
        return res.status(brevoResponse.status || 400).json({
          error: errorData?.message || `Email API returned status ${brevoResponse.status}`,
          details: errorData,
          status: brevoResponse.status,
        });
      }

      const responseData = await brevoResponse.json().catch(() => ({}));
      return res.status(200).json({
        success: true,
        message: 'Message delivered successfully via Brevo!',
        messageId: responseData?.messageId,
      });
    } catch (err) {
      console.error('[SERVER ERROR] Contact endpoint exception:', err);
      return res.status(500).json({ error: 'Internal server error while dispatching email.' });
    }
  });

  // ------------------------------------------------------------------------
  // Admin Passcode Lock Routes
  // ------------------------------------------------------------------------
  app.post('/api/admin/verify', (req: Request, res: Response) => {
    try {
      const { passcode } = req.body;
      if (!passcode || typeof passcode !== 'string') {
        return res.status(400).json({ success: false, error: 'Password is required.' });
      }

      if (verifyPasscodeOnServer(passcode)) {
        const token = issueSignedAdminToken();
        validOwnerTokens.add(token);
        return res.status(200).json({
          success: true,
          message: 'Admin session authorized.',
          token,
          ownerId: 'sabbir_ahamed_owner',
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Access denied.',
      });
    } catch (err) {
      console.error('[ADMIN AUTH API ERROR]', err);
      return res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  });

  app.post('/api/admin/update-passcode', (req: Request, res: Response) => {
    try {
      const { currentPasscode, newPasscode } = req.body;
      if (!currentPasscode || typeof currentPasscode !== 'string') {
        return res.status(400).json({ success: false, error: 'Current password is required.' });
      }
      if (!newPasscode || typeof newPasscode !== 'string' || newPasscode.trim().length < 4) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 4 characters long.',
        });
      }
      if (!verifyPasscodeOnServer(currentPasscode)) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect.',
        });
      }

      saveAdminSecurity(newPasscode.trim());
      validOwnerTokens.clear();
      const token = issueSignedAdminToken();
      validOwnerTokens.add(token);

      return res.status(200).json({
        success: true,
        message: 'Main security password updated successfully.',
        token,
        ownerId: 'sabbir_ahamed_owner',
      });
    } catch (err) {
      console.error('[ADMIN UPDATE PASSCODE ERROR]', err);
      return res.status(500).json({ success: false, error: 'Failed to update password.' });
    }
  });

  app.post('/api/owner/verify-token', (req: Request, res: Response) => {
    try {
      const token = extractAdminTokenFromHeaders(
        req.headers as Record<string, string | string[] | undefined>,
        req.body
      );

      if (verifySignedAdminToken(token, validOwnerTokens)) {
        validOwnerTokens.add(token);
        return res.status(200).json({
          success: true,
          isOwner: true,
          ownerId: 'sabbir_ahamed_owner',
          message: 'Owner authorization confirmed by server.',
        });
      }

      return res.status(403).json({
        success: false,
        isOwner: false,
        error: 'Unauthorized: Owner access required.',
      });
    } catch {
      return res
        .status(500)
        .json({ success: false, isOwner: false, error: 'Server authorization check failed.' });
    }
  });

  app.post('/api/owner/suite-access', (req: Request, res: Response) => {
    try {
      const token = extractAdminTokenFromHeaders(
        req.headers as Record<string, string | string[] | undefined>,
        req.body
      );

      if (!verifySignedAdminToken(token, validOwnerTokens)) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: AI SQA Application Suite is strictly restricted to portfolio owner.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Owner access authorized for AI SQA Application Suite.',
      });
    } catch {
      return res.status(500).json({ success: false, error: 'Authorization error.' });
    }
  });

  // ------------------------------------------------------------------------
  // Local Uploaded Media Handler
  // ------------------------------------------------------------------------
  app.post('/api/upload-image', (req: Request, res: Response) => {
    try {
      const { dataUrl, fileName } = req.body || {};
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ success: false, error: 'Image data is required.' });
      }

      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ success: false, error: 'Invalid image data format.' });
      }

      const extMap: Record<string, string> = {
        jpeg: 'jpg',
        jpg: 'jpg',
        png: 'png',
        webp: 'webp',
        gif: 'gif',
        'svg+xml': 'svg',
      };
      const ext = extMap[match[1].toLowerCase()];
      if (!ext) {
        return res.status(400).json({ success: false, error: 'Unsupported image type.' });
      }

      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 20 * 1024 * 1024) {
        return res.status(413).json({ success: false, error: 'Image exceeds 20MB limit.' });
      }

      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }

      const baseSlug =
        (typeof fileName === 'string' ? fileName : 'portfolio-image')
          .replace(/\.[^/.]+$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'image';

      const uniqueName = `${baseSlug}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, uniqueName), buffer);

      return res.status(200).json({
        success: true,
        url: `/uploads/${uniqueName}`,
      });
    } catch (err) {
      console.error('[IMAGE UPLOAD API ERROR]', err);
      return res.status(500).json({ success: false, error: 'Failed to store uploaded image.' });
    }
  });

  // ------------------------------------------------------------------------
  // PostgreSQL Portfolio Snapshot Endpoints
  // ------------------------------------------------------------------------
  app.get('/api/portfolio/snapshot', async (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    try {
      const data = await getPortfolioSnapshotFromDb();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      console.error('[PORTFOLIO SNAPSHOT GET ERROR]', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to load portfolio data from database.',
      });
    }
  });

  const handleSaveSnapshot = async (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const snapshot = (
        body.snapshot && typeof body.snapshot === 'object' ? body.snapshot : body
      ) as DbPortfolioSnapshotPayload;

      if (!snapshot || typeof snapshot !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid portfolio payload.' });
      }

      const saved = await savePortfolioSnapshotToDb(snapshot, req.user!.uid);
      return res.status(200).json({
        success: true,
        ...saved,
        savedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[PORTFOLIO SNAPSHOT SAVE ERROR]', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to save portfolio data to database.',
      });
    }
  };

  app.post('/api/portfolio/snapshot', requireOwnerAuth, handleSaveSnapshot);
  app.put('/api/portfolio/snapshot', requireOwnerAuth, handleSaveSnapshot);

  // Legacy seed reader kept read-only for fallback compatibility
  app.get('/api/portfolio/data', (_req: Request, res: Response) => {
    try {
      if (fs.existsSync(SEED_PORTFOLIO_FILE)) {
        const raw = fs.readFileSync(SEED_PORTFOLIO_FILE, 'utf-8');
        const data = JSON.parse(raw);
        return res.json({ success: true, data });
      }
      return res.json({ success: true, data: null });
    } catch (err) {
      console.error('[PORTFOLIO API GET ERROR]', err);
      return res.status(500).json({ success: false, error: 'Failed to read portfolio seed data.' });
    }
  });

  // ------------------------------------------------------------------------
  // PostgreSQL User Submissions Endpoints (Contact Messages & Bug Tracker)
  // ------------------------------------------------------------------------
  app.post('/api/submissions/messages', async (req: Request, res: Response) => {
    try {
      const { id, name, email, subject, message, createdAtIso } = req.body || {};
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ success: false, error: 'All contact fields are required.' });
      }

      const cleanId =
        typeof id === 'string' && id.trim()
          ? id.trim().slice(0, 120)
          : `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      const row = await createContactMessageInDb({
        id: cleanId,
        name: String(name).trim().slice(0, 160),
        email: String(email).trim().slice(0, 240),
        subject: String(subject).trim().slice(0, 300),
        message: String(message).trim().slice(0, 5000),
        createdAtIso:
          typeof createdAtIso === 'string' && createdAtIso.trim()
            ? createdAtIso.trim()
            : new Date().toISOString(),
      });

      return res.status(201).json({ success: true, data: row });
    } catch (err) {
      console.error('[SUBMISSION MESSAGE CREATE ERROR]', err);
      return res.status(500).json({ success: false, error: 'Failed to store contact message.' });
    }
  });

  app.get(
    '/api/submissions/messages',
    requireOwnerAuth,
    async (_req: AuthenticatedRequest, res: Response) => {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      try {
        const rows = await listContactMessagesFromDb();
        return res.status(200).json({ success: true, data: rows });
      } catch (err) {
        console.error('[SUBMISSION MESSAGES LIST ERROR]', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch messages.' });
      }
    }
  );

  app.patch(
    '/api/submissions/messages/:id',
    requireOwnerAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const id = req.params.id;
        const { status } = req.body || {};
        if (!['new', 'read', 'resolved'].includes(status)) {
          return res.status(400).json({ success: false, error: 'Invalid status value.' });
        }
        const updated = await updateContactMessageStatusInDbServer(id, status);
        if (!updated) {
          return res.status(404).json({ success: false, error: 'Message not found.' });
        }
        return res.status(200).json({ success: true, data: updated });
      } catch (err) {
        console.error('[SUBMISSION MESSAGE UPDATE ERROR]', err);
        return res.status(500).json({ success: false, error: 'Failed to update message status.' });
      }
    }
  );

  app.delete(
    '/api/submissions/messages/:id',
    requireOwnerAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        await deleteContactMessageFromDbServer(req.params.id);
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('[SUBMISSION MESSAGE DELETE ERROR]', err);
        return res.status(500).json({ success: false, error: 'Failed to delete message.' });
      }
    }
  );

  app.get('/api/submissions/bugs', async (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    try {
      const rows = await listBugReportsFromDb();
      return res.status(200).json({ success: true, data: rows });
    } catch (err) {
      console.error('[SUBMISSION BUGS LIST ERROR]', err);
      return res.status(500).json({ success: false, error: 'Failed to load defect reports.' });
    }
  });

  app.post('/api/submissions/bugs', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      if (!body.title || !body.description) {
        return res
          .status(400)
          .json({ success: false, error: 'Title and description are required.' });
      }

      const cleanId =
        typeof body.id === 'string' && body.id.trim()
          ? body.id.trim().slice(0, 120)
          : `BUG_USER_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      const severity =
        body.severity === 'Critical' || body.severity === 'Major' || body.severity === 'Minor'
          ? body.severity
          : 'Major';

      const steps = Array.isArray(body.stepsToReproduce)
        ? body.stepsToReproduce
            .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
            .slice(0, 25)
        : ['Navigate to application URL', 'Observe anomalous outcome'];

      const row = await createBugReportInDb({
        id: cleanId,
        title: String(body.title).trim().slice(0, 300),
        project: String(body.project || 'SaaS E-Commerce Platform').trim().slice(0, 200),
        severity,
        description: String(body.description).trim().slice(0, 5000),
        stepsToReproduce: steps,
        expectedResult: String(
          body.expectedResult || 'System executes operation smoothly without errors.'
        )
          .trim()
          .slice(0, 2000),
        actualResult: String(
          body.actualResult || 'System encounters error or unexpected UI degradation.'
        )
          .trim()
          .slice(0, 2000),
        status: 'Open',
        createdAtIso:
          typeof body.createdAtIso === 'string' && body.createdAtIso.trim()
            ? body.createdAtIso.trim()
            : new Date().toISOString(),
      });

      return res.status(201).json({ success: true, data: row });
    } catch (err) {
      console.error('[SUBMISSION BUG CREATE ERROR]', err);
      return res.status(500).json({ success: false, error: 'Failed to submit defect report.' });
    }
  });

  app.patch(
    '/api/submissions/bugs/:id',
    requireOwnerAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const id = req.params.id;
        const { status, fallbackBug } = req.body || {};
        if (status !== 'Open' && status !== 'Resolved') {
          return res.status(400).json({ success: false, error: 'Invalid bug status.' });
        }
        const updated = await updateBugReportStatusInDbServer(id, status, fallbackBug);
        if (!updated) {
          return res.status(404).json({ success: false, error: 'Bug report not found.' });
        }
        return res.status(200).json({ success: true, data: updated });
      } catch (err) {
        console.error('[SUBMISSION BUG UPDATE ERROR]', err);
        return res.status(500).json({ success: false, error: 'Failed to update bug report.' });
      }
    }
  );

  app.delete(
    '/api/submissions/bugs/:id',
    requireOwnerAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        await deleteBugReportFromDbServer(req.params.id);
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('[SUBMISSION BUG DELETE ERROR]', err);
        return res.status(500).json({ success: false, error: 'Failed to delete bug report.' });
      }
    }
  );

  // ------------------------------------------------------------------------
  // PostgreSQL Visitor Analytics Endpoints
  // ------------------------------------------------------------------------
  app.get('/api/visitors', async (_req: Request, res: Response) => {
    try {
      const stats = await getVisitorStatsFromDb();
      return res.json({
        success: true,
        ...stats,
      });
    } catch (err) {
      console.error('[VISITOR API ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch visitor metrics.' });
    }
  });

  app.post('/api/visitors/hit', async (req: Request, res: Response) => {
    try {
      const { visitorId, sessionId, isNewSession } = req.body || {};
      const stats = await recordVisitorHitInDb(visitorId, sessionId, Boolean(isNewSession));
      return res.json({
        success: true,
        ...stats,
      });
    } catch (err) {
      console.error('[VISITOR HIT API ERROR]', err);
      return res.status(500).json({ error: 'Failed to record visitor hit.' });
    }
  });

  // ------------------------------------------------------------------------
  // Health Check & Asset Delivery
  // ------------------------------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'portfolio-server', timestamp: new Date().toISOString() });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER INFO] Sabbir SQA Portfolio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
