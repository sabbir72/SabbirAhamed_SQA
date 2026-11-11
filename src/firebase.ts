/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Firebase Google Authentication Client
 * Description : Initializes Firebase Auth exclusively for verified owner Google Sign-In
 *               (sabbircse72@gmail.com) to authorize PostgreSQL database writes.
 * Author      : Sabbir Ahamed
 * -----------------------------------------
 */

import { initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
  inMemoryPersistence,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

export const TOKEN_SAFETY_BUFFER_MS = 6 * 60 * 1000;

export const PRIMARY_OWNER_EMAIL = 'sabbircse72@gmail.com';
export const OWNER_ADMIN_EMAILS: readonly string[] = ['sabbircse72@gmail.com'];

interface InternalStsUser {
  stsTokenManager?: {
    accessToken?: string;
    expirationTime?: number;
  };
}

function cleanStorageBucket(storage: Storage, now: number, forceClearAll: boolean): void {
  const keysToDelete: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith('firebase:')) continue;

    if (forceClearAll) {
      keysToDelete.push(key);
      continue;
    }

    if (key.startsWith('firebase:authUser:')) {
      const raw = storage.getItem(key);
      if (!raw) {
        keysToDelete.push(key);
        continue;
      }
      try {
        const parsed = JSON.parse(raw) as InternalStsUser;
        const exp = Number(parsed?.stsTokenManager?.expirationTime || 0);
        const token = parsed?.stsTokenManager?.accessToken;
        if (!token || !exp || exp - now <= TOKEN_SAFETY_BUFFER_MS) {
          keysToDelete.push(key);
        }
      } catch {
        keysToDelete.push(key);
      }
    }
  }
  for (const key of keysToDelete) {
    storage.removeItem(key);
  }
}

export function purgeStaleFirebaseAuthStorage(forceClearAll = false): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  try {
    cleanStorageBucket(window.localStorage, now, forceClearAll);
  } catch {
    // ignore
  }
  try {
    cleanStorageBucket(window.sessionStorage, now, forceClearAll);
  } catch {
    // ignore
  }
  if (forceClearAll) {
    try {
      if (typeof window.indexedDB !== 'undefined') {
        window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
      }
    } catch {
      // ignore
    }
  }
}

purgeStaleFirebaseAuthStorage(false);

const app = initializeApp(firebaseConfig);

function createMobileReadyAuth(): Auth {
  if (typeof window === 'undefined') {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createMobileReadyAuth();
export { browserPopupRedirectResolver };

export function getPreferredOwnerEmail(): string {
  return PRIMARY_OWNER_EMAIL;
}

export function setPreferredOwnerEmail(): string {
  return PRIMARY_OWNER_EMAIL;
}

export function createOwnerGoogleProvider(forceAccountSelect = false): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    login_hint: PRIMARY_OWNER_EMAIL,
    ...(forceAccountSelect ? { prompt: 'select_account' } : { prompt: 'select_account' }),
  });
  return provider;
}

export const googleProvider = createOwnerGoogleProvider();

export function getOwnerTokenExpiryMs(user: User | null | undefined): number {
  if (!user) return 0;
  const internal = user as unknown as InternalStsUser;
  const exp = Number(internal?.stsTokenManager?.expirationTime || 0);
  return Number.isFinite(exp) ? exp : 0;
}

export function hasFreshOwnerAuthToken(user: User | null | undefined): boolean {
  if (!user) return false;
  const internal = user as unknown as InternalStsUser;
  if (!internal?.stsTokenManager?.accessToken) return false;
  const exp = getOwnerTokenExpiryMs(user);
  return exp > Date.now() + TOKEN_SAFETY_BUFFER_MS;
}

export function isVerifiedFirebaseOwner(user: User | null | undefined): boolean {
  if (!user || !user.email || !user.emailVerified) return false;
  return user.email.trim().toLowerCase() === PRIMARY_OWNER_EMAIL;
}

export async function getOwnerIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user || !isVerifiedFirebaseOwner(user)) {
    return null;
  }
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export function isTokenServiceDisabledError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const combined = `${code} ${msg}`.toLowerCase();
  return (
    combined.includes('token-service-api') ||
    combined.includes('securetoken.googleapis.com') ||
    combined.includes('fetching auth token failed')
  );
}

export async function purgeExpiredRuntimeAuthSession(): Promise<void> {
  purgeStaleFirebaseAuthStorage(true);
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
}
