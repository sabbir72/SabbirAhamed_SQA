import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readCloudflareMedia } from '../_lib/cloudflareStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const keyParam = req.query?.key;
  const rawKey = Array.isArray(keyParam) ? keyParam[0] : keyParam;
  if (!rawKey || typeof rawKey !== 'string') {
    return res.status(400).json({ error: 'Missing media key.' });
  }

  const media = await readCloudflareMedia(rawKey);
  if (!media.found || !media.buffer) {
    return res.status(404).json({ error: 'Media not found.' });
  }

  res.setHeader('Content-Type', media.contentType || 'image/webp');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.status(200).send(media.buffer);
}
