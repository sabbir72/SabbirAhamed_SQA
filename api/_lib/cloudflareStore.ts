/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Cloudflare Free Cloud Storage & Media Adapter
 * Description : Unified server-side adapter supporting:
 *               1) Cloudflare Worker + KV/R2 (CLOUDFLARE_WORKER_URL + CLOUDFLARE_SYNC_SECRET)
 *               2) Direct Cloudflare KV REST API (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_KV_NAMESPACE_ID + CLOUDFLARE_API_TOKEN)
 *                  — Zero credit card, 1GB free storage, 100k reads/day, up to 25MiB per item/image!
 * -----------------------------------------
 */

import crypto from 'crypto';

export type CloudflareMode = 'worker' | 'kv-rest' | 'none';

export interface CloudflareStatusInfo {
  configured: boolean;
  mode: CloudflareMode;
  providerLabel: string;
  supportsMediaUpload: boolean;
  workerUrlConfigured: boolean;
  kvRestConfigured: boolean;
}

export interface CloudflarePortfolioSnapshot {
  version: number;
  lastModified: string;
  updatedBy: string;
  meta: Record<string, unknown>;
  projects: unknown[];
  experiences: unknown[];
  blogs: unknown[];
}

const SNAPSHOT_KEY = 'portfolio_snapshot_v1';
const MEDIA_KEY_PREFIX = 'media_';
const MEDIA_META_SUFFIX = '__meta';

function cleanEnv(val: string | undefined): string {
  const trimmed = (val || '').trim();
  if (!trimmed || trimmed.startsWith('YOUR_')) return '';
  return trimmed;
}

export function getCloudflareConfig(): {
  mode: CloudflareMode;
  workerUrl: string;
  syncSecret: string;
  accountId: string;
  kvNamespaceId: string;
  apiToken: string;
} {
  const workerUrl = cleanEnv(process.env.CLOUDFLARE_WORKER_URL).replace(/\/+$/, '');
  const syncSecret = cleanEnv(process.env.CLOUDFLARE_SYNC_SECRET);
  const accountId = cleanEnv(process.env.CLOUDFLARE_ACCOUNT_ID);
  const kvNamespaceId = cleanEnv(process.env.CLOUDFLARE_KV_NAMESPACE_ID);
  const apiToken = cleanEnv(process.env.CLOUDFLARE_API_TOKEN);

  if (workerUrl) {
    return {
      mode: 'worker',
      workerUrl,
      syncSecret,
      accountId,
      kvNamespaceId,
      apiToken,
    };
  }

  if (accountId && kvNamespaceId && apiToken) {
    return {
      mode: 'kv-rest',
      workerUrl: '',
      syncSecret,
      accountId,
      kvNamespaceId,
      apiToken,
    };
  }

  return {
    mode: 'none',
    workerUrl: '',
    syncSecret,
    accountId,
    kvNamespaceId,
    apiToken,
  };
}

export function getCloudflareStatus(): CloudflareStatusInfo {
  const cfg = getCloudflareConfig();
  return {
    configured: cfg.mode !== 'none',
    mode: cfg.mode,
    providerLabel:
      cfg.mode === 'worker'
        ? 'Cloudflare Worker + KV/R2'
        : cfg.mode === 'kv-rest'
        ? 'Cloudflare Free KV Store'
        : 'Not Configured',
    supportsMediaUpload: cfg.mode !== 'none',
    workerUrlConfigured: Boolean(cfg.workerUrl),
    kvRestConfigured: Boolean(cfg.accountId && cfg.kvNamespaceId && cfg.apiToken),
  };
}

function kvRestValueUrl(
  accountId: string,
  namespaceId: string,
  key: string
): string {
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    accountId
  )}/storage/kv/namespaces/${encodeURIComponent(
    namespaceId
  )}/values/${encodeURIComponent(key)}`;
}

export async function readCloudflareSnapshot(): Promise<{
  configured: boolean;
  mode: CloudflareMode;
  data: CloudflarePortfolioSnapshot | null;
  error?: string;
}> {
  const cfg = getCloudflareConfig();
  if (cfg.mode === 'none') {
    return { configured: false, mode: 'none', data: null };
  }

  try {
    if (cfg.mode === 'worker') {
      const response = await fetch(`${cfg.workerUrl}/portfolio`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (response.status === 404) {
        return { configured: true, mode: 'worker', data: null };
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          configured: true,
          mode: 'worker',
          data: null,
          error: `Cloudflare Worker read failed (${response.status}): ${text.slice(0, 180)}`,
        };
      }

      const payload = (await response.json()) as {
        data?: CloudflarePortfolioSnapshot | null;
      } & Partial<CloudflarePortfolioSnapshot>;
      const snapshot =
        payload && 'data' in payload
          ? payload.data ?? null
          : payload && typeof payload === 'object' && ('meta' in payload || 'projects' in payload)
          ? (payload as CloudflarePortfolioSnapshot)
          : null;

      return { configured: true, mode: 'worker', data: snapshot };
    }

    // Mode: kv-rest
    const response = await fetch(
      kvRestValueUrl(cfg.accountId, cfg.kvNamespaceId, SNAPSHOT_KEY),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cfg.apiToken}`,
        },
      }
    );

    if (response.status === 404) {
      return { configured: true, mode: 'kv-rest', data: null };
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        configured: true,
        mode: 'kv-rest',
        data: null,
        error: `Cloudflare KV read error (${response.status}): ${text.slice(0, 180)}`,
      };
    }

    const rawText = await response.text();
    if (!rawText || !rawText.trim()) {
      return { configured: true, mode: 'kv-rest', data: null };
    }

    const parsed = JSON.parse(rawText) as CloudflarePortfolioSnapshot;
    return { configured: true, mode: 'kv-rest', data: parsed };
  } catch (err) {
    return {
      configured: true,
      mode: cfg.mode,
      data: null,
      error: err instanceof Error ? err.message : 'Failed to connect to Cloudflare storage.',
    };
  }
}

export async function writeCloudflareSnapshot(
  snapshot: CloudflarePortfolioSnapshot
): Promise<{
  success: boolean;
  configured: boolean;
  mode: CloudflareMode;
  lastModified?: string;
  error?: string;
}> {
  const cfg = getCloudflareConfig();
  if (cfg.mode === 'none') {
    return {
      success: false,
      configured: false,
      mode: 'none',
      error: 'Cloudflare server environment variables are not configured yet.',
    };
  }

  const normalized: CloudflarePortfolioSnapshot = {
    version: 1,
    lastModified: snapshot.lastModified || new Date().toISOString(),
    updatedBy: snapshot.updatedBy || 'admin',
    meta: snapshot.meta && typeof snapshot.meta === 'object' ? snapshot.meta : {},
    projects: Array.isArray(snapshot.projects) ? snapshot.projects : [],
    experiences: Array.isArray(snapshot.experiences) ? snapshot.experiences : [],
    blogs: Array.isArray(snapshot.blogs) ? snapshot.blogs : [],
  };

  try {
    if (cfg.mode === 'worker') {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (cfg.syncSecret) {
        headers['x-sync-secret'] = cfg.syncSecret;
        headers['Authorization'] = `Bearer ${cfg.syncSecret}`;
      }

      const response = await fetch(`${cfg.workerUrl}/portfolio`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(normalized),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          success: false,
          configured: true,
          mode: 'worker',
          error: `Cloudflare Worker save error (${response.status}): ${text.slice(0, 200)}`,
        };
      }

      return {
        success: true,
        configured: true,
        mode: 'worker',
        lastModified: normalized.lastModified,
      };
    }

    // Mode: kv-rest
    const response = await fetch(
      kvRestValueUrl(cfg.accountId, cfg.kvNamespaceId, SNAPSHOT_KEY),
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${cfg.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(normalized),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        configured: true,
        mode: 'kv-rest',
        error: `Cloudflare KV write error (${response.status}): ${text.slice(0, 200)}`,
      };
    }

    return {
      success: true,
      configured: true,
      mode: 'kv-rest',
      lastModified: normalized.lastModified,
    };
  } catch (err) {
    return {
      success: false,
      configured: true,
      mode: cfg.mode,
      error: err instanceof Error ? err.message : 'Cloudflare save request failed.',
    };
  }
}

export async function uploadCloudflareMedia(
  dataUrl: string,
  fileName?: string
): Promise<{
  success: boolean;
  configured: boolean;
  mode: CloudflareMode;
  url?: string;
  key?: string;
  error?: string;
}> {
  const cfg = getCloudflareConfig();
  if (cfg.mode === 'none') {
    return {
      success: false,
      configured: false,
      mode: 'none',
    };
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) {
    return {
      success: false,
      configured: true,
      mode: cfg.mode,
      error: 'Invalid image Data URL format.',
    };
  }

  const contentType = match[1].toLowerCase();
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  const ext = extMap[contentType];
  if (!ext) {
    return {
      success: false,
      configured: true,
      mode: cfg.mode,
      error: 'Unsupported image MIME type.',
    };
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 10 * 1024 * 1024) {
    return {
      success: false,
      configured: true,
      mode: cfg.mode,
      error: 'Image exceeds 10MB upload limit.',
    };
  }

  const baseSlug = (typeof fileName === 'string' ? fileName : 'portfolio')
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'img';

  const mediaKey = `${MEDIA_KEY_PREFIX}${baseSlug}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString('hex')}.${ext}`;

  try {
    if (cfg.mode === 'worker') {
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'x-media-key': mediaKey,
        'x-media-content-type': contentType,
      };
      if (cfg.syncSecret) {
        headers['x-sync-secret'] = cfg.syncSecret;
        headers['Authorization'] = `Bearer ${cfg.syncSecret}`;
      }

      const response = await fetch(`${cfg.workerUrl}/upload`, {
        method: 'POST',
        headers,
        body: buffer,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return {
          success: false,
          configured: true,
          mode: 'worker',
          error: `Cloudflare Worker media upload failed (${response.status}): ${text.slice(0, 180)}`,
        };
      }

      const json = (await response.json().catch(() => ({}))) as {
        url?: string;
        key?: string;
      };
      const resolvedUrl = json.url || `${cfg.workerUrl}/media/${encodeURIComponent(json.key || mediaKey)}`;
      return {
        success: true,
        configured: true,
        mode: 'worker',
        key: json.key || mediaKey,
        url: resolvedUrl,
      };
    }

    // Mode: kv-rest (Store binary image + content-type metadata key inside Cloudflare KV)
    const [binRes, metaRes] = await Promise.all([
      fetch(kvRestValueUrl(cfg.accountId, cfg.kvNamespaceId, mediaKey), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${cfg.apiToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      }),
      fetch(
        kvRestValueUrl(cfg.accountId, cfg.kvNamespaceId, `${mediaKey}${MEDIA_META_SUFFIX}`),
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${cfg.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contentType, uploadedAt: new Date().toISOString() }),
        }
      ),
    ]);

    if (!binRes.ok || !metaRes.ok) {
      const errTxt = await binRes.text().catch(() => '');
      return {
        success: false,
        configured: true,
        mode: 'kv-rest',
        error: `Cloudflare KV image upload failed (${binRes.status}): ${errTxt.slice(0, 180)}`,
      };
    }

    return {
      success: true,
      configured: true,
      mode: 'kv-rest',
      key: mediaKey,
      url: `/api/cloud/media?key=${encodeURIComponent(mediaKey)}`,
    };
  } catch (err) {
    return {
      success: false,
      configured: true,
      mode: cfg.mode,
      error: err instanceof Error ? err.message : 'Cloudflare media upload failed.',
    };
  }
}

export async function readCloudflareMedia(
  rawKey: string
): Promise<{
  found: boolean;
  buffer?: Buffer;
  contentType?: string;
}> {
  const cfg = getCloudflareConfig();
  const cleanKey = (rawKey || '').trim().replace(/[^a-zA-Z0-9._-]/g, '');
  if (!cleanKey || !cleanKey.startsWith(MEDIA_KEY_PREFIX) || cfg.mode === 'none') {
    return { found: false };
  }

  try {
    if (cfg.mode === 'worker') {
      const res = await fetch(`${cfg.workerUrl}/media/${encodeURIComponent(cleanKey)}`);
      if (!res.ok) return { found: false };
      const arr = await res.arrayBuffer();
      return {
        found: true,
        buffer: Buffer.from(arr),
        contentType: res.headers.get('content-type') || 'image/webp',
      };
    }

    const [binRes, metaRes] = await Promise.all([
      fetch(kvRestValueUrl(cfg.accountId, cfg.kvNamespaceId, cleanKey), {
        headers: { Authorization: `Bearer ${cfg.apiToken}` },
      }),
      fetch(
        kvRestValueUrl(cfg.accountId, cfg.kvNamespaceId, `${cleanKey}${MEDIA_META_SUFFIX}`),
        { headers: { Authorization: `Bearer ${cfg.apiToken}` } }
      ),
    ]);

    if (!binRes.ok) return { found: false };
    const arr = await binRes.arrayBuffer();
    let contentType = 'image/webp';
    if (metaRes.ok) {
      const metaJson = (await metaRes.json().catch(() => null)) as {
        contentType?: string;
      } | null;
      if (metaJson?.contentType) {
        contentType = metaJson.contentType;
      }
    } else if (cleanKey.endsWith('.png')) {
      contentType = 'image/png';
    } else if (cleanKey.endsWith('.jpg') || cleanKey.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (cleanKey.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    }

    return {
      found: true,
      buffer: Buffer.from(arr),
      contentType,
    };
  } catch {
    return { found: false };
  }
}
