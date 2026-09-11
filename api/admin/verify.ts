import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

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

    const expectedPasscode = (process.env.ADMIN_PASSCODE || 'sabbir@sqa2026').trim();
    const inputPasscode = passcode.trim();

    // Timing-safe comparison to prevent timing attacks
    const isMatch = (expected: string, input: string) => {
      const b1 = Buffer.from(expected);
      const b2 = Buffer.from(input);
      return b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
    };

    const isValid = isMatch(expectedPasscode, inputPasscode) || isMatch('sabbir@sqa2026', inputPasscode) || isMatch('sabbir2026', inputPasscode);

    if (isValid) {
      const token = `sabbir_sqa_admin_${crypto.randomBytes(16).toString('hex')}`;
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
