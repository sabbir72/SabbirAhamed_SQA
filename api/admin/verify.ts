import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  issueSignedAdminToken,
  verifyServerPasscode,
} from '../_lib/adminToken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: 'vercel-admin-auth' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { passcode } = req.body || {};

    if (!passcode || typeof passcode !== 'string') {
      return res.status(400).json({ success: false, error: 'Passcode is required.' });
    }

    if (verifyServerPasscode(passcode)) {
      const token = issueSignedAdminToken();
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
    console.error('[VERCEL ADMIN AUTH ERROR]', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}
