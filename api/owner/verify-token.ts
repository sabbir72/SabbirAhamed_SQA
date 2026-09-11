import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const token = (req.headers['x-admin-token'] as string) || req.body?.token;

    if (token && typeof token === 'string' && token.startsWith('sabbir_sqa_admin_')) {
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
