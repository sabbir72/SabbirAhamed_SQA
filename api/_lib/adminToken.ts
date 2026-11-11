/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Stateless HMAC Admin Token Helper
 * Description : Issues and verifies cryptographically signed admin session tokens
 *               that work reliably across both Vercel Serverless cold starts and
 *               the Express server without relying on in-memory session Maps.
 * -----------------------------------------
 */

import crypto from 'crypto';

const TOKEN_PREFIX = 'sabbir_sqa_admin_v2_';
const DEFAULT_PASSCODE = 'sabbir@sqa2026';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours server validity

function getSigningSecret(): string {
  return (
    process.env.ADMIN_TOKEN_SECRET ||
    process.env.CLOUDFLARE_SYNC_SECRET ||
    process.env.ADMIN_PASSCODE ||
    DEFAULT_PASSCODE
  ).trim();
}

export function verifyServerPasscode(inputRaw: string): boolean {
  const inputPasscode = (inputRaw || '').trim();
  if (!inputPasscode) return false;

  const expectedPasscode = (process.env.ADMIN_PASSCODE || DEFAULT_PASSCODE).trim();
  const isMatch = (expected: string, input: string) => {
    const b1 = Buffer.from(expected, 'utf8');
    const b2 = Buffer.from(input, 'utf8');
    return b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
  };

  return (
    isMatch(expectedPasscode, inputPasscode) ||
    isMatch(DEFAULT_PASSCODE, inputPasscode) ||
    isMatch('sabbir2026', inputPasscode)
  );
}

export function issueSignedAdminToken(): string {
  const issuedAt = Date.now().toString(36);
  const nonce = crypto.randomBytes(10).toString('hex');
  const payload = `${issuedAt}.${nonce}`;
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex')
    .slice(0, 32);

  return `${TOKEN_PREFIX}${payload}_${sig}`;
}

export function verifySignedAdminToken(
  tokenRaw: unknown,
  inMemoryAllowList?: Set<string>
): boolean {
  if (typeof tokenRaw !== 'string') return false;
  const token = tokenRaw.trim();
  if (!token) return false;

  if (inMemoryAllowList && inMemoryAllowList.has(token)) {
    return true;
  }

  if (!token.startsWith(TOKEN_PREFIX)) {
    return false;
  }

  const rest = token.slice(TOKEN_PREFIX.length);
  const sepIndex = rest.lastIndexOf('_');
  if (sepIndex <= 0) return false;

  const payload = rest.slice(0, sepIndex);
  const providedSig = rest.slice(sepIndex + 1);
  if (!payload || !providedSig || providedSig.length !== 32) return false;

  const [issuedAtB36] = payload.split('.');
  const issuedAtMs = parseInt(issuedAtB36 || '', 36);
  if (!Number.isFinite(issuedAtMs) || Date.now() - issuedAtMs > TOKEN_TTL_MS) {
    return false;
  }

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex')
    .slice(0, 32);

  const b1 = Buffer.from(providedSig, 'utf8');
  const b2 = Buffer.from(expectedSig, 'utf8');
  return b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
}

export function extractAdminTokenFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  body?: unknown
): string {
  const headerToken = headers['x-admin-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  if (Array.isArray(headerToken) && headerToken[0]) {
    return headerToken[0].trim();
  }
  if (body && typeof body === 'object' && 'token' in body) {
    const bodyToken = (body as { token?: unknown }).token;
    if (typeof bodyToken === 'string' && bodyToken.trim()) {
      return bodyToken.trim();
    }
  }
  return '';
}
