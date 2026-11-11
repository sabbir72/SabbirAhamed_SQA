/**
 * ============================================================================
 * Sabbir Ahamed SQA Portfolio — Cloudflare Free Edge Store Worker (Single File)
 * ============================================================================
 * Free Tier Limits (No Credit Card Required for Workers + KV):
 *   - 100,000 Requests / Day FREE
 *   - Workers KV: 100,000 Reads / Day, 1,000 Writes / Day, 1 GB Free Storage
 *   - Up to 25 MiB per uploaded photo or JSON document
 *   - Optional R2 Bucket (`PORTFOLIO_MEDIA`): 10 GB Free Storage + Zero Egress Fee
 *
 * Bindings in Cloudflare Dashboard -> Worker -> Settings -> Bindings:
 *   1. KV Namespace binding named: PORTFOLIO_KV
 *   2. Secret/Variable named:      SYNC_SECRET  (same as CLOUDFLARE_SYNC_SECRET)
 *   3. (Optional) R2 Bucket named: PORTFOLIO_MEDIA
 * ============================================================================
 */

const SNAPSHOT_KEY = 'portfolio_snapshot_v1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-sync-secret, x-media-key, x-media-content-type',
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function isAuthorizedWrite(request, env) {
  const expected = (env.SYNC_SECRET || '').trim();
  if (!expected) return true;
  const headerSecret = request.headers.get('x-sync-secret') || '';
  const authHeader = request.headers.get('Authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  return headerSecret === expected || bearer === expected;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/' || path === '/health') {
      return jsonResponse({
        ok: true,
        service: 'sabbir-portfolio-cloudflare-store',
        hasKV: Boolean(env.PORTFOLIO_KV),
        hasR2: Boolean(env.PORTFOLIO_MEDIA),
      });
    }

    if (path === '/portfolio') {
      if (!env.PORTFOLIO_KV) {
        return jsonResponse({ success: false, error: 'PORTFOLIO_KV binding missing on Worker.' }, 500);
      }

      if (request.method === 'GET') {
        const data = await env.PORTFOLIO_KV.get(SNAPSHOT_KEY, 'json');
        return jsonResponse({ success: true, data: data || null });
      }

      if (request.method === 'PUT' || request.method === 'POST') {
        if (!isAuthorizedWrite(request, env)) {
          return jsonResponse({ success: false, error: 'Unauthorized write request.' }, 401);
        }
        const payload = await request.json();
        await env.PORTFOLIO_KV.put(SNAPSHOT_KEY, JSON.stringify(payload));
        return jsonResponse({
          success: true,
          savedAt: new Date().toISOString(),
          lastModified: payload?.lastModified || new Date().toISOString(),
        });
      }
    }

    if (path === '/upload' && request.method === 'POST') {
      if (!isAuthorizedWrite(request, env)) {
        return jsonResponse({ success: false, error: 'Unauthorized upload request.' }, 401);
      }

      const contentType =
        request.headers.get('x-media-content-type') ||
        request.headers.get('Content-Type') ||
        'image/webp';
      const rawKey = request.headers.get('x-media-key') || `media_img-${Date.now()}.webp`;
      const cleanKey = rawKey.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 120);
      const buffer = await request.arrayBuffer();

      if (env.PORTFOLIO_MEDIA) {
        await env.PORTFOLIO_MEDIA.put(cleanKey, buffer, {
          httpMetadata: { contentType },
        });
      } else if (env.PORTFOLIO_KV) {
        await env.PORTFOLIO_KV.put(cleanKey, buffer, {
          metadata: { contentType },
        });
      } else {
        return jsonResponse({ success: false, error: 'No KV or R2 binding configured.' }, 500);
      }

      const publicBase = (env.PUBLIC_MEDIA_BASE_URL || url.origin).replace(/\/+$/, '');
      return jsonResponse({
        success: true,
        key: cleanKey,
        url: `${publicBase}/media/${encodeURIComponent(cleanKey)}`,
      });
    }

    if (path.startsWith('/media/') && request.method === 'GET') {
      const cleanKey = decodeURIComponent(path.slice('/media/'.length)).replace(/[^a-zA-Z0-9._-]/g, '');
      if (!cleanKey) {
        return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
      }

      if (env.PORTFOLIO_MEDIA) {
        const obj = await env.PORTFOLIO_MEDIA.get(cleanKey);
        if (obj) {
          return new Response(obj.body, {
            status: 200,
            headers: {
              'Content-Type': obj.httpMetadata?.contentType || 'image/webp',
              'Cache-Control': 'public, max-age=31536000, immutable',
              ...CORS_HEADERS,
            },
          });
        }
      }

      if (env.PORTFOLIO_KV) {
        const result = await env.PORTFOLIO_KV.getWithMetadata(cleanKey, 'arrayBuffer');
        if (result && result.value) {
          return new Response(result.value, {
            status: 200,
            headers: {
              'Content-Type': result.metadata?.contentType || 'image/webp',
              'Cache-Control': 'public, max-age=31536000, immutable',
              ...CORS_HEADERS,
            },
          });
        }
      }

      return new Response('Media Not Found', { status: 404, headers: CORS_HEADERS });
    }

    return jsonResponse({ error: 'Route not found' }, 404);
  },
};
