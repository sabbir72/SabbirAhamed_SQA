/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Admin Authentication & Session Lock
 * Description : Securely verifies Admin Passcode via backend API without storing or
 *               exposing hardcoded passcodes in client-side code, DOM, or storage.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-08-04
 * -----------------------------------------
 */

const ADMIN_TOKEN_KEY = 'sabbir_sqa_admin_token';

/**
 * Check if the user is currently authenticated as Admin
 */
export function isAdminAuthenticated(): boolean {
  try {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
    return Boolean(token && token.startsWith('sabbir_sqa_admin_'));
  } catch (err) {
    return false;
  }
}

/**
 * Get current admin session token
 */
export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch (err) {
    return null;
  }
}

/**
 * Verify Admin Passcode via secure backend API endpoint
 * Passcode is sent directly over API and validated on backend server only.
 */
export async function verifyAdminPasscode(inputCode: string): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ passcode: inputCode }),
    });

    const data = await response.json();

    if (response.ok && data.success && data.token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      window.dispatchEvent(new Event('admin_auth_changed'));
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error verifying admin passcode with server:', err);
    return false;
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
  } catch (err) {
    return false;
  }
}

/**
 * Logout / Lock Admin session
 */
export function logoutAdmin(): void {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch (err) {
    // Ignore storage errors
  }
  window.dispatchEvent(new Event('admin_auth_changed'));
}
