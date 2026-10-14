import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

const TMP_PORTFOLIO_FILE = path.join('/tmp', 'portfolio_custom_data.json');
const ROOT_PORTFOLIO_FILE = path.join(process.cwd(), 'portfolio_custom_data.json');

function getFilePath(): string {
  try {
    if (fs.existsSync(ROOT_PORTFOLIO_FILE)) return ROOT_PORTFOLIO_FILE;
  } catch (e) {
    // fallback to tmp
  }
  return TMP_PORTFOLIO_FILE;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const targetFile = getFilePath();
      if (fs.existsSync(targetFile)) {
        const raw = fs.readFileSync(targetFile, 'utf-8');
        const data = JSON.parse(raw);
        return res.status(200).json({ success: true, data });
      }
      return res.status(200).json({ success: true, data: null });
    } catch (err) {
      return res.status(200).json({ success: true, data: null });
    }
  }

  if (req.method === 'POST') {
    try {
      const token = (req.headers['x-admin-token'] as string) || req.body?.token;
      const isAuthorized = Boolean(token && typeof token === 'string' && token.startsWith('sabbir_sqa_admin_'));

      if (!isAuthorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: Admin token required.' });
      }

      const { data } = req.body || {};
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid portfolio data payload.' });
      }

      try {
        fs.writeFileSync(TMP_PORTFOLIO_FILE, JSON.stringify(data, null, 2), 'utf-8');
      } catch (err) {
        // In case tmp is restricted
      }

      return res.status(200).json({ success: true, message: 'Portfolio data updated successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to process portfolio data.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
