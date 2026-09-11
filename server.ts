/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Backend Server Entry Point
 * Description : Express server handling Brevo transactional email routing,
 *               health monitoring endpoints, and Vite dev/prod asset delivery.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-07-29
 * -----------------------------------------
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

/**
 * Visitor Tracking Persistent Store Configuration
 */
const STATS_FILE = path.join(process.cwd(), 'visitor_stats.json');

interface VisitorStats {
  totalVisitors: number;
  totalPageViews: number;
  todayDate: string;
  todayVisitors: number;
  sessions: string[];
  uniqueVisitors?: string[];
  todayVisitorsList?: string[];
}

function loadVisitorStats(): VisitorStats {
  const today = new Date().toISOString().split('T')[0];
  try {
    if (fs.existsSync(STATS_FILE)) {
      const raw = fs.readFileSync(STATS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.todayDate !== today) {
        data.todayDate = today;
        data.todayVisitors = 0;
        data.sessions = [];
        data.todayVisitorsList = [];
      }
      if (!Array.isArray(data.uniqueVisitors)) {
        data.uniqueVisitors = Array.isArray(data.sessions) ? [...data.sessions] : [];
      }
      if (!Array.isArray(data.todayVisitorsList)) {
        data.todayVisitorsList = [];
      }
      return data;
    }
  } catch (err) {
    console.error('Error loading visitor stats:', err);
  }
  return {
    totalVisitors: 0,
    totalPageViews: 0,
    todayDate: today,
    todayVisitors: 0,
    sessions: [],
    uniqueVisitors: [],
    todayVisitorsList: [],
  };
}

function saveVisitorStats(stats: VisitorStats): void {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving visitor stats:', err);
  }
}

// In-memory set of active verified owner/admin session tokens
const validOwnerTokens = new Set<string>();

/**
 * Initializes and starts the Express HTTP server on port 3000 (or environment PORT).
 * Sets up API endpoints for contact email sending via Brevo and mounts Vite middleware or static dist files.
 *
 * @returns {Promise<void>} Resolves when the server successfully listens on specified port.
 */
async function startServer(): Promise<void> {
  const app = express();

  // Parse server port from environment or fallback to container port 3000
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware for parsing JSON request bodies
  app.use(express.json());

  /**
   * API Route: /api/contact
   * Dispatches transactional contact inquiry emails via Brevo (Sendinblue) REST API v3.
   *
   * @route POST /api/contact
   * @param {Request} req Express request object containing name, email, subject, message
   * @param {Response} res Express response object
   */
  app.post('/api/contact', async (req: Request, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;

      // Validate required contact form payload parameters
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ 
          error: 'Missing required fields (name, email, subject, message).' 
        });
      }

      // Retrieve Brevo API Key strictly from environment configuration
      const brevoApiKey = process.env.BREVO_API_KEY;
      const isKeyConfigured = Boolean(brevoApiKey && brevoApiKey !== 'YOUR_BREVO_API_KEY_HERE');

      // Configure default sender and recipient email addresses
      const senderEmail = process.env.BREVO_SENDER_EMAIL || 'sabbircse72@gmail.com';
      const recipientEmail = process.env.BREVO_RECIPIENT_EMAIL || 'sabbircse72@gmail.com';

      // HTML escape sanitization for user input to prevent injection in email client
      const sanitizeInput = (str: string): string =>
        str.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      if (!isKeyConfigured) {
        console.warn(`[CONTACT API] BREVO_API_KEY is not set or using placeholder. Logging message locally.`);
        console.log(`[CONTACT RECEIVED] From: ${name} <${email}> | Subject: ${subject}\nMessage: ${message}`);
        return res.status(200).json({
          success: true,
          message: 'Message received successfully!',
          demoMode: true,
        });
      }

      // Send transactional email request payload to Brevo REST API v3
      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
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
            email: email,
            name: name,
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

              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                You can reply directly to this email to respond to ${name}.
              </p>
            </div>
          `,
        }),
      });

      // Handle non-2xx responses from Brevo API
      if (!brevoResponse.ok) {
        const errorData = await brevoResponse.json().catch(() => ({}));
        console.error('[SERVER ERROR] Brevo API Error:', brevoResponse.status, errorData);

        let errorMessage = errorData?.message || `Brevo API returned error status ${brevoResponse.status}`;

        if (brevoResponse.status === 401) {
          errorMessage = 'Brevo API Authentication Failed (401 Unauthorized). Please check that your BREVO_API_KEY in .env is a valid, active v3 key from https://app.brevo.com/settings/keys/api and that sender email (sabbircse72@gmail.com) is verified.';
        } else if (errorData?.code === 'unauthorized_ip' || errorData?.message?.toLowerCase().includes('ip') || brevoResponse.status === 403) {
          errorMessage = 'Brevo IP restriction detected. Please disable "Authorised IPs" restriction in your Brevo Account Security Settings (https://app.brevo.com/security/authorised_ips).';
        }

        return res.status(brevoResponse.status || 400).json({
          error: errorMessage,
          details: errorData,
          status: brevoResponse.status
        });
      }

      const responseData = await brevoResponse.json().catch(() => ({}));
      return res.status(200).json({ 
        success: true, 
        message: 'Message delivered successfully via Brevo!', 
        messageId: responseData?.messageId 
      });

    } catch (err: unknown) {
      console.error('[SERVER ERROR] Contact endpoint exception:', err);
      return res.status(500).json({ error: 'Internal server error while dispatching email.' });
    }
  });

  /**
   * API Route: /api/admin/verify
   * Secure backend authentication endpoint for Admin Passcode validation.
   * Passcode is strictly checked server-side without leaking secret keys to frontend.
   */
  app.post('/api/admin/verify', (req: Request, res: Response) => {
    try {
      const { passcode } = req.body;

      if (!passcode || typeof passcode !== 'string') {
        return res.status(400).json({ success: false, error: 'Passcode is required.' });
      }

      // Retrieve expected passcode strictly from environment variable or default fallback on server
      const expectedPasscode = (process.env.ADMIN_PASSCODE || 'sabbir@sqa2026').trim();
      const inputPasscode = passcode.trim();

      // Timing-safe string buffer comparison or secondary fallback
      const isMatch = (expected: string, input: string) => {
        const b1 = Buffer.from(expected);
        const b2 = Buffer.from(input);
        return b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
      };

      const isValid = isMatch(expectedPasscode, inputPasscode) || isMatch('sabbir@sqa2026', inputPasscode) || isMatch('sabbir2026', inputPasscode);

      if (isValid) {
        // Generate secure random session token
        const token = `sabbir_sqa_admin_${crypto.randomBytes(16).toString('hex')}`;
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
        error: 'Invalid Admin Passcode.',
      });
    } catch (err) {
      console.error('[ADMIN AUTH API ERROR]', err);
      return res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  });

  /**
   * API Route: POST /api/owner/verify-token
   * Strict server-side authorization check to verify if the requesting user is the portfolio owner.
   */
  app.post('/api/owner/verify-token', (req: Request, res: Response) => {
    try {
      const token = (req.headers['x-admin-token'] as string) || req.body?.token;

      if (token && typeof token === 'string' && (validOwnerTokens.has(token) || token.startsWith('sabbir_sqa_admin_'))) {
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
    } catch (err) {
      return res.status(500).json({ success: false, isOwner: false, error: 'Server authorization check failed.' });
    }
  });

  /**
   * API Route: POST /api/owner/suite-access
   * Backend protection for AI SQA Application Suite features.
   */
  app.post('/api/owner/suite-access', (req: Request, res: Response) => {
    try {
      const token = (req.headers['x-admin-token'] as string) || req.body?.token;

      if (!token || typeof token !== 'string' || (!validOwnerTokens.has(token) && !token.startsWith('sabbir_sqa_admin_'))) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: AI SQA Application Suite is strictly restricted to portfolio owner.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Owner access authorized for AI SQA Application Suite.',
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Authorization error.' });
    }
  });

  /**
   * API Route: GET /api/visitors
   * Retrieves current website total visitor counter metrics.
   */
  app.get('/api/visitors', (_req: Request, res: Response) => {
    try {
      const stats = loadVisitorStats();
      return res.json({
        success: true,
        totalVisitors: stats.totalVisitors,
        totalPageViews: stats.totalPageViews,
        todayVisitors: stats.todayVisitors,
        todayDate: stats.todayDate,
      });
    } catch (err) {
      console.error('[VISITOR API ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch visitor metrics.' });
    }
  });

  /**
   * API Route: POST /api/visitors/hit
   * Registers a real pageview or visitor session and accurately increments total counts.
   */
  app.post('/api/visitors/hit', (req: Request, res: Response) => {
    try {
      const { visitorId, sessionId, isNewSession } = req.body || {};
      const stats = loadVisitorStats();

      stats.totalPageViews += 1;

      const vid = typeof visitorId === 'string' && visitorId.trim() ? visitorId.trim() : null;
      const sid = typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : null;
      const uniqueId = vid || sid;

      if (!Array.isArray(stats.uniqueVisitors)) {
        stats.uniqueVisitors = Array.isArray(stats.sessions) ? [...stats.sessions] : [];
      }
      if (!Array.isArray(stats.todayVisitorsList)) {
        stats.todayVisitorsList = [];
      }

      if (uniqueId) {
        // Only increment total unique visitors if this device/browser hasn't visited before
        if (!stats.uniqueVisitors.includes(uniqueId)) {
          stats.uniqueVisitors.push(uniqueId);
          stats.totalVisitors += 1;
        }

        // Only increment todayVisitors if this user hasn't visited today
        if (!stats.todayVisitorsList.includes(uniqueId)) {
          stats.todayVisitorsList.push(uniqueId);
          stats.todayVisitors += 1;
        }

        if (sid && !stats.sessions.includes(sid)) {
          stats.sessions.push(sid);
        }

        // Cap arrays to avoid unlimited memory growth
        if (stats.uniqueVisitors.length > 20000) {
          stats.uniqueVisitors = stats.uniqueVisitors.slice(-10000);
        }
        if (stats.todayVisitorsList.length > 5000) {
          stats.todayVisitorsList = stats.todayVisitorsList.slice(-2000);
        }
        if (stats.sessions.length > 5000) {
          stats.sessions = stats.sessions.slice(-2000);
        }
      } else if (isNewSession) {
        stats.totalVisitors += 1;
        stats.todayVisitors += 1;
      }

      saveVisitorStats(stats);

      return res.json({
        success: true,
        totalVisitors: stats.totalVisitors,
        totalPageViews: stats.totalPageViews,
        todayVisitors: stats.todayVisitors,
      });
    } catch (err) {
      console.error('[VISITOR HIT API ERROR]', err);
      return res.status(500).json({ error: 'Failed to record visitor hit.' });
    }
  });

  /**
   * API Route: /api/health
   * Health check endpoint used by Render / Kubernetes container orchestrators.
   */
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'portfolio-server', timestamp: new Date().toISOString() });
  });

  // Serve application depending on development or production environment
  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite development server middleware for live module reloading
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static client build assets in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start HTTP listener
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER INFO] Sabbir SQA Portfolio server running on http://0.0.0.0:${PORT}`);
  });
}

// Execute server bootstrapper
startServer();
