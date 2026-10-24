/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Unified Main Security & Authentication Manager
 * Description : Single centralized authentication & password update service
 *               with 2-minute inactivity auto-lock for the entire portfolio CMS.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-24
 * -----------------------------------------
 */

const ADMIN_TOKEN_KEY = 'sabbir_sqa_admin_token';
const ADMIN_LAST_ACTIVE_KEY = 'sabbir_sqa_admin_last_active';
const ADMIN_LOCAL_PASS_HASH_KEY = 'sabbir_sqa_admin_custom_hash';

export const ADMIN_SESSION_TIMEOUT_MS = 2 * 60 * 1000;
export const ADMIN_SESSION_TIMEOUT_SECONDS = 120;
export const ADMIN_AUTH_CHANGED_EVENT = 'admin_auth_changed';
export const ADMIN_SESSION_EXPIRED_EVENT = 'admin_session_expired';

async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return input;
}

/**
 * Record active interaction to keep session alive during the 2-minute window
 */
export function recordAdminActivity(): void {
  try {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token && token.startsWith('sabbir_sqa_admin_')) {
      const now = Date.now();
      const lastActiveRaw =
        sessionStorage.getItem(ADMIN_LAST_ACTIVE_KEY) || localStorage.getItem(ADMIN_LAST_ACTIVE_KEY);
      const lastActive = lastActiveRaw ? parseInt(lastActiveRaw, 10) : now;

      if (now - lastActive > ADMIN_SESSION_TIMEOUT_MS) {
        logoutAdmin(true);
        return;
      }

      sessionStorage.setItem(ADMIN_LAST_ACTIVE_KEY, String(now));
      localStorage.setItem(ADMIN_LAST_ACTIVE_KEY, String(now));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get remaining session duration in seconds (0 to 120)
 */
export function getAdminSessionRemainingSeconds(): number {
  try {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token || !token.startsWith('sabbir_sqa_admin_')) {
      return 0;
    }

    const lastActiveRaw =
      sessionStorage.getItem(ADMIN_LAST_ACTIVE_KEY) || localStorage.getItem(ADMIN_LAST_ACTIVE_KEY);
    if (!lastActiveRaw) {
      return ADMIN_SESSION_TIMEOUT_SECONDS;
    }

    const lastActive = parseInt(lastActiveRaw, 10);
    const elapsedMs = Date.now() - lastActive;
    const remainingMs = ADMIN_SESSION_TIMEOUT_MS - elapsedMs;

    if (remainingMs <= 0) {
      return 0;
    }

    return Math.ceil(remainingMs / 1000);
  } catch {
    return 0;
  }
}

/**
 * Check if the user is currently authenticated as Admin (and within the 2-minute timeout window)
 */
export function isAdminAuthenticated(): boolean {
  try {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token || !token.startsWith('sabbir_sqa_admin_')) {
      return false;
    }

    const lastActiveRaw =
      sessionStorage.getItem(ADMIN_LAST_ACTIVE_KEY) || localStorage.getItem(ADMIN_LAST_ACTIVE_KEY);
    if (lastActiveRaw) {
      const lastActive = parseInt(lastActiveRaw, 10);
      const elapsed = Date.now() - lastActive;
      if (elapsed > ADMIN_SESSION_TIMEOUT_MS) {
        logoutAdmin(true);
        return false;
      }
    } else {
      const now = Date.now();
      sessionStorage.setItem(ADMIN_LAST_ACTIVE_KEY, String(now));
      localStorage.setItem(ADMIN_LAST_ACTIVE_KEY, String(now));
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get current admin session token
 */
export function getAdminToken(): string | null {
  if (!isAdminAuthenticated()) {
    return null;
  }
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeAdminToken(token: string): void {
  const now = Date.now();
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_LAST_ACTIVE_KEY, String(now));
  localStorage.setItem(ADMIN_LAST_ACTIVE_KEY, String(now));
  window.dispatchEvent(new Event(ADMIN_AUTH_CHANGED_EVENT));
}

/**
 * Grant unified Admin session when verified portfolio owner authenticates via Google Cloud Auth
 */
export function grantAdminSessionFromGoogleOwner(): void {
  storeAdminToken(`sabbir_sqa_admin_google_${Date.now()}`);
}

/**
 * Verify Admin Passcode via secure backend API endpoint
 */
export async function verifyAdminPasscode(inputCode: string): Promise<boolean> {
  const trimmed = (inputCode || '').trim();
  if (!trimmed) return false;

  try {
    const response = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ passcode: trimmed }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.token) {
        storeAdminToken(data.token);
        return true;
      }
    }

    // Strictly reject invalid passcode responses from backend without falling back to default
    if (response.status === 401 || response.status === 400 || response.status === 403) {
      return false;
    }
  } catch (err) {
    console.error('Network error verifying admin passcode, checking offline hash:', err);
  }

  // Offline/static fallback only when server is unreachable
  try {
    const savedHash = localStorage.getItem(ADMIN_LOCAL_PASS_HASH_KEY);
    if (savedHash) {
      const candidateHash = await sha256Hex(trimmed);
      if (candidateHash === savedHash) {
        storeAdminToken(`sabbir_sqa_admin_${Date.now()}`);
        return true;
      }
      return false;
    }
  } catch {
    // ignore
  }

  if (trimmed === 'sabbir@sqa2026') {
    storeAdminToken(`sabbir_sqa_admin_${Date.now()}`);
    return true;
  }

  return false;
}

/**
 * Update Admin Password via backend API (requires current password verification)
 */
export async function updateAdminPasscode(
  currentPasscode: string,
  newPasscode: string
): Promise<{ success: boolean; error?: string }> {
  const currentTrimmed = (currentPasscode || '').trim();
  const nextTrimmed = (newPasscode || '').trim();

  if (!currentTrimmed) {
    return { success: false, error: 'Current password is required.' };
  }
  if (nextTrimmed.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters.' };
  }

  const token = getAdminToken() || '';

  try {
    const response = await fetch('/api/admin/update-passcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
      body: JSON.stringify({
        currentPasscode: currentTrimmed,
        newPasscode: nextTrimmed,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      try {
        const nextHash = await sha256Hex(nextTrimmed);
        localStorage.setItem(ADMIN_LOCAL_PASS_HASH_KEY, nextHash);
      } catch {
        // ignore
      }
      if (data.token) {
        storeAdminToken(data.token);
      }
      return { success: true };
    }

    return {
      success: false,
      error: data.error || 'Incorrect current password or unable to update password.',
    };
  } catch {
    // Offline fallback if running purely client-side
    const isCurrentValid = await verifyAdminPasscode(currentTrimmed);
    if (!isCurrentValid) {
      return { success: false, error: 'Incorrect current password.' };
    }
    try {
      const nextHash = await sha256Hex(nextTrimmed);
      localStorage.setItem(ADMIN_LOCAL_PASS_HASH_KEY, nextHash);
      storeAdminToken(`sabbir_sqa_admin_${Date.now()}`);
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to save new password.' };
    }
  }
}

/**
 * Verify owner status with backend server
 */
export async function verifyOwnerWithServer(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;

  try {
    const response = await fetch('/api/owner/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      const data = await response.json();
      return Boolean(data.success && data.isOwner);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Logout / Lock Admin session
 */
export function logoutAdmin(isAutoExpired = false): void {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_LAST_ACTIVE_KEY);
    localStorage.removeItem(ADMIN_LAST_ACTIVE_KEY);
  } catch {
    // Ignore storage errors
  }

  if (isAutoExpired) {
    window.dispatchEvent(
      new CustomEvent(ADMIN_SESSION_EXPIRED_EVENT, {
        detail: { reason: 'inactivity_timeout_2min', timestamp: Date.now() },
      })
    );
  }

  window.dispatchEvent(new Event(ADMIN_AUTH_CHANGED_EVENT));
}
