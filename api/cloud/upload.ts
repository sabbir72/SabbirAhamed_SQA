import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  extractAdminTokenFromHeaders,
  verifySignedAdminToken,
} from '../_lib/adminToken';
import { uploadCloudflareMedia } from '../_lib/cloudflareStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const token = extractAdminTokenFromHeaders(
    req.headers as Record<string, string | string[] | undefined>,
    req.body
  );

  if (!verifySignedAdminToken(token)) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized: Valid Admin session required to upload media.',
    });
  }

  const { dataUrl, fileName } = (req.body || {}) as {
    dataUrl?: string;
    fileName?: string;
  };

  if (!dataUrl || typeof dataUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'Image dataUrl is required.' });
  }

  const result = await uploadCloudflareMedia(dataUrl, fileName);
  if (!result.configured) {
    return res.status(200).json({
      success: true,
      configured: false,
      storedInCloudflare: false,
      url: null,
    });
  }

  if (!result.success) {
    return res.status(502).json({
      success: false,
      configured: true,
      storedInCloudflare: false,
      error: result.error || 'Cloudflare image upload failed.',
    });
  }

  return res.status(200).json({
    success: true,
    configured: true,
    storedInCloudflare: true,
    mode: result.mode,
    key: result.key,
    url: result.url,
  });
}
