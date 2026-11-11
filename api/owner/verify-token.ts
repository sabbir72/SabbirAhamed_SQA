import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  extractAdminTokenFromHeaders,
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

    if (verifySignedAdminToken(token)) {
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
}
