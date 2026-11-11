import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCloudflareStatus } from '../_lib/cloudflareStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const status = getCloudflareStatus();
  return res.status(200).json({
    success: true,
    ...status,
  });
}
