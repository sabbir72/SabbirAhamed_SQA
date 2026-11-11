import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  extractAdminTokenFromHeaders,
  issueSignedAdminToken,
  verifyServerPasscode,
  verifySignedAdminToken,
} from '../_lib/adminToken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const token = extractAdminTokenFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
      req.body
    );
    if (!verifySignedAdminToken(token)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Valid Admin session required.',
      });
    }

    const { currentPasscode, newPasscode } = req.body || {};
    if (
      !currentPasscode ||
      typeof currentPasscode !== 'string' ||
      !newPasscode ||
      typeof newPasscode !== 'string' ||
      newPasscode.trim().length < 4
    ) {
      return res.status(400).json({
        success: false,
        error: 'Valid current password and new password (min 4 chars) are required.',
      });
    }

    const matchesServerDefault = verifyServerPasscode(currentPasscode);

    if (!matchesServerDefault && !req.body?.verifiedLocalHash) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect.',
      });
    }

    const nextToken = issueSignedAdminToken();
    return res.status(200).json({
      success: true,
      message: 'Main security password updated successfully.',
      token: nextToken,
      ownerId: 'sabbir_ahamed_owner',
    });
  } catch (err) {
    console.error('[VERCEL ADMIN UPDATE PASSCODE ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
}
