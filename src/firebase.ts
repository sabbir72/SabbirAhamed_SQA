/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Firebase Cloud Firestore & Google Auth Client
 * Description : Initializes isolated Public Reader Firestore (`publicDb`) and
 *               Owner Writer Firestore (`db`) + Mobile-Ready Google Auth (`auth`)
 *               with proactive token-expiry sanitization so stale refresh tokens
 *               never trigger `securetoken.googleapis.com` errors or block reads.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-25
 * -----------------------------------------
 */

import { initializeApp } from 'firebase/app';
import {
  Auth,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
  inMemoryPersistence,
  signOut,
  User,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// 6-minute buffer ensures we stay strictly ahead of @firebase/auth's 5-minute internal refresh offset
export const TOKEN_SAFETY_BUFFER_MS = 6 * 60 * 1000;

interface InternalStsUser {
  stsTokenManager?: {
    accessToken?: string;
    expirationTime?: number;
  };
}

/**
 * Purges any stale/expired Firebase Auth entries from Web Storage & IndexedDB BEFORE
 * `initializeAuth` boots so old sessions never call `securetoken.googleapis.com` and block Firestore.
 */
export function purgeStaleFirebaseAuthStorage(forceClearAll = false): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();

  // 1. Always remove persistent localStorage Firebase Auth keys so cross-day expired tokens never accumulate
  try {
    const localKeysToDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('firebase:')) {
        localKeysToDelete.push(key);
      }
    }
    for (const key of localKeysToDelete) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access restrictions
  }

  // 2. Inspect sessionStorage Firebase Auth keys: keep only unexpired fresh tokens (>6 min remaining)
  try {
    const sessionKeysToDelete: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (!key || !key.startsWith('firebase:')) continue;

      if (forceClearAll) {
        sessionKeysToDelete.push(key);
        continue;
      }

      if (key.startsWith('firebase:authUser:')) {
        const raw = window.sessionStorage.getItem(key);
        if (!raw) {
          sessionKeysToDelete.push(key);
          continue;
        }
        try {
          const parsed = JSON.parse(raw) as InternalStsUser;
          const exp = Number(parsed?.stsTokenManager?.expirationTime || 0);
          const token = parsed?.stsTokenManager?.accessToken;
          if (!token || !exp || exp - now <= TOKEN_SAFETY_BUFFER_MS) {
            sessionKeysToDelete.push(key);
          }
        } catch {
          sessionKeysToDelete.push(key);
        }
      }
    }
    for (const key of sessionKeysToDelete) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore sessionStorage restrictions
  }

  // 3. Delete legacy IndexedDB Firebase Auth store left by older builds
  try {
    if (typeof window.indexedDB !== 'undefined') {
      window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
    }
  } catch {
    // Ignore IndexedDB restrictions
  }
}

// Sanitize storage synchronously BEFORE creating Firebase apps or Auth!
purgeStaleFirebaseAuthStorage(false);

// Primary App: Used for authenticated Owner Google Sign-In & Firestore writes
const app = initializeApp(firebaseConfig);

// Isolated Public Reader App (NO Auth attached): Guarantees public portfolio & real-time
// Firestore reads NEVER depend on Auth tokens or fail if a token expires.
const publicReaderApp = initializeApp(firebaseConfig, 'portfolio-public-reader');

// CRITICAL: Connect both instances to the provisioned named Firestore database
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const publicDb = getFirestore(publicReaderApp, firebaseConfig.firestoreDatabaseId);

function createMobileReadyAuth(): Auth {
  if (typeof window === 'undefined') {
    return getAuth(app);
  }
  try {
    // Synchronous browserSessionPersistence resolves in 0ms (preserving mobile Safari/Chrome
    // tap gestures for signInWithPopup & supporting signInWithRedirect) without cross-day stale tokens.
    return initializeAuth(app, {
      persistence: [browserSessionPersistence, inMemoryPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createMobileReadyAuth();
export { browserPopupRedirectResolver };

export const PRIMARY_OWNER_EMAIL = 'sabbircse72@gmail.com';

export const OWNER_ADMIN_EMAILS: readonly string[] = [
  'sabbircse72@gmail.com',
];

export function createOwnerGoogleProvider(
  _loginHintEmail: string = PRIMARY_OWNER_EMAIL,
  forceAccountSelect = false
): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  const params: Record<string, string> = {
    login_hint: PRIMARY_OWNER_EMAIL,
  };
  if (forceAccountSelect) {
    params.prompt = 'select_account';
  }
  provider.setCustomParameters(params);
  return provider;
}

export const googleProvider = createOwnerGoogleProvider(PRIMARY_OWNER_EMAIL);

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
  return OWNER_ADMIN_EMAILS.includes(user.email.toLowerCase());
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
    // Ignore signOut errors
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionTested = false;

export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested || typeof window === 'undefined') return;
  connectionTested = true;
  try {
    // Validate connectivity against the isolated unauthenticated publicDb instance
    await getDocFromServer(doc(publicDb, 'portfolio_meta', 'main'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testFirestoreConnection();
