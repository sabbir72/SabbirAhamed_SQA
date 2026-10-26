import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

const SEED_PORTFOLIO_FILE = path.join(process.cwd(), 'portfolio_custom_data.json');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      if (fs.existsSync(SEED_PORTFOLIO_FILE)) {
        const raw = fs.readFileSync(SEED_PORTFOLIO_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return res.status(200).json({
          success: true,
          data: parsed && typeof parsed === 'object' ? parsed : null,
        });
      }
      return res.status(200).json({ success: true, data: null });
    } catch {
      return res.status(200).json({ success: true, data: null });
    }
  }

  if (req.method === 'POST') {
    const token = (req.headers['x-admin-token'] as string) || req.body?.token;
    const isAuthorized = Boolean(
      token && typeof token === 'string' && token.startsWith('sabbir_sqa_admin_')
    );

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin token required.',
      });
    }

    return res.status(200).json({
      success: true,
      cloudOnly: true,
      message: 'Portfolio updates are persisted exclusively to Google Cloud Firestore.',
    });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}

