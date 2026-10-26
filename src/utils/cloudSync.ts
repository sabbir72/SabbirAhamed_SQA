/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Real-Time Cloud Auto-Save & Synchronization Engine
 * Description : Automatically persists and synchronizes Projects, Blogs, Categories,
 *               Experiences (Story), Skills, References, Career Roadmap, Profile,
 *               Visiting Card, Theme, and Optimized Images with Google Cloud Firestore
 *               so zero user edits are ever lost across rebuilds or deployments.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-26
 * -----------------------------------------
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  auth,
  browserPopupRedirectResolver,
  createOwnerGoogleProvider,
  db,
  getOwnerTokenExpiryMs,
  handleFirestoreError,
  hasFreshOwnerAuthToken,
  isTokenServiceDisabledError,
  isVerifiedFirebaseOwner,
  OperationType,
  PRIMARY_OWNER_EMAIL,
  publicDb,
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
  completeAdminOAuthRedirectSession,
  isAdminAuthenticated,
  isAdminOAuthGraceActive,
  recordAdminActivity,
  startAdminOAuthGracePeriod,
} from './adminAuth';

const knownAuthorizedDomains = new Set<string>([
  'splendid-meridian-64mm2.firebaseapp.com',
  'splendid-meridian-64mm2.web.app',
  'ais-dev-f7abqgvus7ali36cbsgtcy-609487281458.asia-southeast1.run.app',
  'ais-pre-f7abqgvus7ali36cbsgtcy-609487281458.asia-southeast1.run.app',
  'ais-mob-f7abqgvus7ali36cbsgtcy-609487281458.asia-southeast1.run.app',
]);

export const AUTHORIZED_DOMAINS_UPDATED_EVENT = 'sabbir_authorized_domains_updated';

let authorizedDomainsFetched = false;
let authorizedDomainsLoaded = false;

export function areAuthorizedDomainsLoaded(): boolean {
  return authorizedDomainsLoaded;
}

export async function refreshKnownAuthorizedDomains(force = false): Promise<boolean> {
  if (typeof window === 'undefined' || !firebaseConfig.apiKey) return true;
  if (authorizedDomainsFetched && !force) {
    return isCurrentHostFirebaseAuthorized();
  }
  authorizedDomainsFetched = true;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      authorizedDomainsLoaded = true;
      return isCurrentHostFirebaseAuthorized();
    }
    const data = (await res.json()) as { authorizedDomains?: unknown };
    if (Array.isArray(data?.authorizedDomains)) {
      knownAuthorizedDomains.clear();
      for (const dom of data.authorizedDomains) {
        if (typeof dom === 'string' && dom.trim()) {
          knownAuthorizedDomains.add(dom.trim().toLowerCase());
        }
      }
    }
    authorizedDomainsLoaded = true;
    window.dispatchEvent(new CustomEvent(AUTHORIZED_DOMAINS_UPDATED_EVENT));
  } catch {
    authorizedDomainsLoaded = true;
  }
  return isCurrentHostFirebaseAuthorized();
}

export function isCurrentHostFirebaseAuthorized(): boolean {
  if (typeof window === 'undefined') return true;
  return knownAuthorizedDomains.has(window.location.hostname.toLowerCase());
}

function canAdminWriteToCloud(): boolean {
  return (
    isAdminAuthenticated() &&
    isVerifiedFirebaseOwner(auth.currentUser) &&
    hasFreshOwnerAuthToken(auth.currentUser)
  );
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

export const CLOUD_SYNC_STATUS_EVENT = 'sabbir_cloud_sync_status';
export const CLOUD_AUTO_SCAN_COMPLETED_EVENT = 'sabbir_cloud_auto_scan_completed';

export interface CloudSyncStatus {
  isOwnerConnected: boolean;
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
const pathWriteQueues = new Map<string, Promise<void>>();

function enqueuePathWrite(path: string, task: () => Promise<void>): Promise<void> {
  const previous = pathWriteQueues.get(path) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  pathWriteQueues.set(
    path,
    current.finally(() => {
      if (pathWriteQueues.get(path) === current) {
        pathWriteQueues.delete(path);
      }
    })
  );
  return current;
}

let currentStatus: CloudSyncStatus = {
  isOwnerConnected: false,
  ownerEmail: null,
  isSyncing: false,
  lastSyncedAt:
    typeof localStorage !== 'undefined' ? localStorage.getItem('sabbir_cloud_last_synced_at') : null,
  cloudProjectsCount: 0,
  cloudBlogsCount: 0,
  hasUnsyncedChanges: hasLocalUnsyncedEdits(),
  error: null,
};

// Latest cloud cache for incremental snapshot assembly
let latestCloudMeta: CloudPortfolioSnapshotPayload['meta'] | undefined;
let latestCloudProjects: Project[] | undefined;
let latestCloudExperiences: Experience[] | undefined;
let latestCloudBlogs: BlogPost[] | undefined;

function emitStatus(partial: Partial<CloudSyncStatus>): void {
  currentStatus = {
    ...currentStatus,
    ...partial,
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

function markGranularWriteSyncedIfIdle(): void {
  const nowIso = new Date().toISOString();
  if (pathWriteQueues.size === 0 && !activeFullSyncPromise) {
    clearLocalUnsyncedEdits();
    emitStatus({
      hasUnsyncedChanges: false,
      lastSyncedAt: nowIso,
      error: null,
    });
  } else {
    emitStatus({
      lastSyncedAt: nowIso,
      error: null,
    });
  }
}

export function getCloudSyncStatus(): CloudSyncStatus {
  return currentStatus;
}

export function isCurrentlyApplyingCloudSnapshot(): boolean {
  return isApplyingSnapshot;
}

// ------------------------------------------------------------------------
// Defensive Payload Sanitizers (1:1 Schema Parity with firestore.rules)
// ------------------------------------------------------------------------

export function sanitizeDocId(rawId: string): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 128);
  return cleaned || `item-${Date.now()}`;
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

function sanitizeProfileMap(p: Partial<ProfileData> | undefined) {
  const updatedIso = safeNonEmptyStr(p?.updatedAt, 64, new Date().toISOString());
  return {
    name: safeStr(p?.name, 200, 'Sabbir Ahamed'),
    title: safeStr(p?.title, 300, 'Software Quality Assurance Engineer'),
    avatar: safeStr(p?.avatar, 450000, '/sabbir_avatar.jpeg'),
    email: safeStr(p?.email, 200, 'sabbircse72@gmail.com'),
    phone: safeStr(p?.phone, 100, '+8801681387906'),
    location: safeStr(p?.location, 200, 'Dhaka, Bangladesh'),
    github: safeStr(p?.github, 500, 'https://github.com/Sabbir-SQAE'),
    linkedin: safeStr(p?.linkedin, 500, ''),
    objective: safeStr(p?.objective, 5000, ''),
    experienceYears: safeStr(p?.experienceYears, 64, '2+ Years'),
    testCasesCount: safeStr(p?.testCasesCount, 64, '150+'),
    bugsReportedCount: safeStr(p?.bugsReportedCount, 64, '100+'),
    automationScriptsCount: safeStr(p?.automationScriptsCount, 64, '20+'),
    defectDetectionRate: safeStr(p?.defectDetectionRate, 64, '95%'),
    updatedAt: updatedIso,
  };
}

function sanitizeVCardConfigMap(c: Partial<VisitingCardConfig> | undefined) {
  const validQrModes = ['url', 'vcard', 'whatsapp', 'linkedin'] as const;
  const resolvedQrMode = validQrModes.includes(c?.defaultQrMode as (typeof validQrModes)[number])
    ? c!.defaultQrMode!
    : 'url';

  return {
    company: safeStr(c?.company, 200, 'Altersense Ltd'),
    companyBn: safeStr(c?.companyBn, 200, 'অল্টারসেন্স লিমিটেড'),
    department: safeStr(c?.department, 200, 'Manual & automation Test'),
    departmentBn: safeStr(c?.departmentBn, 200, 'ম্যানুয়াল ও অটোমেশন টেস্ট'),
    verifiedBadge: safeStr(c?.verifiedBadge, 64, 'SQA'),
    permanentUrl: safeStr(c?.permanentUrl, 1024, 'https://sabbir-sqa.vercel.app/?card=1#vcard'),
    defaultSkin: safeStr(c?.defaultSkin, 64, 'executive-dark'),
    defaultQrMode: safeStr(resolvedQrMode, 32, 'url'),
    headlineEn: safeStr(c?.headlineEn, 300, 'Software Quality Assurance & Automation Engineering'),
    headlineBn: safeStr(c?.headlineBn, 300, 'সফটওয়্যার কোয়ালিটি অ্যাসিউরেন্স ও অটোমেশন ইঞ্জিনিয়ারিং'),
  };
}

function sanitizeVCardPrivacyMap(p: Partial<PrivacySettings> | undefined) {
  return {
    showPhone: p?.showPhone !== undefined ? Boolean(p.showPhone) : true,
    showEmail: p?.showEmail !== undefined ? Boolean(p.showEmail) : true,
    showLocation: p?.showLocation !== undefined ? Boolean(p.showLocation) : true,
    showWhatsApp: p?.showWhatsApp !== undefined ? Boolean(p.showWhatsApp) : true,
    maskContactInPublic: p?.maskContactInPublic !== undefined ? Boolean(p.maskContactInPublic) : false,
  };
}

function sanitizeVCardTeamList(
  team: TeamMemberCard[] | undefined,
  mainProfileAvatar?: string
) {
  if (!Array.isArray(team)) return [];
  let cumulativeAvatarBytes = 0;
  return team.slice(0, 50).map((m) => {
    const rawAvatar = safeStr(m?.avatar, 75000, '/sabbir_avatar.jpeg');
    let deduplicatedAvatar =
      rawAvatar.startsWith('data:image/') && mainProfileAvatar && rawAvatar === mainProfileAvatar
        ? '/sabbir_avatar.jpeg'
        : rawAvatar;

    if (deduplicatedAvatar.startsWith('data:image/')) {
      if (cumulativeAvatarBytes + deduplicatedAvatar.length > 240000) {
        deduplicatedAvatar = '/sabbir_avatar.jpeg';
      } else {
        cumulativeAvatarBytes += deduplicatedAvatar.length;
      }
    }

    return {
      id: sanitizeDocId(m?.id || `member-${Date.now()}`),
      name: safeNonEmptyStr(m?.name, 200, 'Sabbir Ahamed'),
      nameBn: safeStr(m?.nameBn, 200, 'সাব্বির আহমেদ'),
      role: safeNonEmptyStr(m?.role, 200, 'SQA Engineer'),
      roleBn: safeStr(m?.roleBn, 200, ''),
      department: safeStr(m?.department, 200, 'Manual & automation Test'),
      departmentBn: safeStr(m?.departmentBn, 200, ''),
      phone: safeStr(m?.phone, 100, '+8801681387906'),
      email: safeStr(m?.email, 200, 'sabbircse72@gmail.com'),
      avatar: deduplicatedAvatar,
      verifiedId: safeStr(m?.verifiedId, 100, ''),
    };
  });
}

function sanitizeSkillsList(skills: Skill[] | undefined) {
  if (!Array.isArray(skills)) return [];
  return skills.slice(0, 50).map((s) => ({
    category: safeNonEmptyStr(s?.category, 150, 'General QA'),
    items: sanitizeStringArray(s?.items, 60, 120),
  }));
}

function sanitizeReferencesList(refs: Reference[] | undefined) {
  if (!Array.isArray(refs)) return [];
  return refs.slice(0, 50).map((r) => ({
    id: sanitizeDocId(r?.id || `ref-${Date.now()}`),
    name: safeStr(r?.name, 200),
    role: safeStr(r?.role, 200),
    company: safeStr(r?.company, 200),
    email: safeStr(r?.email, 200),
    phone: safeStr(r?.phone, 100),
    endorsement: safeStr(r?.endorsement, 2000),
    updatedAt: safeNonEmptyStr(r?.updatedAt, 64, new Date().toISOString()),
  }));
}

const SYS_EXT_META_ID = '__sys_portfolio_ext_v1__';

function sanitizeRoadmapList(items: CareerRoadmapItem[] | undefined) {
  if (!Array.isArray(items)) return [];
  const validStatuses = ['completed', 'active', 'future', 'vision'] as const;
  return items
    .filter((item) => item && item.id !== SYS_EXT_META_ID)
    .slice(0, 45)
    .map((item) => {
      const status = validStatuses.includes(item?.status as (typeof validStatuses)[number])
        ? item.status
        : 'future';
      return {
        id: sanitizeDocId(item?.id || `road-${Date.now()}`),
        title: safeNonEmptyStr(item?.title, 250, 'Milestone'),
        status,
        badge: safeStr(item?.badge, 100),
        updatedAt: safeNonEmptyStr(item?.updatedAt, 64, new Date().toISOString()),
      };
    });
}

function sanitizeProjectMutableFields(project: Project, orderIndex: number) {
  const validTypes = ['Manual', 'Automation', 'API', 'Performance'] as const;
  const resolvedType = validTypes.includes(project.type) ? project.type : 'Automation';
  const clampedOrder = Math.max(0, Math.min(10000, Math.floor(orderIndex)));

  const metrics = Array.isArray(project.metrics)
    ? project.metrics.slice(0, 30).map((m) => ({
        label: safeStr(m?.label, 120),
        value: safeStr(m?.value, 120),
      }))
    : [];

  const assertions = Array.isArray(project.assertions)
    ? project.assertions.slice(0, 60).map((a) => ({
        name: safeStr(a?.name, 250),
        status: a?.status === 'FAIL' ? 'FAIL' : 'PASS',
        duration: safeStr(a?.duration, 64),
      }))
    : [];

  const logs = Array.isArray(project.logs)
    ? project.logs.slice(0, 100).map((l) => ({
        timestamp: safeStr(l?.timestamp, 64),
        level: ['INFO', 'PASS', 'FAIL', 'WARN'].includes(l?.level) ? l.level : 'INFO',
        message: safeStr(l?.message, 500),
      }))
    : [];

  return {
    visibility: 'public' as const,
    orderIndex: clampedOrder,
    title: safeNonEmptyStr(project.title, 300, 'Untitled SQA Project'),
    type: resolvedType,
    description: safeStr(project.description, 10000),
    metrics,
    assertions,
    logs,
    tags: sanitizeStringArray(project.tags, 40, 100),
    link: safeStr(project.link, 2048),
    image: safeStr(project.image, 750000),
    updatedAtIso: safeNonEmptyStr(project.updatedAt, 64, new Date().toISOString()),
  };
}

function sanitizeExperienceMutableFields(exp: Experience, orderIndex: number) {
  const clampedOrder = Math.max(0, Math.min(10000, Math.floor(orderIndex)));
  return {
    visibility: 'public' as const,
    orderIndex: clampedOrder,
    role: safeNonEmptyStr(exp.role, 200, 'SQA Engineer'),
    company: safeNonEmptyStr(exp.company, 200, 'Organization'),
    period: safeStr(exp.period, 120),
    location: safeStr(exp.location, 200),
    highlights: sanitizeStringArray(exp.highlights, 50, 2000),
    updatedAtIso: safeNonEmptyStr(exp.updatedAt, 64, new Date().toISOString()),
  };
}

function sanitizeBlogMutableFields(blog: BlogPost, orderIndex: number) {
  const clampedOrder = Math.max(0, Math.min(10000, Math.floor(orderIndex)));
  const authorName = safeNonEmptyStr(blog.author?.name, 200, 'Sabbir Ahamed');
  const rawAvatar = safeStr(blog.author?.avatar, 120000, '/sabbir_avatar.jpeg');
  const cleanAuthorAvatar =
    rawAvatar.startsWith('data:image/') && authorName.toLowerCase().includes('sabbir')
      ? '/sabbir_avatar.jpeg'
      : rawAvatar.slice(0, 120000);

  return {
    orderIndex: clampedOrder,
    title: safeNonEmptyStr(blog.title, 400, 'Untitled Article'),
    slug: safeNonEmptyStr(blog.slug, 250, `article-${Date.now()}`),
    category: safeNonEmptyStr(blog.category, 120, 'Software Testing'),
    description: safeStr(blog.description, 5000),
    content: safeStr(blog.content, 200000),
    coverImage: safeStr(
      blog.coverImage,
      550000,
      'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200'
    ),
    publishDate: safeStr(blog.publishDate, 100),
    readingTime: safeStr(blog.readingTime, 64, '5 min read'),
    tags: sanitizeStringArray(blog.tags, 40, 100),
    featured: Boolean(blog.featured),
    status: blog.status === 'Draft' ? ('Draft' as const) : ('Published' as const),
    author: {
      name: authorName,
      role: safeStr(blog.author?.role, 250, 'Software Quality Assurance Engineer'),
      avatar: cleanAuthorAvatar,
      bio: safeStr(
        blog.author?.bio,
        2000,
        'SQA Engineer specializing in Manual & Automated Testing, API Validation, ERPNext QA, and CI/CD Quality Gates.'
      ),
    },
    updatedAtIso: safeNonEmptyStr(blog.updatedAt, 64, new Date().toISOString()),
  };
}

// ------------------------------------------------------------------------
// Cloud Document Deserializers
// ------------------------------------------------------------------------

function parseCloudMetaDoc(d: Record<string, unknown>): CloudPortfolioSnapshotPayload['meta'] {
  const rawRoadmap = Array.isArray(d.careerRoadmap)
    ? (d.careerRoadmap as Record<string, unknown>[])
    : undefined;

  const extEntry = rawRoadmap?.find(
    (entry) => entry && (entry.id === SYS_EXT_META_ID || entry._sysExt === true)
  );

  const cleanCareerRoadmap = rawRoadmap
    ? (rawRoadmap.filter(
        (entry) => entry && entry.id !== SYS_EXT_META_ID && entry._sysExt !== true
      ) as unknown as CareerRoadmapItem[])
    : undefined;

  const extSource = extEntry || d;

  return {
    profile: d.profile as ProfileData,
    skills: Array.isArray(d.skills) ? (d.skills as Skill[]) : undefined,
    references: Array.isArray(d.references) ? (d.references as Reference[]) : undefined,
    careerRoadmap: cleanCareerRoadmap,
    blogCategories: Array.isArray(d.blogCategories) ? (d.blogCategories as string[]) : undefined,
    deletedProjectIds: Array.isArray(d.deletedProjectIds) ? (d.deletedProjectIds as string[]) : [],
    deletedExperienceIds: Array.isArray(d.deletedExperienceIds)
      ? (d.deletedExperienceIds as string[])
      : [],
    deletedBlogIds: Array.isArray(d.deletedBlogIds) ? (d.deletedBlogIds as string[]) : [],
    deletedReferenceIds: Array.isArray(extSource.deletedReferenceIds)
      ? (extSource.deletedReferenceIds as string[])
      : [],
    deletedRoadmapIds: Array.isArray(extSource.deletedRoadmapIds)
      ? (extSource.deletedRoadmapIds as string[])
      : [],
    themeId:
      typeof extSource.themeId === 'string' && extSource.themeId.trim()
        ? extSource.themeId.trim()
        : undefined,
    vcardConfig:
      extSource.vcardConfig && typeof extSource.vcardConfig === 'object'
        ? (extSource.vcardConfig as Partial<VisitingCardConfig>)
        : undefined,
    vcardPrivacy:
      extSource.vcardPrivacy && typeof extSource.vcardPrivacy === 'object'
        ? (extSource.vcardPrivacy as Partial<PrivacySettings>)
        : undefined,
    vcardTeam: Array.isArray(extSource.vcardTeam)
      ? (extSource.vcardTeam as TeamMemberCard[])
      : undefined,
    lastModified: typeof d.lastModifiedIso === 'string' ? d.lastModifiedIso : undefined,
  };
}

function docToProject(raw: Record<string, unknown>): Project & { _orderIndex: number } {
  return {
    id: String(raw.id || ''),
    title: String(raw.title || ''),
    type: (['Manual', 'Automation', 'API', 'Performance'].includes(String(raw.type))
      ? raw.type
      : 'Automation') as Project['type'],
    description: String(raw.description || ''),
    metrics: Array.isArray(raw.metrics) ? (raw.metrics as Project['metrics']) : [],
    assertions: Array.isArray(raw.assertions) ? (raw.assertions as Project['assertions']) : [],
    logs: Array.isArray(raw.logs) ? (raw.logs as Project['logs']) : [],
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    link: raw.link ? String(raw.link) : undefined,
    image: raw.image ? String(raw.image) : undefined,
    updatedAt: String(raw.updatedAtIso || ''),
    _orderIndex: typeof raw.orderIndex === 'number' ? raw.orderIndex : 9999,
  };
}

function docToExperience(raw: Record<string, unknown>): Experience & { _orderIndex: number } {
  return {
    id: String(raw.id || ''),
    role: String(raw.role || ''),
    company: String(raw.company || ''),
    period: String(raw.period || ''),
    location: String(raw.location || ''),
    highlights: Array.isArray(raw.highlights) ? (raw.highlights as string[]) : [],
    updatedAt: String(raw.updatedAtIso || ''),
    _orderIndex: typeof raw.orderIndex === 'number' ? raw.orderIndex : 9999,
  };
}

function docToBlog(raw: Record<string, unknown>): BlogPost & { _orderIndex: number } {
  const authorObj = (raw.author && typeof raw.author === 'object' ? raw.author : {}) as Record<
    string,
    unknown
  >;
  return {
    id: String(raw.id || ''),
    title: String(raw.title || ''),
    slug: String(raw.slug || ''),
    category: String(raw.category || 'Software Testing'),
    description: String(raw.description || ''),
    content: String(raw.content || ''),
    coverImage: String(raw.coverImage || ''),
    publishDate: String(raw.publishDate || ''),
    readingTime: String(raw.readingTime || '5 min read'),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    featured: Boolean(raw.featured),
    status: raw.status === 'Draft' ? 'Draft' : 'Published',
    updatedAt: String(raw.updatedAtIso || ''),
    author: {
      name: String(authorObj.name || 'Sabbir Ahamed'),
      role: String(authorObj.role || 'Software Quality Assurance Engineer'),
      avatar: String(authorObj.avatar || '/sabbir_avatar.jpeg'),
      bio: String(authorObj.bio || ''),
    },
    _orderIndex: typeof raw.orderIndex === 'number' ? raw.orderIndex : 9999,
  };
}

// ------------------------------------------------------------------------
// Core Create-or-Update Helper (Immutable Field Safe)
// ------------------------------------------------------------------------

interface ExistingServerDocState {
  exists: boolean;
  hasValidTimestampCreatedAt: boolean;
  createdAt?: unknown;
  authorUid?: string;
}

function extractExistingDocState(
  exists: boolean,
  rawData: Record<string, unknown> | undefined
): ExistingServerDocState {
  if (!exists || !rawData) {
    return { exists: false, hasValidTimestampCreatedAt: false };
  }
  const maybeCreated = rawData.createdAt as { toMillis?: unknown } | undefined;
  const hasValidTimestampCreatedAt = Boolean(
    maybeCreated && typeof maybeCreated.toMillis === 'function'
  );
  const rawAuthor = rawData.authorUid;
  const authorUid =
    typeof rawAuthor === 'string' && rawAuthor.trim().length >= 1 && rawAuthor.length <= 128
      ? rawAuthor
      : undefined;

  return {
    exists: true,
    hasValidTimestampCreatedAt,
    createdAt: hasValidTimestampCreatedAt ? rawData.createdAt : undefined,
    authorUid,
  };
}

async function fetchExistingServerDocState(
  docRef: ReturnType<typeof doc>,
  path: string
): Promise<ExistingServerDocState> {
  try {
    const serverSnap = await getDocFromServer(docRef);
    return extractExistingDocState(
      serverSnap.exists(),
      serverSnap.data() as Record<string, unknown> | undefined
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.GET, path);
    }
    try {
      const cachedSnap = await getDoc(docRef);
      return extractExistingDocState(
        cachedSnap.exists(),
        cachedSnap.data() as Record<string, unknown> | undefined
      );
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, OperationType.GET, path);
    }
  }
}

async function upsertProtectedDocument(
  collectionName: string,
  docId: string,
  mutableData: Record<string, unknown>
): Promise<void> {
  const cleanId = sanitizeDocId(docId);
  const path = `${collectionName}/${cleanId}`;

  return enqueuePathWrite(path, async () => {
    const user = auth.currentUser;
    if (!isAdminAuthenticated() || !isVerifiedFirebaseOwner(user) || !hasFreshOwnerAuthToken(user) || !user) {
      return;
    }

    const docRef = doc(db, collectionName, cleanId);
    const existingState = await fetchExistingServerDocState(docRef, path);

    if (existingState.exists) {
      try {
        await updateDoc(docRef, {
          ...mutableData,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    } else {
      try {
        await setDoc(docRef, {
          id: cleanId,
          ...mutableData,
          authorUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (createError) {
        const retryState = await fetchExistingServerDocState(docRef, path);
        if (retryState.exists) {
          try {
            await updateDoc(docRef, {
              ...mutableData,
              updatedAt: serverTimestamp(),
            });
            return;
          } catch (retryError) {
            handleFirestoreError(retryError, OperationType.UPDATE, path);
          }
        }
        handleFirestoreError(createError, OperationType.CREATE, path);
      }
    }
  });
}

async function deleteProtectedDocument(collectionName: string, docId: string): Promise<void> {
  const cleanId = sanitizeDocId(docId);
  const path = `${collectionName}/${cleanId}`;

  return enqueuePathWrite(path, async () => {
    const user = auth.currentUser;
    if (!isAdminAuthenticated() || !isVerifiedFirebaseOwner(user) || !hasFreshOwnerAuthToken(user)) {
      return;
    }

    try {
      await deleteDoc(doc(db, collectionName, cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  });
}

// ------------------------------------------------------------------------
// Granular Cloud Writers Called Automatically on Every Save/Edit
// ------------------------------------------------------------------------

export async function pushPortfolioMetaToCloud(
  data: PortfolioData,
  blogCategories?: string[]
): Promise<void> {
  if (isApplyingSnapshot || !canAdminWriteToCloud()) return;

  const resolvedCats =
    blogCategories ?? data.blogCategories ?? (bridge ? bridge.getBlogCategories() : []);
  const sanitizedProfile = sanitizeProfileMap(data.profile);
  const cleanRoadmap = sanitizeRoadmapList(data.careerRoadmap);

  // Embed extended portfolio settings inside a dedicated native map entry within
  // careerRoadmap (bounded <= 50 maps) so top-level portfolio_meta/main keys
  // remain 100% within the strict 14-key allowlist of deployed Firestore rules.
  const extEnvelope = {
    id: SYS_EXT_META_ID,
    _sysExt: true,
    deletedReferenceIds: sanitizeStringArray(data.deletedReferenceIds, 500, 128).map(sanitizeDocId),
    deletedRoadmapIds: sanitizeStringArray(data.deletedRoadmapIds, 500, 128).map(sanitizeDocId),
    themeId: safeNonEmptyStr(data.themeId, 64, 'cyber-cyan'),
    vcardConfig: sanitizeVCardConfigMap(data.vcardConfig),
    vcardPrivacy: sanitizeVCardPrivacyMap(data.vcardPrivacy),
    vcardTeam: sanitizeVCardTeamList(data.vcardTeam, sanitizedProfile.avatar),
  };

  const mutableMeta = {
    isPublic: true,
    profile: sanitizedProfile,
    skills: sanitizeSkillsList(data.skills),
    references: sanitizeReferencesList(data.references),
    careerRoadmap: [...cleanRoadmap, extEnvelope],
    blogCategories: sanitizeStringArray(resolvedCats, 100, 120),
    deletedProjectIds: sanitizeStringArray(data.deletedProjectIds, 500, 128).map(sanitizeDocId),
    deletedExperienceIds: sanitizeStringArray(data.deletedExperienceIds, 500, 128).map(
      sanitizeDocId
    ),
    deletedBlogIds: sanitizeStringArray(data.deletedBlogIds, 500, 128).map(sanitizeDocId),
    lastModifiedIso: safeNonEmptyStr(data.lastModified, 64, new Date().toISOString()),
  };

  await upsertProtectedDocument('portfolio_meta', 'main', mutableMeta);
  markGranularWriteSyncedIfIdle();
}

export async function pushProjectToCloud(project: Project, orderIndex = 0): Promise<void> {
  if (isApplyingSnapshot || !canAdminWriteToCloud()) return;
  const cleanId = sanitizeDocId(project.id);
  const mutable = sanitizeProjectMutableFields({ ...project, id: cleanId }, orderIndex);
  await upsertProtectedDocument('projects', cleanId, mutable);
  markGranularWriteSyncedIfIdle();
}

export async function pushAllProjectsToCloud(projects: Project[]): Promise<void> {
  if (isApplyingSnapshot || !canAdminWriteToCloud()) return;
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const cleanId = sanitizeDocId(p.id);
    const mutable = sanitizeProjectMutableFields({ ...p, id: cleanId }, i);
    await upsertProtectedDocument('projects', cleanId, mutable);
  }
  emitStatus({ cloudProjectsCount: projects.length });
  markGranularWriteSyncedIfIdle();
}

export async function deleteProjectFromCloud(projectId: string): Promise<void> {
  if (isApplyingSnapshot || !canAdminWriteToCloud()) return;
  await deleteProtectedDocument('projects', projectId);
  markGranularWriteSyncedIfIdle();
}

export async function pushExperienceToCloud(exp: Experience, orderIndex = 0): Promise<void> {
  if (isApplyingSnapshot || !canAdminWriteToCloud()) return;
  const cleanId = sanitizeDocId(exp.id);
  const mutable = sanitizeExperienceMutableFields({ ...exp, id: cleanId }, orderIndex);
  await upsertProtectedDocument('experiences', cleanId, mutable);
  markGranularWriteSyncedIfIdle();
}

export async function pushAllExperiencesToCloud(experiences: Experience[]): Promise<void> {
  if (isApplyingSnapshot || !canAdminWriteToCloud()) return;
  for (let i = 0; i < experiences.length; i++) {
    const e = experiences[i];
    const cleanId = sanitizeDocId(e.id);
    const mutable = sanitizeExperienceMutableFields({ ...e, id: cleanId }, i);
    await upsertProtectedDocument('experiences', cleanId, mutable);
  }
  markGranularWriteSyncedIfIdle();
}

export async function deleteExperienceFromCloud(expId: string): Promise<void> {
  if (isApplyingSnapshot || !canAdminWriteToCloud()) return;
  await deleteProtectedDocument('experiences', expId);
  markGranularWriteSyncedIfIdle();
}

export async function pushBlogToCloud(blog: BlogPost, orderIndex = 0): Promise<void> {
  if (isApplyingSnapshot || !canAdminWriteToCloud()) return;
  const cleanId = sanitizeDocId(blog.id);
  const mutable = sanitizeBlogMutableFields({ ...blog, id: cleanId }, orderIndex);
  await upsertProtectedDocument('blogs', cleanId, mutable);
  markGranularWriteSyncedIfIdle();
}

export async function pushAllBlogsToCloud(blogs: BlogPost[]): Promise<void> {
  if (isApplyingSnapshot || !canAdminWriteToCloud()) return;
  for (let i = 0; i < blogs.length; i++) {
    const b = blogs[i];
    const cleanId = sanitizeDocId(b.id);
    const mutable = sanitizeBlogMutableFields({ ...b, id: cleanId }, i);
    await upsertProtectedDocument('blogs', cleanId, mutable);
  }
  emitStatus({ cloudBlogsCount: blogs.length });
  markGranularWriteSyncedIfIdle();
}

export async function deleteBlogFromCloud(blogId: string): Promise<void> {
  if (isApplyingSnapshot || !canAdminWriteToCloud()) return;
  await deleteProtectedDocument('blogs', blogId);
  markGranularWriteSyncedIfIdle();
}

// ------------------------------------------------------------------------
// Full Non-Destructive Two-Way Cloud Backup & Auto-Save Sync
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
    return { success: false, projectsSynced: 0, blogsSynced: 0, error: 'Cloud bridge not ready.' };
  }
  if (!isVerifiedFirebaseOwner(auth.currentUser) || !hasFreshOwnerAuthToken(auth.currentUser)) {
    if (auth.currentUser && !hasFreshOwnerAuthToken(auth.currentUser)) {
      await purgeExpiredRuntimeAuthSession();
      emitStatus({ isOwnerConnected: false, ownerEmail: null });
    }
    return {
      success: false,
      projectsSynced: 0,
      blogsSynced: 0,
      error: `ক্লাউড অটো-সেভ চালু করতে একবার "${PRIMARY_OWNER_EMAIL}" দিয়ে কানেক্ট করুন।`,
    };
  }

  activeFullSyncPromise = (async (): Promise<FullSyncResult> => {
    emitStatus({ isSyncing: true, error: null });

    try {
      // Step 1: Pull latest cloud documents first and merge non-destructively so zero cloud data is ever lost!
      await pullCloudSnapshotOnce();

      // Step 2: Read the freshly merged complete local state (Projects, Blogs, Story, Roadmap, References, Skills, Profile, VCard, Theme)
      const portfolio = bridge.getPortfolioData();
      const blogs = bridge.getBlogs();
      const categories = bridge.getBlogCategories();

      const deletedProjSet = new Set((portfolio.deletedProjectIds || []).map(sanitizeDocId));
      const deletedExpSet = new Set((portfolio.deletedExperienceIds || []).map(sanitizeDocId));
      const deletedBlogSet = new Set((portfolio.deletedBlogIds || []).map(sanitizeDocId));

      // Step 3: Push complete metadata (Profile, Skills, References, Roadmap, Blog Categories, Visiting Card, Theme)
      await pushPortfolioMetaToCloud(portfolio, categories);

      // Step 4: Push all active projects & remove tombstoned docs
      const activeProjects = portfolio.projects.filter(
        (p) => !deletedProjSet.has(sanitizeDocId(p.id))
      );
      await pushAllProjectsToCloud(activeProjects);
      for (const delId of deletedProjSet) {
        await deleteProtectedDocument('projects', delId);
      }

      // Step 5: Push all active experiences (stories) & remove tombstoned docs
      const activeExperiences = portfolio.experiences.filter(
        (e) => !deletedExpSet.has(sanitizeDocId(e.id))
      );
      await pushAllExperiencesToCloud(activeExperiences);
      for (const delId of deletedExpSet) {
        await deleteProtectedDocument('experiences', delId);
      }

      // Step 6: Push all active blogs & remove tombstoned docs
      const activeBlogs = blogs.filter((b) => !deletedBlogSet.has(sanitizeDocId(b.id)));
      await pushAllBlogsToCloud(activeBlogs);
      for (const delId of deletedBlogSet) {
        await deleteProtectedDocument('blogs', delId);
      }

      clearLocalUnsyncedEdits();
      const nowIso = new Date().toISOString();
      emitStatus({
        isSyncing: false,
        hasUnsyncedChanges: false,
        lastSyncedAt: nowIso,
        cloudProjectsCount: activeProjects.length,
        cloudBlogsCount: activeBlogs.length,
        error: null,
      });

      return {
        success: true,
        projectsSynced: activeProjects.length,
        blogsSynced: activeBlogs.length,
      };
    } catch (err) {
      if (isTokenServiceDisabledError(err)) {
        await purgeExpiredRuntimeAuthSession();
        const reconnectMsg =
          'পূর্বের Google সেশনের মেয়াদ শেষ হয়েছে। আপনার সব ডাটা ব্রাউজারে সেভ আছে—ক্লাউডে পাঠাতে একবার রিকানেক্ট করুন।';
        emitStatus({
          isSyncing: false,
          isOwnerConnected: false,
          ownerEmail: null,
          error: reconnectMsg,
        });
        return { success: false, projectsSynced: 0, blogsSynced: 0, error: reconnectMsg };
      }
      const msg = err instanceof Error ? err.message : 'Cloud synchronization failed.';
      emitStatus({ isSyncing: false, error: msg });
      return { success: false, projectsSynced: 0, blogsSynced: 0, error: msg };
    } finally {
      activeFullSyncPromise = null;
    }
  })();

  return activeFullSyncPromise;
}

// ------------------------------------------------------------------------
// Google Owner Sign-In / Sign-Out Actions
// ------------------------------------------------------------------------

export function formatMobileAwareAuthError(err: unknown): {
  code: string;
  message: string;
  canUseSameTabRedirect: boolean;
} {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const rawMsg = err instanceof Error ? err.message : String(err);
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const inWebView = isEmbeddedInAppWebView();
  const topLevel = isTopLevelBrowserWindow();
  const isMobile = isMobileBrowserDevice();

  if (inWebView) {
    return {
      code: code || 'auth/webview-unsupported',
      message:
        'Messenger / WhatsApp ইন-অ্যাপ ব্রাউজারে Google Sign-In বন্ধ থাকে। অনুগ্রহ করে উপরের মেনু থেকে "Open in Chrome / Safari" করে কানেক্ট করুন।',
      canUseSameTabRedirect: false,
    };
  }

  if (code.includes('unauthorized-domain') || rawMsg.includes('unauthorized-domain')) {
    return {
      code: 'auth/unauthorized-domain',
      message: `চিন্তার কিছু নেই—আপনার সব ডাটা এই ব্রাউজারে অটোমেটিক সেভ আছে। এই ডোমেইনে (${host}) গুগল অটো-সেভ চালু করতে নিচের ডোমেইনটি কপি করে Firebase Authorized Domains-এ একবার যোগ করুন।`,
      canUseSameTabRedirect: false,
    };
  }

  if (
    code.includes('popup-blocked') ||
    rawMsg.includes('popup-blocked') ||
    code.includes('operation-not-supported')
  ) {
    return {
      code: code || 'auth/popup-blocked',
      message: topLevel
        ? 'ব্রাউজারে পপআপ ব্লক হয়েছে। নিচের "মোবাইল ডাইরেক্ট কানেক্ট (Same-Tab)" বাটনে ট্যাপ করুন।'
        : 'প্রিভিউ আইফ্রেমে পপআপ ব্লক হয়েছে। ব্রাউজার সেটিংস থেকে Pop-ups চালু করুন অথবা সরাসরি নতুন ট্যাবে ওপেন করুন।',
      canUseSameTabRedirect: topLevel,
    };
  }

  if (
    code.includes('popup-closed-by-user') ||
    code.includes('cancelled-popup-request') ||
    rawMsg.includes('popup-closed-by-user') ||
    rawMsg.includes('cancelled-popup-request')
  ) {
    return {
      code: code || 'auth/popup-closed-by-user',
      message:
        isMobile && topLevel
          ? 'পপআপটি বন্ধ হয়ে গেছে। নিচের "মোবাইল ডাইরেক্ট কানেক্ট (Same-Tab)" বাটন ব্যবহার করলে একই ট্যাবে সহজে কানেক্ট হবে।'
          : 'Google সাইন-ইন পপআপটি সম্পন্ন হওয়ার আগেই বন্ধ হয়ে গেছে। আবার চেষ্টা করুন।',
      canUseSameTabRedirect: topLevel,
    };
  }

  if (code.includes('network-request-failed') || rawMsg.includes('network-request-failed')) {
    return {
      code: 'auth/network-request-failed',
      message: 'ইন্টারনেট সংযোগ সমস্যার কারণে কানেক্ট হয়নি। আপনার সব এডিট ডিভাইসে সেভ আছে—আবার চেষ্টা করুন।',
      canUseSameTabRedirect: topLevel && isMobile,
    };
  }

  return {
    code: code || 'auth/unknown',
    message: `Google কানেকশন সম্পন্ন হয়নি${code ? ` (${code})` : ''}। অনুগ্রহ করে আবার চেষ্টা করুন।`,
    canUseSameTabRedirect: topLevel && isMobile,
  };
}

export async function signInOwnerWithGoogleRedirect(
  preferredEmail: string = PRIMARY_OWNER_EMAIL,
  forceAccountSelect = false
): Promise<{ success: boolean; redirecting?: boolean; error?: string; errorCode?: string }> {
  if (!isAdminAuthenticated()) {
    return {
      success: false,
      error: 'আগে System Password দিয়ে Admin Panel আনলক করুন।',
    };
  }

  if (!isTopLevelBrowserWindow()) {
    return {
      success: false,
      error:
        'প্রিভিউ আইফ্রেমের ভেতরে Same-Tab Redirect করা যায় না। ডাইরেক্ট লিংকটি কপি করে ব্রাউজারে ওপেন করুন।',
    };
  }

  try {
    startAdminOAuthGracePeriod();
    const provider = createOwnerGoogleProvider(preferredEmail, forceAccountSelect);
    await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
    return { success: true, redirecting: true };
  } catch (err) {
    clearAdminOAuthGracePeriod();
    const formatted = formatMobileAwareAuthError(err);
    emitStatus({ error: formatted.message });
    return { success: false, errorCode: formatted.code, error: formatted.message };
  }
}

export async function signInOwnerWithGoogle(
  preferredEmail: string = PRIMARY_OWNER_EMAIL,
  forceAccountSelect = false
): Promise<{
  success: boolean;
  email?: string;
  redirecting?: boolean;
  error?: string;
  errorCode?: string;
}> {
  if (!isAdminAuthenticated()) {
    return {
      success: false,
      error: 'আগে System Password দিয়ে Admin Panel আনলক করুন।',
    };
  }

  // Synchronous localStorage mark BEFORE signInWithPopup preserves mobile hardware tap gesture!
  startAdminOAuthGracePeriod();
  const provider = createOwnerGoogleProvider(preferredEmail, forceAccountSelect);

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
        error: `"${wrongEmail}" অনুমোদিত নয়। শুধুমাত্র "${PRIMARY_OWNER_EMAIL}" ইমেইল দিয়ে কানেক্ট করুন।`,
      };
    }

    recordAdminActivity();
    clearAdminOAuthGracePeriod();
    emitStatus({
      isOwnerConnected: true,
      ownerEmail: user.email || null,
      error: null,
    });

    // Trigger full two-way auto-save sync immediately upon login
    void syncAllLocalDataToCloud();

    return { success: true, email: user.email || undefined };
  } catch (err) {
    if (isTokenServiceDisabledError(err)) {
      await purgeExpiredRuntimeAuthSession();
    }
    const formatted = formatMobileAwareAuthError(err);

    // Automatic seamless fallback to same-tab redirect on mobile when popup is blocked by OS/browser (on authorized domains)
    if (
      isMobileBrowserDevice() &&
      isTopLevelBrowserWindow() &&
      !isEmbeddedInAppWebView() &&
      isCurrentHostFirebaseAuthorized() &&
      (formatted.code.includes('popup-blocked') ||
        formatted.code.includes('operation-not-supported') ||
        formatted.code.includes('web-storage-unsupported'))
    ) {
      try {
        startAdminOAuthGracePeriod();
        await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
        return { success: true, redirecting: true };
      } catch (redirectErr) {
        clearAdminOAuthGracePeriod();
        const redirectFormatted = formatMobileAwareAuthError(redirectErr);
        return {
          success: false,
          errorCode: redirectFormatted.code,
          error: redirectFormatted.message,
        };
      }
    }

    clearAdminOAuthGracePeriod();
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
      isOwnerConnected: false,
      ownerEmail: null,
    });
  }
}

// ------------------------------------------------------------------------
// Real-Time Cloud Listeners (Visitors + Authenticated Owner)
// ------------------------------------------------------------------------

function notifyBridgeSnapshot(): void {
  if (!bridge) return;
  if (!latestCloudMeta && !latestCloudProjects && !latestCloudExperiences && !latestCloudBlogs) {
    return;
  }
  isApplyingSnapshot = true;
  try {
    bridge.onCloudSnapshot({
      meta: latestCloudMeta,
      projects: latestCloudProjects,
      experiences: latestCloudExperiences,
      blogs: latestCloudBlogs,
    });
  } finally {
    isApplyingSnapshot = false;
  }
}

async function pullCloudSnapshotOnce(): Promise<void> {
  // 1. portfolio_meta/main (read via unauthenticated publicDb so reads never block on Auth tokens)
  try {
    const metaSnap = await getDoc(doc(publicDb, 'portfolio_meta', 'main'));
    if (metaSnap.exists()) {
      latestCloudMeta = parseCloudMetaDoc(metaSnap.data() as Record<string, unknown>);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'portfolio_meta/main');
  }

  // 2. projects
  try {
    const projQuery = query(collection(publicDb, 'projects'), where('visibility', '==', 'public'));
    const projSnap = await getDocs(projQuery);
    const parsedProjects = projSnap.docs
      .map((docItem) => docToProject(docItem.data() as Record<string, unknown>))
      .sort((a, b) => a._orderIndex - b._orderIndex)
      .map(({ _orderIndex: _, ...rest }) => rest);
    if (parsedProjects.length > 0) {
      latestCloudProjects = parsedProjects;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'projects');
  }

  // 3. experiences
  try {
    const expQuery = query(collection(publicDb, 'experiences'), where('visibility', '==', 'public'));
    const expSnap = await getDocs(expQuery);
    const parsedExp = expSnap.docs
      .map((docItem) => docToExperience(docItem.data() as Record<string, unknown>))
      .sort((a, b) => a._orderIndex - b._orderIndex)
      .map(({ _orderIndex: _, ...rest }) => rest);
    if (parsedExp.length > 0) {
      latestCloudExperiences = parsedExp;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'experiences');
  }

  // 4. blogs
  try {
    const ownerSignedIn = canAdminWriteToCloud();
    const blogQuery = ownerSignedIn
      ? collection(db, 'blogs')
      : query(collection(publicDb, 'blogs'), where('status', '==', 'Published'));
    const blogSnap = await getDocs(blogQuery);
    const parsedBlogs = blogSnap.docs
      .map((docItem) => docToBlog(docItem.data() as Record<string, unknown>))
      .sort((a, b) => a._orderIndex - b._orderIndex)
      .map(({ _orderIndex: _, ...rest }) => rest);
    if (parsedBlogs.length > 0) {
      latestCloudBlogs = parsedBlogs;
    }
  } catch (error) {
    if (isTokenServiceDisabledError(error)) {
      await purgeExpiredRuntimeAuthSession();
    } else {
      handleFirestoreError(error, OperationType.LIST, 'blogs');
    }
  }

  notifyBridgeSnapshot();
}

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

  void refreshKnownAuthorizedDomains();

  // Keep status synchronized with local unsynced queue changes
  window.addEventListener(UNSYNCED_EDITS_CHANGED_EVENT, () => {
    emitStatus({ hasUnsyncedChanges: hasLocalUnsyncedEdits() });
  });

  // Automatically flush any queued local edits when internet reconnects
  window.addEventListener('online', () => {
    if (canAdminWriteToCloud() && hasLocalUnsyncedEdits()) {
      void syncAllLocalDataToCloud();
    }
  });

  let unsubBlogs: Unsubscribe | null = null;

  // 1. Real-time portfolio_meta/main listener via isolated publicDb
  onSnapshot(
    doc(publicDb, 'portfolio_meta', 'main'),
    (snap) => {
      if (!snap.exists()) return;
      latestCloudMeta = parseCloudMetaDoc(snap.data() as Record<string, unknown>);
      notifyBridgeSnapshot();
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'portfolio_meta/main');
    }
  );

  // 2. Real-time projects listener via isolated publicDb
  onSnapshot(
    query(collection(publicDb, 'projects'), where('visibility', '==', 'public')),
    (snap) => {
      const parsedProjects = snap.docs
        .map((docItem) => docToProject(docItem.data() as Record<string, unknown>))
        .sort((a, b) => a._orderIndex - b._orderIndex)
        .map(({ _orderIndex: _, ...rest }) => rest);

      emitStatus({ cloudProjectsCount: parsedProjects.length });
      if (parsedProjects.length > 0) {
        latestCloudProjects = parsedProjects;
        notifyBridgeSnapshot();
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    }
  );

  // 3. Real-time experiences listener via isolated publicDb
  onSnapshot(
    query(collection(publicDb, 'experiences'), where('visibility', '==', 'public')),
    (snap) => {
      const parsedExp = snap.docs
        .map((docItem) => docToExperience(docItem.data() as Record<string, unknown>))
        .sort((a, b) => a._orderIndex - b._orderIndex)
        .map(({ _orderIndex: _, ...rest }) => rest);

      if (parsedExp.length > 0) {
        latestCloudExperiences = parsedExp;
        notifyBridgeSnapshot();
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'experiences');
    }
  );

  const attachBlogsListener = (ownerSignedInWithFreshToken: boolean) => {
    if (unsubBlogs) {
      unsubBlogs();
      unsubBlogs = null;
    }
    const blogQuery = ownerSignedInWithFreshToken
      ? collection(db, 'blogs')
      : query(collection(publicDb, 'blogs'), where('status', '==', 'Published'));

    unsubBlogs = onSnapshot(
      blogQuery,
      (snap) => {
        const parsedBlogs = snap.docs
          .map((docItem) => docToBlog(docItem.data() as Record<string, unknown>))
          .sort((a, b) => a._orderIndex - b._orderIndex)
          .map(({ _orderIndex: _, ...rest }) => rest);

        emitStatus({ cloudBlogsCount: parsedBlogs.length });
        if (parsedBlogs.length > 0) {
          latestCloudBlogs = parsedBlogs;
          notifyBridgeSnapshot();
        }
      },
      (error) => {
        if (ownerSignedInWithFreshToken && isTokenServiceDisabledError(error)) {
          void purgeExpiredRuntimeAuthSession();
          emitStatus({ isOwnerConnected: false, ownerEmail: null });
          attachBlogsListener(false);
          return;
        }
        handleFirestoreError(error, OperationType.LIST, 'blogs');
      }
    );
  };

  attachBlogsListener(canAdminWriteToCloud());

  // Complete any returning mobile same-tab Google OAuth redirect cleanly
  getRedirectResult(auth, browserPopupRedirectResolver)
    .then(async (redirectRes) => {
      if (!redirectRes || !redirectRes.user) {
        if (
          isAdminOAuthGraceActive() &&
          isVerifiedFirebaseOwner(auth.currentUser) &&
          hasFreshOwnerAuthToken(auth.currentUser)
        ) {
          completeAdminOAuthRedirectSession();
        }
        return;
      }

      if (!isVerifiedFirebaseOwner(redirectRes.user)) {
        const wrongEmail = redirectRes.user.email || 'Unknown email';
        await purgeExpiredRuntimeAuthSession();
        clearAdminOAuthGracePeriod();
        emitStatus({
          isOwnerConnected: false,
          ownerEmail: null,
          error: `"${wrongEmail}" অনুমোদিত নয়। শুধুমাত্র "${PRIMARY_OWNER_EMAIL}" ইমেইল দিয়ে কানেক্ট করুন।`,
        });
        return;
      }

      completeAdminOAuthRedirectSession();
      emitStatus({
        isOwnerConnected: true,
        ownerEmail: redirectRes.user.email || null,
        error: null,
      });

      if (isAdminAuthenticated()) {
        const syncRes = await syncAllLocalDataToCloud();
        if (syncRes.success && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(CLOUD_AUTO_SCAN_COMPLETED_EVENT, { detail: syncRes })
          );
        }
      }
    })
    .catch(async (err) => {
      clearAdminOAuthGracePeriod();
      if (isTokenServiceDisabledError(err)) {
        await purgeExpiredRuntimeAuthSession();
        return;
      }
      const formatted = formatMobileAwareAuthError(err);
      emitStatus({ error: formatted.message });
    });

  // Refresh blog query privileges & auto-flush pending local edits when Admin unlocks
  window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, () => {
    const canWrite = canAdminWriteToCloud();
    attachBlogsListener(canWrite);
    if (canWrite && hasLocalUnsyncedEdits()) {
      void syncAllLocalDataToCloud();
    }
  });

  // 4. Listen to Firebase Auth state changes & schedule clean sign-out BEFORE 5-min refresh offset
  onAuthStateChanged(auth, (user) => {
    clearTokenExpiryTimer();

    if (user && !hasFreshOwnerAuthToken(user)) {
      void purgeExpiredRuntimeAuthSession();
      emitStatus({
        isOwnerConnected: false,
        ownerEmail: null,
      });
      attachBlogsListener(false);
      return;
    }

    const ownerConnected = isVerifiedFirebaseOwner(user) && hasFreshOwnerAuthToken(user);
    emitStatus({
      isOwnerConnected: ownerConnected,
      ownerEmail: ownerConnected && user ? user.email : null,
    });

    if (ownerConnected && user) {
      const msUntilSafeCutoff = Math.max(
        5_000,
        getOwnerTokenExpiryMs(user) - Date.now() - TOKEN_SAFETY_BUFFER_MS
      );
      tokenExpiryTimerId = window.setTimeout(() => {
        void purgeExpiredRuntimeAuthSession().then(() => {
          emitStatus({
            isOwnerConnected: false,
            ownerEmail: null,
          });
          attachBlogsListener(false);
        });
      }, msUntilSafeCutoff);
    }

    attachBlogsListener(isAdminAuthenticated() && ownerConnected);

    if (ownerConnected && isAdminAuthenticated()) {
      void syncAllLocalDataToCloud();
    }
  });
}
