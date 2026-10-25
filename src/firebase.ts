/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Firebase Cloud Firestore & Google Auth Client
 * Description : Initializes Firebase SDK from provisioned firebase-applet-config.json,
 *               verifies server connectivity, and provides structured Zero-Trust
 *               Firestore error diagnostics.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-24
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
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
  User,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Connect specifically to the provisioned named Firestore database
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

function createMobileReadyAuth(): Auth {
  if (typeof window === 'undefined') {
    return getAuth(app);
  }
  try {
    // Synchronous browserLocalPersistence first prevents async IndexedDB delays from
    // expiring mobile Safari/Chrome touch gestures before signInWithPopup opens,
    // and inMemoryPersistence ensures mobile cross-origin iframes never fail storage checks.
    return initializeAuth(app, {
      persistence: [
        browserLocalPersistence,
        browserSessionPersistence,
        indexedDBLocalPersistence,
        inMemoryPersistence,
      ],
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
  'sabbir.altersense@gmail.com',
];

export function createOwnerGoogleProvider(
  loginHintEmail: string = PRIMARY_OWNER_EMAIL,
  forceAccountSelect = false
): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  const params: Record<string, string> = {};
  const cleanHint = (loginHintEmail || PRIMARY_OWNER_EMAIL).trim().toLowerCase();
  if (cleanHint) {
    params.login_hint = cleanHint;
  }
  if (forceAccountSelect) {
    params.prompt = 'select_account';
  }
  provider.setCustomParameters(params);
  return provider;
}

export const googleProvider = createOwnerGoogleProvider(PRIMARY_OWNER_EMAIL);

export function isVerifiedFirebaseOwner(user: User | null | undefined): boolean {
  if (!user || !user.email || !user.emailVerified) return false;
  return OWNER_ADMIN_EMAILS.includes(user.email.toLowerCase());
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
    await getDocFromServer(doc(db, 'portfolio_meta', 'main'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testFirestoreConnection();
