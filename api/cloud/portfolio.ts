import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  extractAdminTokenFromHeaders,
  verifySignedAdminToken,
} from '../_lib/adminToken';
import {
  getCloudflareStatus,
  readCloudflareSnapshot,
  writeCloudflareSnapshot,
} from '../_lib/cloudflareStore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    const result = await readCloudflareSnapshot();
    const status = getCloudflareStatus();
    return res.status(200).json({
      success: !result.error,
      configured: result.configured,
      mode: result.mode,
      providerLabel: status.providerLabel,
      data: result.data,
      error: result.error || null,
    });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const token = extractAdminTokenFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
      req.body
    );

    if (!verifySignedAdminToken(token)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Valid Admin session required to update Cloudflare Store.',
      });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const snapshotInput =
      body.snapshot && typeof body.snapshot === 'object'
        ? (body.snapshot as Record<string, unknown>)
        : body;

    const writeRes = await writeCloudflareSnapshot({
      version: 1,
      lastModified:
        typeof snapshotInput.lastModified === 'string' && snapshotInput.lastModified
          ? snapshotInput.lastModified
          : new Date().toISOString(),
      updatedBy: 'sabbir-admin',
      meta:
        snapshotInput.meta && typeof snapshotInput.meta === 'object'
          ? (snapshotInput.meta as Record<string, unknown>)
          : {},
      projects: Array.isArray(snapshotInput.projects) ? snapshotInput.projects : [],
      experiences: Array.isArray(snapshotInput.experiences) ? snapshotInput.experiences : [],
      blogs: Array.isArray(snapshotInput.blogs) ? snapshotInput.blogs : [],
    });

    if (!writeRes.configured) {
      return res.status(200).json({
        success: false,
        configured: false,
        mode: 'none',
        error: writeRes.error,
      });
    }

    if (!writeRes.success) {
      return res.status(502).json({
        success: false,
        configured: true,
        mode: writeRes.mode,
        error: writeRes.error || 'Failed to save portfolio data to Cloudflare.',
      });
    }

    return res.status(200).json({
      success: true,
      configured: true,
      mode: writeRes.mode,
      lastModified: writeRes.lastModified,
      savedAt: new Date().toISOString(),
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed.' });
}
