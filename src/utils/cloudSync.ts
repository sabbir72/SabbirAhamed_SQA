/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : PostgreSQL Synchronization Engine
 * Description : Synchronizes Projects, Blogs, Categories, Experiences, Skills,
 *               References, Career Roadmap, Profile, Visiting Card, and Theme
 *               with the PostgreSQL backend API using verified Firebase Auth
 *               for sabbircse72@gmail.com.
 * Author      : Sabbir Ahamed
 * -----------------------------------------
 */

import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  auth,
  browserPopupRedirectResolver,
  createOwnerGoogleProvider,
  getOwnerIdToken,
  getOwnerTokenExpiryMs,
  hasFreshOwnerAuthToken,
  isTokenServiceDisabledError,
  isVerifiedFirebaseOwner,
  PRIMARY_OWNER_EMAIL,
  purgeExpiredRuntimeAuthSession,
  TOKEN_SAFETY_BUFFER_MS,
} from '../firebase';
import type { Project, Experience, Skill, Reference, CareerRoadmapItem } from '../types';
import type { BlogPost } from '../data/blogs';
import {
  clearLocalUnsyncedEdits,
  hasLocalUnsyncedEdits,
  UNSYNCED_EDITS_CHANGED_EVENT,
} from './portfolioStore';
import type { PortfolioData, ProfileData } from './portfolioStore';
import type {
  PrivacySettings,
  TeamMemberCard,
  VisitingCardConfig,
} from './visitingCardStore';
import {
  ADMIN_AUTH_CHANGED_EVENT,
  clearAdminOAuthGracePeriod,
  isAdminAuthenticated,
  recordAdminActivity,
  startAdminOAuthGracePeriod,
} from './adminAuth';

export const CLOUD_SYNC_STATUS_EVENT = 'sabbir_cloud_sync_status';
export const CLOUD_AUTO_SCAN_COMPLETED_EVENT = 'sabbir_cloud_auto_scan_completed';

export interface CloudSyncStatus {
  isOwnerConnected: boolean;
  firebaseConnected: boolean;
  ownerEmail: string | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  cloudProjectsCount: number;
  cloudBlogsCount: number;
  hasUnsyncedChanges: boolean;
  error: string | null;
}

export interface CloudPortfolioSnapshotPayload {
  meta?: {
    profile?: ProfileData;
    skills?: Skill[];
    references?: Reference[];
    careerRoadmap?: CareerRoadmapItem[];
    blogCategories?: string[];
    deletedProjectIds?: string[];
    deletedExperienceIds?: string[];
    deletedBlogIds?: string[];
    deletedReferenceIds?: string[];
    deletedRoadmapIds?: string[];
    themeId?: string;
    vcardConfig?: Partial<VisitingCardConfig>;
    vcardPrivacy?: Partial<PrivacySettings>;
    vcardTeam?: TeamMemberCard[];
    lastModified?: string;
  };
  projects?: Project[];
  experiences?: Experience[];
  blogs?: BlogPost[];
}

export interface CloudBridgeCallbacks {
  getPortfolioData: () => PortfolioData;
  getBlogs: () => BlogPost[];
  getBlogCategories: () => string[];
  onCloudSnapshot: (snapshot: CloudPortfolioSnapshotPayload) => void;
}

let bridge: CloudBridgeCallbacks | null = null;
let syncInitialized = false;
let isApplyingSnapshot = false;

type FullSyncResult = {
  success: boolean;
  projectsSynced: number;
  blogsSynced: number;
  error?: string;
};

let activeFullSyncPromise: Promise<FullSyncResult> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function enqueueSnapshotWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.catch(() => undefined).then(task);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

let currentStatus: CloudSyncStatus = {
  isOwnerConnected: false,
  firebaseConnected: false,
  ownerEmail: null,
  isSyncing: false,
  lastSyncedAt:
    typeof localStorage !== 'undefined' ? localStorage.getItem('sabbir_cloud_last_synced_at') : null,
  cloudProjectsCount: 0,
  cloudBlogsCount: 0,
  hasUnsyncedChanges: hasLocalUnsyncedEdits(),
  error: null,
};

let latestSnapshot: CloudPortfolioSnapshotPayload | null = null;
let lastServerPullTimestamp = 0;
let activePullPromise: Promise<void> | null = null;

function emitStatus(partial: Partial<CloudSyncStatus>): void {
  const nextFirebase =
    partial.firebaseConnected !== undefined
      ? partial.firebaseConnected
      : currentStatus.firebaseConnected;
  const nextOwnerConnected =
    partial.isOwnerConnected !== undefined ? partial.isOwnerConnected : nextFirebase;

  currentStatus = {
    ...currentStatus,
    ...partial,
    firebaseConnected: nextFirebase,
    isOwnerConnected: nextOwnerConnected,
    hasUnsyncedChanges:
      partial.hasUnsyncedChanges !== undefined
        ? partial.hasUnsyncedChanges
        : hasLocalUnsyncedEdits(),
  };

  if (partial.lastSyncedAt) {
    try {
      localStorage.setItem('sabbir_cloud_last_synced_at', partial.lastSyncedAt);
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLOUD_SYNC_STATUS_EVENT, { detail: currentStatus }));
  }
}

export function canFirebaseOwnerWrite(): boolean {
  return (
    isAdminAuthenticated() &&
    isVerifiedFirebaseOwner(auth.currentUser) &&
    hasFreshOwnerAuthToken(auth.currentUser)
  );
}

export function canAdminWriteToCloud(): boolean {
  return canFirebaseOwnerWrite();
}

export function getCloudSyncStatus(): CloudSyncStatus {
  return currentStatus;
}

export function isCurrentlyApplyingCloudSnapshot(): boolean {
  return isApplyingSnapshot;
}

export function isMobileBrowserDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /Android|iPhone|iPad|iPod|Mobile|CriOS|FxiOS|SamsungBrowser/i.test(ua) ||
    window.innerWidth <= 768
  );
}

export function isEmbeddedInAppWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Messenger|WhatsApp|LinkedInApp|Line\/|; wv\)/i.test(ua);
}

export function isTopLevelBrowserWindow(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
}

function safeStr(val: unknown, maxLen: number, fallback = ''): string {
  const str = typeof val === 'string' ? val : val != null ? String(val) : fallback;
  return str.slice(0, maxLen);
}

function safeNonEmptyStr(val: unknown, maxLen: number, fallback: string): string {
  const trimmed = safeStr(val, maxLen).trim();
  return (trimmed || fallback).slice(0, maxLen);
}

function sanitizeStringArray(arr: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const item of arr) {
    if (out.length >= maxItems) break;
    if (typeof item === 'string' && item.trim()) {
      out.push(item.trim().slice(0, maxLen));
    }
  }
  return out;
}

function buildCleanSnapshot(
  portfolio: PortfolioData,
  blogsInput?: BlogPost[],
  categoriesInput?: string[]
): CloudPortfolioSnapshotPayload {
  const blogs = blogsInput ?? portfolio.blogs ?? bridge?.getBlogs() ?? [];
  const categories =
    categoriesInput ?? portfolio.blogCategories ?? bridge?.getBlogCategories() ?? [];

  const deletedProjSet = new Set(portfolio.deletedProjectIds || []);
  const deletedExpSet = new Set(portfolio.deletedExperienceIds || []);
  const deletedBlogSet = new Set(portfolio.deletedBlogIds || []);

  const activeProjects = (portfolio.projects || []).filter((p) => !deletedProjSet.has(p.id));
  const activeExperiences = (portfolio.experiences || []).filter((e) => !deletedExpSet.has(e.id));
  const activeBlogs = blogs.filter((b) => !deletedBlogSet.has(b.id));

  const lastModified = safeNonEmptyStr(portfolio.lastModified, 64, new Date().toISOString());

  return {
    meta: {
      profile: portfolio.profile,
      skills: portfolio.skills,
      references: portfolio.references,
      careerRoadmap: portfolio.careerRoadmap,
      blogCategories: sanitizeStringArray(categories, 100, 120),
      deletedProjectIds: sanitizeStringArray(portfolio.deletedProjectIds, 500, 128),
      deletedExperienceIds: sanitizeStringArray(portfolio.deletedExperienceIds, 500, 128),
      deletedBlogIds: sanitizeStringArray(portfolio.deletedBlogIds, 500, 128),
      deletedReferenceIds: sanitizeStringArray(portfolio.deletedReferenceIds, 500, 128),
      deletedRoadmapIds: sanitizeStringArray(portfolio.deletedRoadmapIds, 500, 128),
      themeId: safeNonEmptyStr(portfolio.themeId, 64, 'cyber-cyan'),
      vcardConfig: portfolio.vcardConfig,
      vcardPrivacy: portfolio.vcardPrivacy,
      vcardTeam: portfolio.vcardTeam,
      lastModified,
    },
    projects: activeProjects,
    experiences: activeExperiences,
    blogs: activeBlogs,
  };
}

async function persistSnapshotToServer(snapshot: CloudPortfolioSnapshotPayload): Promise<boolean> {
  if (typeof window === 'undefined' || isApplyingSnapshot) return false;
  if (!canFirebaseOwnerWrite()) return false;

  const idToken = await getOwnerIdToken();
  if (!idToken) return false;

  return enqueueSnapshotWrite(async () => {
    const res = await fetch('/api/portfolio/snapshot', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ snapshot }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
    };

    if (!res.ok || !json.success) {
      throw new Error(json.error || `Save failed (${res.status}).`);
    }

    latestSnapshot = snapshot;
    clearLocalUnsyncedEdits();
    emitStatus({
      isSyncing: false,
      hasUnsyncedChanges: false,
      lastSyncedAt: new Date().toISOString(),
      cloudProjectsCount: snapshot.projects?.length ?? currentStatus.cloudProjectsCount,
      cloudBlogsCount: snapshot.blogs?.length ?? currentStatus.cloudBlogsCount,
      error: null,
    });
    return true;
  });
}

function notifyBridgeSnapshot(): void {
  if (!bridge || !latestSnapshot) return;
  isApplyingSnapshot = true;
  try {
    bridge.onCloudSnapshot(latestSnapshot);
  } finally {
    isApplyingSnapshot = false;
  }
}

async function pullServerSnapshotOnce(): Promise<void> {
  if (activePullPromise) {
    return activePullPromise;
  }

  activePullPromise = (async () => {
    lastServerPullTimestamp = Date.now();
    try {
      const res = await fetch('/api/portfolio/snapshot', { cache: 'no-store' });
      if (!res.ok) return;

      const json = (await res.json()) as {
        success?: boolean;
        data?: CloudPortfolioSnapshotPayload | null;
      };

      if (json.success && json.data && typeof json.data === 'object') {
        latestSnapshot = json.data;
        emitStatus({
          cloudProjectsCount: Array.isArray(json.data.projects) ? json.data.projects.length : 0,
          cloudBlogsCount: Array.isArray(json.data.blogs) ? json.data.blogs.length : 0,
        });
        notifyBridgeSnapshot();
      }
    } catch (err) {
      console.warn('Portfolio snapshot pull warning:', err);
    }
  })().finally(() => {
    activePullPromise = null;
  });

  return activePullPromise;
}

export async function forcePullLatestFromCloud(minIntervalMs = 4000): Promise<void> {
  if (typeof window === 'undefined') return;
  if (Date.now() - lastServerPullTimestamp < minIntervalMs) return;
  await pullServerSnapshotOnce();
}

// ------------------------------------------------------------------------
// Granular Sync Writers Called Automatically by Portfolio & Blog Stores
// ------------------------------------------------------------------------

export async function pushPortfolioMetaToCloud(
  data: PortfolioData,
  blogCategories?: string[]
): Promise<boolean> {
  if (isApplyingSnapshot) return false;
  if (!canFirebaseOwnerWrite()) {
    emitStatus({ hasUnsyncedChanges: hasLocalUnsyncedEdits() });
    return false;
  }
  emitStatus({ isSyncing: true, error: null });
  try {
    const snapshot = buildCleanSnapshot(data, data.blogs, blogCategories);
    return await persistSnapshotToServer(snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save portfolio updates.';
    emitStatus({ isSyncing: false, error: message });
    throw new Error(message);
  }
}

export async function pushProjectToCloud(_project: Project, _orderIndex = 0): Promise<void> {
  if (isApplyingSnapshot || !canFirebaseOwnerWrite() || !bridge) return;
  await persistSnapshotToServer(buildCleanSnapshot(bridge.getPortfolioData()));
}

export async function pushAllProjectsToCloud(projects: Project[]): Promise<void> {
  if (isApplyingSnapshot || !canFirebaseOwnerWrite() || !bridge) return;
  const portfolio = { ...bridge.getPortfolioData(), projects };
  await persistSnapshotToServer(buildCleanSnapshot(portfolio));
}

export async function deleteProjectFromCloud(projectId: string): Promise<void> {
  if (isApplyingSnapshot || !canFirebaseOwnerWrite() || !bridge) return;
  const current = bridge.getPortfolioData();
  const deletedProjectIds = Array.from(new Set([...(current.deletedProjectIds || []), projectId]));
  const projects = current.projects.filter((p) => p.id !== projectId);
  await persistSnapshotToServer(buildCleanSnapshot({ ...current, projects, deletedProjectIds }));
}

export async function pushExperienceToCloud(_exp: Experience, _orderIndex = 0): Promise<void> {
  if (isApplyingSnapshot || !canFirebaseOwnerWrite() || !bridge) return;
  await persistSnapshotToServer(buildCleanSnapshot(bridge.getPortfolioData()));
}

export async function pushAllExperiencesToCloud(experiences: Experience[]): Promise<void> {
  if (isApplyingSnapshot || !canFirebaseOwnerWrite() || !bridge) return;
  const portfolio = { ...bridge.getPortfolioData(), experiences };
  await persistSnapshotToServer(buildCleanSnapshot(portfolio));
}

export async function deleteExperienceFromCloud(expId: string): Promise<void> {
  if (isApplyingSnapshot || !canFirebaseOwnerWrite() || !bridge) return;
  const current = bridge.getPortfolioData();
  const deletedExperienceIds = Array.from(
    new Set([...(current.deletedExperienceIds || []), expId])
  );
  const experiences = current.experiences.filter((e) => e.id !== expId);
  await persistSnapshotToServer(
    buildCleanSnapshot({ ...current, experiences, deletedExperienceIds })
  );
}

export async function pushBlogToCloud(_blog: BlogPost, _orderIndex = 0): Promise<void> {
  if (isApplyingSnapshot || !canFirebaseOwnerWrite() || !bridge) return;
  await persistSnapshotToServer(
    buildCleanSnapshot(bridge.getPortfolioData(), bridge.getBlogs(), bridge.getBlogCategories())
  );
}

export async function pushAllBlogsToCloud(blogs: BlogPost[]): Promise<void> {
  if (isApplyingSnapshot || !canFirebaseOwnerWrite() || !bridge) return;
  await persistSnapshotToServer(
    buildCleanSnapshot(bridge.getPortfolioData(), blogs, bridge.getBlogCategories())
  );
}

export async function deleteBlogFromCloud(blogId: string): Promise<void> {
  if (isApplyingSnapshot || !canFirebaseOwnerWrite() || !bridge) return;
  const current = bridge.getPortfolioData();
  const deletedBlogIds = Array.from(new Set([...(current.deletedBlogIds || []), blogId]));
  const blogs = bridge.getBlogs().filter((b) => b.id !== blogId);
  await persistSnapshotToServer(
    buildCleanSnapshot({ ...current, deletedBlogIds }, blogs, bridge.getBlogCategories())
  );
}

// ------------------------------------------------------------------------
// Full Two-Way Sync
// ------------------------------------------------------------------------

export async function syncAllLocalDataToCloud(): Promise<FullSyncResult> {
  if (activeFullSyncPromise) {
    return activeFullSyncPromise;
  }

  if (!isAdminAuthenticated()) {
    return {
      success: false,
      projectsSynced: 0,
      blogsSynced: 0,
      error: 'Admin session is locked. Unlock Admin Panel with your System Password first.',
    };
  }

  if (!bridge) {
    return { success: false, projectsSynced: 0, blogsSynced: 0, error: 'Sync bridge not ready.' };
  }

  if (!canFirebaseOwnerWrite()) {
    if (auth.currentUser && !hasFreshOwnerAuthToken(auth.currentUser)) {
      await purgeExpiredRuntimeAuthSession();
      emitStatus({ firebaseConnected: false, ownerEmail: null });
    }
    return {
      success: false,
      projectsSynced: 0,
      blogsSynced: 0,
      error: `অনুমোদিত Google ইমেইল (${PRIMARY_OWNER_EMAIL}) দিয়ে সাইন-ইন করুন।`,
    };
  }

  activeFullSyncPromise = (async (): Promise<FullSyncResult> => {
    emitStatus({ isSyncing: true, error: null });
    try {
      await pullServerSnapshotOnce();

      const portfolio = bridge.getPortfolioData();
      const blogs = bridge.getBlogs();
      const categories = bridge.getBlogCategories();
      const snapshot = buildCleanSnapshot(portfolio, blogs, categories);

      await persistSnapshotToServer(snapshot);

      return {
        success: true,
        projectsSynced: snapshot.projects?.length ?? 0,
        blogsSynced: snapshot.blogs?.length ?? 0,
      };
    } catch (err) {
      if (isTokenServiceDisabledError(err)) {
        await purgeExpiredRuntimeAuthSession();
        const reconnectMsg = 'Google সেশনের মেয়াদ শেষ হয়েছে। আবার কানেক্ট করুন।';
        emitStatus({
          isSyncing: false,
          firebaseConnected: false,
          ownerEmail: null,
          error: reconnectMsg,
        });
        return { success: false, projectsSynced: 0, blogsSynced: 0, error: reconnectMsg };
      }
      const msg = err instanceof Error ? err.message : 'Synchronization failed.';
      emitStatus({ isSyncing: false, error: msg });
      return { success: false, projectsSynced: 0, blogsSynced: 0, error: msg };
    } finally {
      activeFullSyncPromise = null;
    }
  })();

  return activeFullSyncPromise;
}

// ------------------------------------------------------------------------
// Google Owner Sign-In / Sign-Out (signInWithPopup + In-Memory Token)
// ------------------------------------------------------------------------

export function formatMobileAwareAuthError(err: unknown): {
  code: string;
  message: string;
} {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const rawMsg = err instanceof Error ? err.message : String(err);

  if (isEmbeddedInAppWebView()) {
    return {
      code: code || 'auth/webview-unsupported',
      message:
        'Messenger / WhatsApp ইন-অ্যাপ ব্রাউজারে Google Sign-In বন্ধ থাকে। Chrome বা Safari ব্রাউজারে ওপেন করে কানেক্ট করুন।',
    };
  }

  if (code.includes('unauthorized-domain') || rawMsg.includes('unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return {
      code: 'auth/unauthorized-domain',
      message: `এই ডোমেইন (${host}) Firebase Authorized Domains-এ যোগ করুন।`,
    };
  }

  if (code.includes('popup-blocked') || rawMsg.includes('popup-blocked')) {
    return {
      code: 'auth/popup-blocked',
      message: 'ব্রাউজারে পপআপ ব্লক হয়েছে। পপআপ অনুমতি দিয়ে আবার চেষ্টা করুন।',
    };
  }

  if (
    code.includes('popup-closed-by-user') ||
    code.includes('cancelled-popup-request') ||
    rawMsg.includes('popup-closed-by-user')
  ) {
    return {
      code: code || 'auth/popup-closed-by-user',
      message: 'Google সাইন-ইন সম্পন্ন হওয়ার আগেই পপআপ বন্ধ হয়ে গেছে। আবার চেষ্টা করুন।',
    };
  }

  return {
    code: code || 'auth/unknown',
    message: `Google সাইন-ইন সম্পন্ন হয়নি${code ? ` (${code})` : ''}। অনুগ্রহ করে আবার চেষ্টা করুন।`,
  };
}

export async function signInOwnerWithGoogle(
  _preferredEmail: string = PRIMARY_OWNER_EMAIL,
  forceAccountSelect = false
): Promise<{
  success: boolean;
  email?: string;
  error?: string;
  errorCode?: string;
}> {
  if (!isAdminAuthenticated()) {
    return {
      success: false,
      error: 'আগে System Password দিয়ে Admin Panel আনলক করুন।',
    };
  }

  startAdminOAuthGracePeriod();
  const provider = createOwnerGoogleProvider(forceAccountSelect);

  try {
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const user = result.user;

    if (!isVerifiedFirebaseOwner(user)) {
      const wrongEmail = user?.email || 'অন্য ইমেইল';
      await signOut(auth);
      clearAdminOAuthGracePeriod();
      return {
        success: false,
        errorCode: 'auth/wrong-owner-email',
        error: `"${wrongEmail}" অনুমোদিত নয়। শুধুমাত্র ${PRIMARY_OWNER_EMAIL} দিয়ে সাইন-ইন করুন।`,
      };
    }

    // Retrieve ID token cleanly in memory to verify readiness (never stored in localStorage)
    await user.getIdToken();
    recordAdminActivity();
    clearAdminOAuthGracePeriod();

    emitStatus({
      firebaseConnected: true,
      ownerEmail: user.email || PRIMARY_OWNER_EMAIL,
      error: null,
    });

    void syncAllLocalDataToCloud();
    return { success: true, email: user.email || PRIMARY_OWNER_EMAIL };
  } catch (err) {
    if (isTokenServiceDisabledError(err)) {
      await purgeExpiredRuntimeAuthSession();
    }
    clearAdminOAuthGracePeriod();
    const formatted = formatMobileAwareAuthError(err);
    return {
      success: false,
      errorCode: formatted.code,
      error: formatted.message,
    };
  }
}

export async function signOutOwnerFromGoogle(): Promise<void> {
  try {
    await purgeExpiredRuntimeAuthSession();
  } finally {
    emitStatus({
      firebaseConnected: false,
      ownerEmail: null,
    });
  }
}

// ------------------------------------------------------------------------
// Initialization & Lifecycle Listeners
// ------------------------------------------------------------------------

let tokenExpiryTimerId: number | null = null;

function clearTokenExpiryTimer(): void {
  if (tokenExpiryTimerId !== null && typeof window !== 'undefined') {
    window.clearTimeout(tokenExpiryTimerId);
    tokenExpiryTimerId = null;
  }
}

export function initializeCloudRealtimeSync(callbacks: CloudBridgeCallbacks): void {
  bridge = callbacks;
  if (typeof window === 'undefined') return;

  if (syncInitialized) return;
  syncInitialized = true;

  void pullServerSnapshotOnce();

  window.addEventListener(UNSYNCED_EDITS_CHANGED_EVENT, () => {
    emitStatus({ hasUnsyncedChanges: hasLocalUnsyncedEdits() });
  });

  window.addEventListener('online', () => {
    void forcePullLatestFromCloud(2000);
    if (canFirebaseOwnerWrite() && hasLocalUnsyncedEdits()) {
      void syncAllLocalDataToCloud();
    }
  });

  const handleResumeRefresh = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void forcePullLatestFromCloud(4000);
    }
  };
  document.addEventListener('visibilitychange', handleResumeRefresh);
  window.addEventListener('focus', () => {
    void forcePullLatestFromCloud(4000);
  });

  window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, () => {
    if (canFirebaseOwnerWrite() && hasLocalUnsyncedEdits()) {
      void syncAllLocalDataToCloud();
    }
  });

  onAuthStateChanged(auth, (user) => {
    clearTokenExpiryTimer();

    if (user && !hasFreshOwnerAuthToken(user)) {
      void purgeExpiredRuntimeAuthSession();
      emitStatus({
        firebaseConnected: false,
        ownerEmail: null,
      });
      return;
    }

    const fbConnected = isVerifiedFirebaseOwner(user) && hasFreshOwnerAuthToken(user);
    emitStatus({
      firebaseConnected: fbConnected,
      ownerEmail: fbConnected && user ? user.email : null,
    });

    if (fbConnected && user) {
      const msUntilSafeCutoff = Math.max(
        5_000,
        getOwnerTokenExpiryMs(user) - Date.now() - TOKEN_SAFETY_BUFFER_MS
      );
      tokenExpiryTimerId = window.setTimeout(() => {
        void purgeExpiredRuntimeAuthSession().then(() => {
          emitStatus({
            firebaseConnected: false,
            ownerEmail: null,
          });
        });
      }, msUntilSafeCutoff);

      if (isAdminAuthenticated()) {
        void syncAllLocalDataToCloud();
      }
    }
  });
}
