/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Portfolio Data Store & Zero-Data-Loss Sync Manager
 * Description : Centralized state manager for Projects, Blogs mirror, Experience,
 *               Skills, References, Career Roadmap, Profile, Visiting Card, and Theme.
 *               Implements non-destructive ID-level merging with tombstones and an
 *               offline-first unsynced queue so zero user edits are ever lost.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-26
 * -----------------------------------------
 */

import { Project, Experience, Skill, Reference, CareerRoadmapItem } from '../types';
import {
  PROJECTS as DEFAULT_PROJECTS,
  WORK_EXPERIENCE as DEFAULT_EXPERIENCE,
  SKILL_CATEGORIES as DEFAULT_SKILLS,
  PERSONAL_INFO,
  PROFESSIONAL_REFERENCES as DEFAULT_REFERENCES,
  CAREER_ROADMAP as DEFAULT_CAREER_ROADMAP,
} from '../data';
import type { BlogPost } from '../data/blogs';
import {
  getSavedThemeId,
  hydrateThemeFromCloud,
  SQA_THEME_USER_CHANGED_EVENT,
} from './themeStore';
import {
  hydrateVisitingCardFromCloud,
  loadPrivacySettings,
  loadTeamMembers,
  loadVisitingCardConfig,
  VCARD_USER_CHANGED_EVENT,
} from './visitingCardStore';
import type {
  PrivacySettings,
  TeamMemberCard,
  VisitingCardConfig,
} from './visitingCardStore';
import {
  CloudPortfolioSnapshotPayload,
  deleteExperienceFromCloud,
  deleteProjectFromCloud,
  isCurrentlyApplyingCloudSnapshot,
  pushAllBlogsToCloud,
  pushAllExperiencesToCloud,
  pushAllProjectsToCloud,
  pushExperienceToCloud,
  pushPortfolioMetaToCloud,
  pushProjectToCloud,
} from './cloudSync';

const STORAGE_KEY_PORTFOLIO = 'sabbir_portfolio_data_v2';
const LOCAL_UNSYNCED_EDITS_KEY = 'sabbir_portfolio_has_unsynced_edits';

export const PORTFOLIO_UPDATED_EVENT = 'sabbir_portfolio_updated';
export const SERVER_BLOGS_SYNCED_EVENT = 'sabbir_server_blogs_synced';
export const UNSYNCED_EDITS_CHANGED_EVENT = 'sabbir_unsynced_edits_changed';

let hasHydratedFromCloud = false;

export function hasLocalUnsyncedEdits(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(LOCAL_UNSYNCED_EDITS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markLocalUnsyncedEdits(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_UNSYNCED_EDITS_KEY, 'true');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UNSYNCED_EDITS_CHANGED_EVENT, { detail: true }));
    }
  } catch {
    // ignore storage errors
  }
}

export function clearLocalUnsyncedEdits(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_UNSYNCED_EDITS_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UNSYNCED_EDITS_CHANGED_EVENT, { detail: false }));
    }
  } catch {
    // ignore storage errors
  }
}

export interface ProfileData {
  name: string;
  title: string;
  avatar: string;
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedin: string;
  objective: string;
  experienceYears: string;
  testCasesCount: string;
  bugsReportedCount: string;
  automationScriptsCount: string;
  defectDetectionRate: string;
  updatedAt?: string;
}

export const DEFAULT_PROFILE: ProfileData = {
  name: PERSONAL_INFO.name,
  title: PERSONAL_INFO.title,
  avatar: PERSONAL_INFO.avatar || '/sabbir_avatar.jpeg',
  email: PERSONAL_INFO.email,
  phone: PERSONAL_INFO.phone,
  location: PERSONAL_INFO.location,
  github: PERSONAL_INFO.github,
  linkedin: PERSONAL_INFO.linkedin,
  objective: PERSONAL_INFO.objective,
  experienceYears: '2+ Years',
  testCasesCount: '150+',
  bugsReportedCount: '100+',
  automationScriptsCount: '20+',
  defectDetectionRate: '95%',
};

export interface PortfolioData {
  projects: Project[];
  experiences: Experience[];
  skills: Skill[];
  references: Reference[];
  careerRoadmap: CareerRoadmapItem[];
  profile?: ProfileData;
  blogs?: BlogPost[];
  blogCategories?: string[];
  deletedProjectIds?: string[];
  deletedExperienceIds?: string[];
  deletedBlogIds?: string[];
  deletedReferenceIds?: string[];
  deletedRoadmapIds?: string[];
  themeId?: string;
  vcardConfig?: VisitingCardConfig;
  vcardPrivacy?: PrivacySettings;
  vcardTeam?: TeamMemberCard[];
  lastModified?: string;
}

const CANDIDATE_STORAGE_KEYS = [
  STORAGE_KEY_PORTFOLIO,
  'sabbir_portfolio_data',
  'sabbir_portfolio_data_v1',
  'sabbir_portfolio_cms',
];

function uniqueStrings(items: string[] | undefined): string[] {
  if (!Array.isArray(items)) return [];
  return Array.from(new Set(items.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)));
}

function pickNewerItem<T extends { updatedAt?: string }>(primary: T, secondary: T): T {
  const t1 = primary.updatedAt ? Date.parse(primary.updatedAt) : 0;
  const t2 = secondary.updatedAt ? Date.parse(secondary.updatedAt) : 0;
  if (!Number.isNaN(t2) && !Number.isNaN(t1) && t2 > t1) {
    return secondary;
  }
  return primary;
}

function pickNewerProfile(
  cloudProfile: Partial<ProfileData> | undefined,
  localProfile: Partial<ProfileData> | undefined,
  preferLocalWhenEqual: boolean
): ProfileData {
  if (!cloudProfile && !localProfile) {
    return { ...DEFAULT_PROFILE };
  }
  if (!cloudProfile) {
    return { ...DEFAULT_PROFILE, ...localProfile };
  }
  if (!localProfile) {
    return { ...DEFAULT_PROFILE, ...cloudProfile };
  }

  const cloudTs = cloudProfile.updatedAt ? Date.parse(cloudProfile.updatedAt) : 0;
  const localTs = localProfile.updatedAt ? Date.parse(localProfile.updatedAt) : 0;
  const safeCloudTs = Number.isNaN(cloudTs) ? 0 : cloudTs;
  const safeLocalTs = Number.isNaN(localTs) ? 0 : localTs;

  if (safeLocalTs > safeCloudTs) {
    return { ...DEFAULT_PROFILE, ...cloudProfile, ...localProfile };
  }
  if (safeCloudTs > safeLocalTs) {
    return { ...DEFAULT_PROFILE, ...localProfile, ...cloudProfile };
  }
  return preferLocalWhenEqual
    ? { ...DEFAULT_PROFILE, ...cloudProfile, ...localProfile }
    : { ...DEFAULT_PROFILE, ...localProfile, ...cloudProfile };
}

/**
 * Non-destructively merges primary items, secondary items, and codebase defaults by `id`,
 * while honoring explicit tombstones (`deletedIds`) so intentional deletions stick
 * and newly created/seeded items are never lost across builds or devices.
 */
export function mergeEntitiesById<T extends { id: string; updatedAt?: string }>(
  primaryList: T[] | undefined,
  secondaryList: T[] | undefined,
  defaultList: T[],
  deletedIds: string[] = []
): T[] {
  const deletedSet = new Set(deletedIds);
  const byId = new Map<string, T>();
  const orderedIds: string[] = [];

  const pushOrMerge = (item: T | undefined, isDefaultSeed = false) => {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) return;
    if (deletedSet.has(item.id)) return;

    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      orderedIds.push(item.id);
    } else if (!isDefaultSeed) {
      byId.set(item.id, pickNewerItem(existing, item));
    }
  };

  const defaultIds = new Set(defaultList.map((d) => d.id));
  const primary = Array.isArray(primaryList) ? primaryList : [];
  const secondary = Array.isArray(secondaryList) ? secondaryList : [];

  // 1. Custom (non-default) items created on live site come first so user's newest creations stay prominent
  for (const item of primary) {
    if (!defaultIds.has(item.id)) pushOrMerge(item);
  }
  for (const item of secondary) {
    if (!defaultIds.has(item.id)) pushOrMerge(item);
  }

  // 2. Newly added default items that did not exist in primary/secondary yet
  const knownIds = new Set([...primary.map((i) => i.id), ...secondary.map((i) => i.id)]);
  for (const defItem of defaultList) {
    if (!knownIds.has(defItem.id)) {
      pushOrMerge(defItem, true);
    }
  }

  // 3. Remaining items in user's saved order
  for (const item of primary) {
    pushOrMerge(item);
  }
  for (const item of secondary) {
    pushOrMerge(item);
  }
  for (const defItem of defaultList) {
    pushOrMerge(defItem, true);
  }

  return orderedIds.map((id) => byId.get(id)!).filter(Boolean);
}

/**
 * Loads portfolio dataset from localStorage non-destructively.
 * IMPORTANT: Never stamps a synthetic `lastModified` on unedited default seed data,
 * ensuring Cloud Firestore snapshots always hydrate cleanly on new devices/tabs.
 */
export function getStoredPortfolioData(): PortfolioData {
  try {
    let mergedCandidate: Partial<PortfolioData> | null = null;

    for (const key of CANDIDATE_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: Partial<PortfolioData> = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (!mergedCandidate) {
            mergedCandidate = parsed;
          } else {
            mergedCandidate = {
              ...mergedCandidate,
              projects: mergeEntitiesById(
                mergedCandidate.projects,
                parsed.projects,
                [],
                uniqueStrings([...(mergedCandidate.deletedProjectIds || []), ...(parsed.deletedProjectIds || [])])
              ),
              experiences: mergeEntitiesById(
                mergedCandidate.experiences,
                parsed.experiences,
                [],
                uniqueStrings([...(mergedCandidate.deletedExperienceIds || []), ...(parsed.deletedExperienceIds || [])])
              ),
              references: mergeEntitiesById(
                mergedCandidate.references,
                parsed.references,
                [],
                uniqueStrings([...(mergedCandidate.deletedReferenceIds || []), ...(parsed.deletedReferenceIds || [])])
              ),
              careerRoadmap: mergeEntitiesById(
                mergedCandidate.careerRoadmap,
                parsed.careerRoadmap,
                [],
                uniqueStrings([...(mergedCandidate.deletedRoadmapIds || []), ...(parsed.deletedRoadmapIds || [])])
              ),
              blogs:
                Array.isArray(mergedCandidate.blogs) && mergedCandidate.blogs.length > 0
                  ? mergedCandidate.blogs
                  : parsed.blogs,
            };
          }
        }
      }
    }

    if (mergedCandidate) {
      const deletedProjectIds = uniqueStrings(mergedCandidate.deletedProjectIds);
      const deletedExperienceIds = uniqueStrings(mergedCandidate.deletedExperienceIds);
      const deletedBlogIds = uniqueStrings(mergedCandidate.deletedBlogIds);
      const deletedReferenceIds = uniqueStrings(mergedCandidate.deletedReferenceIds);
      const deletedRoadmapIds = uniqueStrings(mergedCandidate.deletedRoadmapIds);

      const loadedData: PortfolioData = {
        projects: mergeEntitiesById(mergedCandidate.projects, [], DEFAULT_PROJECTS, deletedProjectIds),
        experiences: mergeEntitiesById(mergedCandidate.experiences, [], DEFAULT_EXPERIENCE, deletedExperienceIds),
        skills:
          Array.isArray(mergedCandidate.skills) && mergedCandidate.skills.length > 0
            ? mergedCandidate.skills
            : [...DEFAULT_SKILLS],
        references: mergeEntitiesById(
          mergedCandidate.references,
          [],
          DEFAULT_REFERENCES,
          deletedReferenceIds
        ),
        careerRoadmap: mergeEntitiesById(
          mergedCandidate.careerRoadmap,
          [],
          DEFAULT_CAREER_ROADMAP,
          deletedRoadmapIds
        ),
        profile: mergedCandidate.profile
          ? { ...DEFAULT_PROFILE, ...mergedCandidate.profile }
          : { ...DEFAULT_PROFILE },
        blogs: Array.isArray(mergedCandidate.blogs) ? mergedCandidate.blogs : undefined,
        blogCategories: Array.isArray(mergedCandidate.blogCategories) ? mergedCandidate.blogCategories : undefined,
        deletedProjectIds,
        deletedExperienceIds,
        deletedBlogIds,
        deletedReferenceIds,
        deletedRoadmapIds,
        themeId: mergedCandidate.themeId || getSavedThemeId(),
        vcardConfig: mergedCandidate.vcardConfig || loadVisitingCardConfig(),
        vcardPrivacy: mergedCandidate.vcardPrivacy || loadPrivacySettings(),
        vcardTeam: mergedCandidate.vcardTeam || loadTeamMembers(),
        lastModified: mergedCandidate.lastModified,
      };

      try {
        localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(loadedData));
      } catch {
        // ignore quota errors
      }
      return loadedData;
    }
  } catch (err) {
    console.error('Error reading portfolio data from localStorage:', err);
  }

  // Fresh browser state: leave lastModified undefined so Firestore Cloud data always wins cleanly
  const initialData: PortfolioData = {
    projects: [...DEFAULT_PROJECTS],
    experiences: [...DEFAULT_EXPERIENCE],
    skills: [...DEFAULT_SKILLS],
    references: [...DEFAULT_REFERENCES],
    careerRoadmap: [...DEFAULT_CAREER_ROADMAP],
    profile: { ...DEFAULT_PROFILE },
    deletedProjectIds: [],
    deletedExperienceIds: [],
    deletedBlogIds: [],
    deletedReferenceIds: [],
    deletedRoadmapIds: [],
    themeId: getSavedThemeId(),
    vcardConfig: loadVisitingCardConfig(),
    vcardPrivacy: loadPrivacySettings(),
    vcardTeam: loadTeamMembers(),
  };

  try {
    localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(initialData));
    localStorage.setItem('sabbir_portfolio_data', JSON.stringify(initialData));
  } catch {
    // ignore
  }

  return initialData;
}

function readLocalBlogsFallback(): BlogPost[] | undefined {
  try {
    const raw =
      localStorage.getItem('sabbir_portfolio_blogs_v1') ||
      localStorage.getItem('sabbir_portfolio_blogs');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return undefined;
}

/**
 * Save full portfolio dataset to localStorage, queue unsynced mark, dispatch update event,
 * and auto-sync to Google Cloud Firestore whenever connected.
 */
export function savePortfolioData(data: PortfolioData): void {
  const current = getStoredPortfolioData();
  const nowIso = new Date().toISOString();
  const updatedData: PortfolioData = {
    ...current,
    ...data,
    blogs: data.blogs ?? current.blogs ?? readLocalBlogsFallback(),
    deletedProjectIds: uniqueStrings(data.deletedProjectIds ?? current.deletedProjectIds),
    deletedExperienceIds: uniqueStrings(data.deletedExperienceIds ?? current.deletedExperienceIds),
    deletedBlogIds: uniqueStrings(data.deletedBlogIds ?? current.deletedBlogIds),
    deletedReferenceIds: uniqueStrings(data.deletedReferenceIds ?? current.deletedReferenceIds),
    deletedRoadmapIds: uniqueStrings(data.deletedRoadmapIds ?? current.deletedRoadmapIds),
    themeId: data.themeId ?? getSavedThemeId(),
    vcardConfig: data.vcardConfig ?? loadVisitingCardConfig(),
    vcardPrivacy: data.vcardPrivacy ?? loadPrivacySettings(),
    vcardTeam: data.vcardTeam ?? loadTeamMembers(),
    lastModified: nowIso,
  };

  try {
    localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(updatedData));
    localStorage.setItem('sabbir_portfolio_data', JSON.stringify(updatedData));
  } catch (err) {
    console.error('Error saving portfolio data to localStorage:', err);
  }

  if (!isCurrentlyApplyingCloudSnapshot()) {
    markLocalUnsyncedEdits();
  }

  window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT, { detail: updatedData }));

  if (!isCurrentlyApplyingCloudSnapshot()) {
    void pushPortfolioMetaToCloud(updatedData).catch((err) => {
      console.error('Cloud meta sync error:', err);
    });
  }
}

/**
 * Called by blogStore whenever blogs or blog categories change so they are persisted
 * locally + synced directly to Google Cloud Firestore (never mutating Git repository files).
 */
export function syncBlogStateToPortfolioServer(
  blogs: BlogPost[],
  blogCategories: string[],
  deletedBlogIds: string[]
): void {
  const current = getStoredPortfolioData();
  const updatedData: PortfolioData = {
    ...current,
    blogs,
    blogCategories,
    deletedBlogIds: uniqueStrings(deletedBlogIds),
    themeId: getSavedThemeId(),
    vcardConfig: loadVisitingCardConfig(),
    vcardPrivacy: loadPrivacySettings(),
    vcardTeam: loadTeamMembers(),
    lastModified: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(updatedData));
    localStorage.setItem('sabbir_portfolio_data', JSON.stringify(updatedData));
  } catch {
    // ignore
  }

  if (!isCurrentlyApplyingCloudSnapshot()) {
    markLocalUnsyncedEdits();
    void pushPortfolioMetaToCloud(updatedData, blogCategories).catch((err) => {
      console.error('Cloud blog meta sync error:', err);
    });
  }
}

/**
 * Non-destructively merges server baseline data with local browser data on startup.
 */
export async function initializePortfolioStoreFromServer(): Promise<void> {
  try {
    const response = await fetch('/api/portfolio/data');
    if (!response.ok) return;
    const result = await response.json();
    if (!result.success || !result.data || typeof result.data !== 'object') return;
    if (hasHydratedFromCloud) return;

    const serverData: Partial<PortfolioData> = result.data;
    const local = getStoredPortfolioData();
    const localUnsynced = hasLocalUnsyncedEdits();

    const serverIsNewer = Boolean(
      !localUnsynced &&
        serverData.lastModified &&
        (!local.lastModified || new Date(serverData.lastModified) >= new Date(local.lastModified))
    );

    const mergedDeletedProjectIds = uniqueStrings([
      ...(local.deletedProjectIds || []),
      ...(serverData.deletedProjectIds || []),
    ]);
    const mergedDeletedExperienceIds = uniqueStrings([
      ...(local.deletedExperienceIds || []),
      ...(serverData.deletedExperienceIds || []),
    ]);
    const mergedDeletedBlogIds = uniqueStrings([
      ...(local.deletedBlogIds || []),
      ...(serverData.deletedBlogIds || []),
    ]);
    const mergedDeletedReferenceIds = uniqueStrings([
      ...(local.deletedReferenceIds || []),
      ...(serverData.deletedReferenceIds || []),
    ]);
    const mergedDeletedRoadmapIds = uniqueStrings([
      ...(local.deletedRoadmapIds || []),
      ...(serverData.deletedRoadmapIds || []),
    ]);

    const mergedProjects = serverIsNewer
      ? mergeEntitiesById(serverData.projects, local.projects, DEFAULT_PROJECTS, mergedDeletedProjectIds)
      : mergeEntitiesById(local.projects, serverData.projects, DEFAULT_PROJECTS, mergedDeletedProjectIds);

    const mergedExperiences = serverIsNewer
      ? mergeEntitiesById(serverData.experiences, local.experiences, DEFAULT_EXPERIENCE, mergedDeletedExperienceIds)
      : mergeEntitiesById(local.experiences, serverData.experiences, DEFAULT_EXPERIENCE, mergedDeletedExperienceIds);

    const mergedReferences = serverIsNewer
      ? mergeEntitiesById(serverData.references, local.references, DEFAULT_REFERENCES, mergedDeletedReferenceIds)
      : mergeEntitiesById(local.references, serverData.references, DEFAULT_REFERENCES, mergedDeletedReferenceIds);

    const mergedRoadmap = serverIsNewer
      ? mergeEntitiesById(serverData.careerRoadmap, local.careerRoadmap, DEFAULT_CAREER_ROADMAP, mergedDeletedRoadmapIds)
      : mergeEntitiesById(local.careerRoadmap, serverData.careerRoadmap, DEFAULT_CAREER_ROADMAP, mergedDeletedRoadmapIds);

    const mergedProfile = pickNewerProfile(serverData.profile, local.profile, !serverIsNewer);

    const mergedData: PortfolioData = {
      ...local,
      projects: mergedProjects,
      experiences: mergedExperiences,
      skills:
        serverIsNewer && Array.isArray(serverData.skills) && serverData.skills.length > 0
          ? serverData.skills
          : local.skills,
      references: mergedReferences,
      careerRoadmap: mergedRoadmap,
      profile: mergedProfile,
      blogs: Array.isArray(serverData.blogs) && serverData.blogs.length > 0 ? serverData.blogs : local.blogs,
      blogCategories:
        Array.isArray(serverData.blogCategories) && serverData.blogCategories.length > 0
          ? serverData.blogCategories
          : local.blogCategories,
      deletedProjectIds: mergedDeletedProjectIds,
      deletedExperienceIds: mergedDeletedExperienceIds,
      deletedBlogIds: mergedDeletedBlogIds,
      deletedReferenceIds: mergedDeletedReferenceIds,
      deletedRoadmapIds: mergedDeletedRoadmapIds,
      lastModified:
        serverIsNewer && serverData.lastModified ? serverData.lastModified : local.lastModified,
    };

    try {
      localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(mergedData));
      localStorage.setItem('sabbir_portfolio_data', JSON.stringify(mergedData));
    } catch {
      // ignore
    }

    window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT, { detail: mergedData }));

    if (Array.isArray(serverData.blogs) || Array.isArray(serverData.blogCategories)) {
      window.dispatchEvent(
        new CustomEvent(SERVER_BLOGS_SYNCED_EVENT, {
          detail: {
            blogs: serverData.blogs || [],
            blogCategories: serverData.blogCategories || [],
            deletedBlogIds: mergedDeletedBlogIds,
          },
        })
      );
    }
  } catch {
    // Keep localStorage safely intact if offline
  }
}

/**
 * Hydrates local portfolio, blog, story, roadmap, reference, visiting card, and theme state
 * from real-time Google Cloud Firestore snapshots completely non-destructively.
 * Never overwrites unsynced local edits and never drops items created on any device.
 */
export function applyCloudPortfolioSnapshot(snapshot: CloudPortfolioSnapshotPayload): void {
  hasHydratedFromCloud = true;
  const local = getStoredPortfolioData();
  const cloudMeta = snapshot.meta;
  const localUnsynced = hasLocalUnsyncedEdits();

  const mergedDeletedProjectIds = uniqueStrings([
    ...(local.deletedProjectIds || []),
    ...(cloudMeta?.deletedProjectIds || []),
  ]);
  const mergedDeletedExperienceIds = uniqueStrings([
    ...(local.deletedExperienceIds || []),
    ...(cloudMeta?.deletedExperienceIds || []),
  ]);
  const mergedDeletedBlogIds = uniqueStrings([
    ...(local.deletedBlogIds || []),
    ...(cloudMeta?.deletedBlogIds || []),
  ]);
  const mergedDeletedReferenceIds = uniqueStrings([
    ...(local.deletedReferenceIds || []),
    ...(cloudMeta?.deletedReferenceIds || []),
  ]);
  const mergedDeletedRoadmapIds = uniqueStrings([
    ...(local.deletedRoadmapIds || []),
    ...(cloudMeta?.deletedRoadmapIds || []),
  ]);

  const hasCloudProjects = Array.isArray(snapshot.projects) && snapshot.projects.length > 0;
  const mergedProjects = hasCloudProjects
    ? localUnsynced
      ? mergeEntitiesById(local.projects, snapshot.projects, DEFAULT_PROJECTS, mergedDeletedProjectIds)
      : mergeEntitiesById(snapshot.projects, local.projects, DEFAULT_PROJECTS, mergedDeletedProjectIds)
    : mergeEntitiesById(local.projects, [], DEFAULT_PROJECTS, mergedDeletedProjectIds);

  const hasCloudExperiences = Array.isArray(snapshot.experiences) && snapshot.experiences.length > 0;
  const mergedExperiences = hasCloudExperiences
    ? localUnsynced
      ? mergeEntitiesById(local.experiences, snapshot.experiences, DEFAULT_EXPERIENCE, mergedDeletedExperienceIds)
      : mergeEntitiesById(snapshot.experiences, local.experiences, DEFAULT_EXPERIENCE, mergedDeletedExperienceIds)
    : mergeEntitiesById(local.experiences, [], DEFAULT_EXPERIENCE, mergedDeletedExperienceIds);

  const hasCloudReferences = Array.isArray(cloudMeta?.references) && cloudMeta.references.length > 0;
  const mergedReferences = hasCloudReferences
    ? localUnsynced
      ? mergeEntitiesById(local.references, cloudMeta!.references, DEFAULT_REFERENCES, mergedDeletedReferenceIds)
      : mergeEntitiesById(cloudMeta!.references, local.references, DEFAULT_REFERENCES, mergedDeletedReferenceIds)
    : mergeEntitiesById(local.references, [], DEFAULT_REFERENCES, mergedDeletedReferenceIds);

  const hasCloudRoadmap = Array.isArray(cloudMeta?.careerRoadmap) && cloudMeta.careerRoadmap.length > 0;
  const mergedRoadmap = hasCloudRoadmap
    ? localUnsynced
      ? mergeEntitiesById(local.careerRoadmap, cloudMeta!.careerRoadmap, DEFAULT_CAREER_ROADMAP, mergedDeletedRoadmapIds)
      : mergeEntitiesById(cloudMeta!.careerRoadmap, local.careerRoadmap, DEFAULT_CAREER_ROADMAP, mergedDeletedRoadmapIds)
    : mergeEntitiesById(local.careerRoadmap, [], DEFAULT_CAREER_ROADMAP, mergedDeletedRoadmapIds);

  const mergedProfile = pickNewerProfile(cloudMeta?.profile, local.profile, localUnsynced);

  const mergedSkills =
    !localUnsynced && Array.isArray(cloudMeta?.skills) && cloudMeta.skills.length > 0
      ? cloudMeta.skills
      : local.skills;

  const resolvedThemeId = !localUnsynced && cloudMeta?.themeId ? cloudMeta.themeId : local.themeId || getSavedThemeId();
  const resolvedVcardConfig: VisitingCardConfig =
    !localUnsynced && cloudMeta?.vcardConfig
      ? { ...loadVisitingCardConfig(), ...cloudMeta.vcardConfig }
      : local.vcardConfig || loadVisitingCardConfig();
  const resolvedVcardPrivacy: PrivacySettings =
    !localUnsynced && cloudMeta?.vcardPrivacy
      ? { ...loadPrivacySettings(), ...cloudMeta.vcardPrivacy }
      : local.vcardPrivacy || loadPrivacySettings();
  const resolvedVcardTeam =
    !localUnsynced && Array.isArray(cloudMeta?.vcardTeam) && cloudMeta.vcardTeam.length > 0
      ? cloudMeta.vcardTeam
      : local.vcardTeam || loadTeamMembers();

  if (!localUnsynced) {
    if (cloudMeta?.themeId) {
      hydrateThemeFromCloud(cloudMeta.themeId);
    }
    if (cloudMeta?.vcardConfig || cloudMeta?.vcardPrivacy || cloudMeta?.vcardTeam) {
      hydrateVisitingCardFromCloud({
        vcardConfig: cloudMeta.vcardConfig,
        vcardPrivacy: cloudMeta.vcardPrivacy,
        vcardTeam: cloudMeta.vcardTeam,
      });
    }
  }

  const mergedBlogCategories = uniqueStrings([
    ...(cloudMeta?.blogCategories || []),
    ...(local.blogCategories || []),
  ]);

  const resolvedLastModified = localUnsynced
    ? local.lastModified || cloudMeta?.lastModified
    : cloudMeta?.lastModified || local.lastModified;

  const mergedData: PortfolioData = {
    ...local,
    projects: mergedProjects,
    experiences: mergedExperiences,
    skills: mergedSkills,
    references: mergedReferences,
    careerRoadmap: mergedRoadmap,
    profile: mergedProfile,
    blogs: Array.isArray(snapshot.blogs) && snapshot.blogs.length > 0 ? snapshot.blogs : local.blogs,
    blogCategories: mergedBlogCategories.length > 0 ? mergedBlogCategories : local.blogCategories,
    deletedProjectIds: mergedDeletedProjectIds,
    deletedExperienceIds: mergedDeletedExperienceIds,
    deletedBlogIds: mergedDeletedBlogIds,
    deletedReferenceIds: mergedDeletedReferenceIds,
    deletedRoadmapIds: mergedDeletedRoadmapIds,
    themeId: resolvedThemeId,
    vcardConfig: resolvedVcardConfig,
    vcardPrivacy: resolvedVcardPrivacy,
    vcardTeam: resolvedVcardTeam,
    lastModified: resolvedLastModified,
  };

  try {
    localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(mergedData));
    localStorage.setItem('sabbir_portfolio_data', JSON.stringify(mergedData));
  } catch {
    // ignore
  }

  window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT, { detail: mergedData }));

  if (
    (Array.isArray(snapshot.blogs) && snapshot.blogs.length > 0) ||
    mergedBlogCategories.length > 0 ||
    mergedDeletedBlogIds.length > 0
  ) {
    window.dispatchEvent(
      new CustomEvent(SERVER_BLOGS_SYNCED_EVENT, {
        detail: {
          blogs: snapshot.blogs || [],
          blogCategories: mergedBlogCategories,
          deletedBlogIds: mergedDeletedBlogIds,
        },
      })
    );
  }
}

// Automatically persist Theme and Visiting Card user updates into PortfolioData + Cloud Auto-Save
if (typeof window !== 'undefined') {
  window.addEventListener(SQA_THEME_USER_CHANGED_EVENT, () => {
    if (isCurrentlyApplyingCloudSnapshot()) return;
    const current = getStoredPortfolioData();
    savePortfolioData({
      ...current,
      themeId: getSavedThemeId(),
    });
  });

  window.addEventListener(VCARD_USER_CHANGED_EVENT, () => {
    if (isCurrentlyApplyingCloudSnapshot()) return;
    const current = getStoredPortfolioData();
    savePortfolioData({
      ...current,
      vcardConfig: loadVisitingCardConfig(),
      vcardPrivacy: loadPrivacySettings(),
      vcardTeam: loadTeamMembers(),
    });
  });
}

// ----------------------------------------------------------------------
// PROJECTS CRUD
// ----------------------------------------------------------------------

export function getStoredProjects(): Project[] {
  return getStoredPortfolioData().projects;
}

export function saveStoredProjects(projects: Project[]): void {
  const current = getStoredPortfolioData();
  savePortfolioData({ ...current, projects });
}

export function addStoredProject(newProject: Omit<Project, 'id'> & { id?: string }): Project {
  const current = getStoredPortfolioData();
  const id =
    newProject.id && newProject.id.trim()
      ? newProject.id.trim()
      : `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const created: Project = {
    ...newProject,
    id,
    metrics: newProject.metrics || [],
    assertions: newProject.assertions || [],
    logs: newProject.logs || [],
    tags: newProject.tags || [],
    updatedAt: new Date().toISOString(),
  };

  const deletedProjectIds = (current.deletedProjectIds || []).filter((delId) => delId !== id);
  const updatedProjects = [created, ...current.projects.filter((p) => p.id !== id)];
  savePortfolioData({ ...current, projects: updatedProjects, deletedProjectIds });
  void pushAllProjectsToCloud(updatedProjects).catch((err) =>
    console.error('Cloud project create sync error:', err)
  );
  return created;
}

export function updateStoredProject(id: string, updatedFields: Partial<Project>): boolean {
  const current = getStoredPortfolioData();
  const index = current.projects.findIndex((p) => p.id === id);
  if (index === -1) return false;

  const updatedProjects = [...current.projects];
  updatedProjects[index] = {
    ...updatedProjects[index],
    ...updatedFields,
    updatedAt: new Date().toISOString(),
  };

  savePortfolioData({ ...current, projects: updatedProjects });
  void pushProjectToCloud(updatedProjects[index], index).catch((err) =>
    console.error('Cloud project update sync error:', err)
  );
  return true;
}

export function deleteStoredProject(id: string): boolean {
  const current = getStoredPortfolioData();
  const filtered = current.projects.filter((p) => p.id !== id);
  if (filtered.length === current.projects.length) return false;

  const deletedProjectIds = uniqueStrings([...(current.deletedProjectIds || []), id]);
  savePortfolioData({ ...current, projects: filtered, deletedProjectIds });
  void deleteProjectFromCloud(id).catch((err) =>
    console.error('Cloud project delete sync error:', err)
  );
  return true;
}

export function reorderStoredProjects(startIndex: number, endIndex: number): void {
  const current = getStoredPortfolioData();
  const items = [...current.projects];
  const [removed] = items.splice(startIndex, 1);
  items.splice(endIndex, 0, removed);
  savePortfolioData({ ...current, projects: items });
  void pushAllProjectsToCloud(items).catch((err) =>
    console.error('Cloud project reorder sync error:', err)
  );
}

// ----------------------------------------------------------------------
// EXPERIENCE (STORY) CRUD
// ----------------------------------------------------------------------

export function getStoredExperiences(): Experience[] {
  return getStoredPortfolioData().experiences;
}

export function saveStoredExperiences(experiences: Experience[]): void {
  const current = getStoredPortfolioData();
  savePortfolioData({ ...current, experiences });
  void pushAllExperiencesToCloud(experiences).catch((err) =>
    console.error('Cloud experiences sync error:', err)
  );
}

export function addStoredExperience(newExp: Omit<Experience, 'id'> & { id?: string }): Experience {
  const current = getStoredPortfolioData();
  const id =
    newExp.id && newExp.id.trim()
      ? newExp.id.trim()
      : `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const created: Experience = {
    ...newExp,
    id,
    highlights: newExp.highlights || [],
    updatedAt: new Date().toISOString(),
  };

  const deletedExperienceIds = (current.deletedExperienceIds || []).filter((delId) => delId !== id);
  const updatedExperiences = [created, ...current.experiences.filter((e) => e.id !== id)];
  savePortfolioData({ ...current, experiences: updatedExperiences, deletedExperienceIds });
  void pushAllExperiencesToCloud(updatedExperiences).catch((err) =>
    console.error('Cloud experience create sync error:', err)
  );
  return created;
}

export function updateStoredExperience(id: string, updatedFields: Partial<Experience>): boolean {
  const current = getStoredPortfolioData();
  const index = current.experiences.findIndex((e) => e.id === id);
  if (index === -1) return false;

  const updatedExperiences = [...current.experiences];
  updatedExperiences[index] = {
    ...updatedExperiences[index],
    ...updatedFields,
    updatedAt: new Date().toISOString(),
  };

  savePortfolioData({ ...current, experiences: updatedExperiences });
  void pushExperienceToCloud(updatedExperiences[index], index).catch((err) =>
    console.error('Cloud experience update sync error:', err)
  );
  return true;
}

export function deleteStoredExperience(id: string): boolean {
  const current = getStoredPortfolioData();
  const filtered = current.experiences.filter((e) => e.id !== id);
  if (filtered.length === current.experiences.length) return false;

  const deletedExperienceIds = uniqueStrings([...(current.deletedExperienceIds || []), id]);
  savePortfolioData({ ...current, experiences: filtered, deletedExperienceIds });
  void deleteExperienceFromCloud(id).catch((err) =>
    console.error('Cloud experience delete sync error:', err)
  );
  return true;
}

export function reorderStoredExperiences(startIndex: number, endIndex: number): void {
  const current = getStoredPortfolioData();
  const items = [...current.experiences];
  const [removed] = items.splice(startIndex, 1);
  items.splice(endIndex, 0, removed);
  savePortfolioData({ ...current, experiences: items });
  void pushAllExperiencesToCloud(items).catch((err) =>
    console.error('Cloud experience reorder sync error:', err)
  );
}

// ----------------------------------------------------------------------
// PROFESSIONAL REFERENCES CRUD
// ----------------------------------------------------------------------

export function getStoredReferences(): Reference[] {
  return getStoredPortfolioData().references;
}

export function addStoredReference(reference: Omit<Reference, 'id'>): Reference {
  const current = getStoredPortfolioData();
  const id = `reference-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const created: Reference = {
    ...reference,
    id,
    updatedAt: new Date().toISOString(),
  };
  const deletedReferenceIds = (current.deletedReferenceIds || []).filter((delId) => delId !== id);
  savePortfolioData({
    ...current,
    references: [...current.references, created],
    deletedReferenceIds,
  });
  return created;
}

export function updateStoredReference(id: string, updatedFields: Omit<Reference, 'id'>): boolean {
  const current = getStoredPortfolioData();
  const index = current.references.findIndex((reference) => reference.id === id);
  if (index === -1) return false;
  const references = [...current.references];
  references[index] = {
    ...references[index],
    ...updatedFields,
    updatedAt: new Date().toISOString(),
  };
  savePortfolioData({ ...current, references });
  return true;
}

export function deleteStoredReference(id: string): boolean {
  const current = getStoredPortfolioData();
  const references = current.references.filter((reference) => reference.id !== id);
  if (references.length === current.references.length) return false;
  const deletedReferenceIds = uniqueStrings([...(current.deletedReferenceIds || []), id]);
  savePortfolioData({ ...current, references, deletedReferenceIds });
  return true;
}

// ----------------------------------------------------------------------
// CAREER ROADMAP (VISION & STORY) CRUD
// ----------------------------------------------------------------------

export function getStoredCareerRoadmap(): CareerRoadmapItem[] {
  return getStoredPortfolioData().careerRoadmap;
}

export function addStoredCareerRoadmapItem(item: Omit<CareerRoadmapItem, 'id'>): CareerRoadmapItem {
  const current = getStoredPortfolioData();
  const id = `roadmap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  const created: CareerRoadmapItem = {
    ...item,
    id,
    updatedAt: nowIso,
  };
  const careerRoadmap =
    created.status === 'active'
      ? [
          ...current.careerRoadmap.map((existing) =>
            existing.status === 'active'
              ? { ...existing, status: 'completed' as const, updatedAt: nowIso }
              : existing
          ),
          created,
        ]
      : [...current.careerRoadmap, created];
  const deletedRoadmapIds = (current.deletedRoadmapIds || []).filter((delId) => delId !== id);
  savePortfolioData({ ...current, careerRoadmap, deletedRoadmapIds });
  return created;
}

export function updateStoredCareerRoadmapItem(
  id: string,
  updatedFields: Omit<CareerRoadmapItem, 'id'>
): boolean {
  const current = getStoredPortfolioData();
  const index = current.careerRoadmap.findIndex((item) => item.id === id);
  if (index === -1) return false;
  const nowIso = new Date().toISOString();
  const careerRoadmap = current.careerRoadmap.map((item, itemIndex) => {
    if (itemIndex === index) return { ...item, ...updatedFields, updatedAt: nowIso };
    if (updatedFields.status === 'active' && item.status === 'active') {
      return { ...item, status: 'completed' as const, updatedAt: nowIso };
    }
    return item;
  });
  savePortfolioData({ ...current, careerRoadmap });
  return true;
}

export function deleteStoredCareerRoadmapItem(id: string): boolean {
  const current = getStoredPortfolioData();
  const careerRoadmap = current.careerRoadmap.filter((item) => item.id !== id);
  if (careerRoadmap.length === current.careerRoadmap.length) return false;
  const deletedRoadmapIds = uniqueStrings([...(current.deletedRoadmapIds || []), id]);
  savePortfolioData({ ...current, careerRoadmap, deletedRoadmapIds });
  return true;
}

// ----------------------------------------------------------------------
// SKILLS CRUD
// ----------------------------------------------------------------------

export function getStoredSkills(): Skill[] {
  return getStoredPortfolioData().skills;
}

export function saveStoredSkills(skills: Skill[]): void {
  const current = getStoredPortfolioData();
  savePortfolioData({ ...current, skills });
}

export function addStoredSkillCategory(categoryName: string, items: string[] = []): Skill {
  const current = getStoredPortfolioData();
  const newCat: Skill = {
    category: categoryName.trim(),
    items: items.map((s) => s.trim()).filter(Boolean),
  };

  const updatedSkills = [...current.skills, newCat];
  savePortfolioData({ ...current, skills: updatedSkills });
  return newCat;
}

export function updateStoredSkillCategory(categoryIndex: number, updatedSkill: Skill): boolean {
  const current = getStoredPortfolioData();
  if (categoryIndex < 0 || categoryIndex >= current.skills.length) return false;

  const updatedSkills = [...current.skills];
  updatedSkills[categoryIndex] = {
    category: updatedSkill.category.trim(),
    items: updatedSkill.items.map((s) => s.trim()).filter(Boolean),
  };

  savePortfolioData({ ...current, skills: updatedSkills });
  return true;
}

export function deleteStoredSkillCategory(categoryIndex: number): boolean {
  const current = getStoredPortfolioData();
  if (categoryIndex < 0 || categoryIndex >= current.skills.length) return false;

  const updatedSkills = current.skills.filter((_, idx) => idx !== categoryIndex);
  savePortfolioData({ ...current, skills: updatedSkills });
  return true;
}

export function addSkillItemToCategory(categoryIndex: number, itemName: string): boolean {
  const current = getStoredPortfolioData();
  if (categoryIndex < 0 || categoryIndex >= current.skills.length) return false;
  const trimmed = itemName.trim();
  if (!trimmed) return false;

  const category = current.skills[categoryIndex];
  if (category.items.includes(trimmed)) return false;

  const updatedSkills = [...current.skills];
  updatedSkills[categoryIndex] = {
    ...category,
    items: [...category.items, trimmed],
  };

  savePortfolioData({ ...current, skills: updatedSkills });
  return true;
}

export function removeSkillItemFromCategory(categoryIndex: number, itemIndex: number): boolean {
  const current = getStoredPortfolioData();
  if (categoryIndex < 0 || categoryIndex >= current.skills.length) return false;

  const category = current.skills[categoryIndex];
  const updatedItems = category.items.filter((_, idx) => idx !== itemIndex);

  const updatedSkills = [...current.skills];
  updatedSkills[categoryIndex] = {
    ...category,
    items: updatedItems,
  };

  savePortfolioData({ ...current, skills: updatedSkills });
  return true;
}

// ----------------------------------------------------------------------
// DATA BACKUP & RESET
// ----------------------------------------------------------------------

export function resetPortfolioToDefault(): void {
  const defaultData: PortfolioData = {
    projects: [...DEFAULT_PROJECTS],
    experiences: [...DEFAULT_EXPERIENCE],
    skills: [...DEFAULT_SKILLS],
    references: [...DEFAULT_REFERENCES],
    careerRoadmap: [...DEFAULT_CAREER_ROADMAP],
    profile: { ...DEFAULT_PROFILE, updatedAt: new Date().toISOString() },
    deletedProjectIds: [],
    deletedExperienceIds: [],
    deletedBlogIds: [],
    deletedReferenceIds: [],
    deletedRoadmapIds: [],
    lastModified: new Date().toISOString(),
  };

  savePortfolioData(defaultData);
  void pushAllProjectsToCloud(defaultData.projects).catch(() => {});
  void pushAllExperiencesToCloud(defaultData.experiences).catch(() => {});
}

export function exportPortfolioDataJson(): string {
  const data = getStoredPortfolioData();
  return JSON.stringify(data, null, 2);
}

export function importPortfolioDataJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return false;
    if (
      !Array.isArray(parsed.projects) &&
      !Array.isArray(parsed.experiences) &&
      !Array.isArray(parsed.skills) &&
      !Array.isArray(parsed.references) &&
      !Array.isArray(parsed.careerRoadmap) &&
      !Array.isArray(parsed.blogs)
    ) {
      return false;
    }

    const current = getStoredPortfolioData();
    const deletedProjectIds = uniqueStrings(parsed.deletedProjectIds ?? current.deletedProjectIds);
    const deletedExperienceIds = uniqueStrings(parsed.deletedExperienceIds ?? current.deletedExperienceIds);
    const deletedBlogIds = uniqueStrings(parsed.deletedBlogIds ?? current.deletedBlogIds);
    const deletedReferenceIds = uniqueStrings(parsed.deletedReferenceIds ?? current.deletedReferenceIds);
    const deletedRoadmapIds = uniqueStrings(parsed.deletedRoadmapIds ?? current.deletedRoadmapIds);

    const importedData: PortfolioData = {
      projects: Array.isArray(parsed.projects)
        ? mergeEntitiesById(parsed.projects, current.projects, DEFAULT_PROJECTS, deletedProjectIds)
        : current.projects,
      experiences: Array.isArray(parsed.experiences)
        ? mergeEntitiesById(parsed.experiences, current.experiences, DEFAULT_EXPERIENCE, deletedExperienceIds)
        : current.experiences,
      skills: Array.isArray(parsed.skills) ? parsed.skills : current.skills,
      references: Array.isArray(parsed.references)
        ? mergeEntitiesById(parsed.references, current.references, DEFAULT_REFERENCES, deletedReferenceIds)
        : current.references,
      careerRoadmap: Array.isArray(parsed.careerRoadmap)
        ? mergeEntitiesById(parsed.careerRoadmap, current.careerRoadmap, DEFAULT_CAREER_ROADMAP, deletedRoadmapIds)
        : current.careerRoadmap,
      profile: parsed.profile
        ? { ...DEFAULT_PROFILE, ...parsed.profile, updatedAt: parsed.profile.updatedAt || new Date().toISOString() }
        : current.profile || { ...DEFAULT_PROFILE },
      blogs: Array.isArray(parsed.blogs) ? parsed.blogs : current.blogs,
      blogCategories: Array.isArray(parsed.blogCategories) ? parsed.blogCategories : current.blogCategories,
      deletedProjectIds,
      deletedExperienceIds,
      deletedBlogIds,
      deletedReferenceIds,
      deletedRoadmapIds,
      themeId: parsed.themeId || current.themeId || getSavedThemeId(),
      vcardConfig: parsed.vcardConfig || current.vcardConfig || loadVisitingCardConfig(),
      vcardPrivacy: parsed.vcardPrivacy || current.vcardPrivacy || loadPrivacySettings(),
      vcardTeam: Array.isArray(parsed.vcardTeam) ? parsed.vcardTeam : current.vcardTeam || loadTeamMembers(),
      lastModified: new Date().toISOString(),
    };

    if (importedData.themeId) {
      hydrateThemeFromCloud(importedData.themeId);
    }
    hydrateVisitingCardFromCloud({
      vcardConfig: importedData.vcardConfig,
      vcardPrivacy: importedData.vcardPrivacy,
      vcardTeam: importedData.vcardTeam,
    });

    savePortfolioData(importedData);
    void pushAllProjectsToCloud(importedData.projects).catch(() => {});
    void pushAllExperiencesToCloud(importedData.experiences).catch(() => {});
    if (Array.isArray(importedData.blogs)) {
      void pushAllBlogsToCloud(importedData.blogs).catch(() => {});
    }

    if (Array.isArray(importedData.blogs)) {
      window.dispatchEvent(
        new CustomEvent(SERVER_BLOGS_SYNCED_EVENT, {
          detail: {
            blogs: importedData.blogs,
            blogCategories: importedData.blogCategories || [],
            deletedBlogIds,
          },
        })
      );
    }

    return true;
  } catch (err) {
    console.error('Failed to import portfolio JSON:', err);
    return false;
  }
}

// ----------------------------------------------------------------------
// PROFILE & BIO CRUD
// ----------------------------------------------------------------------

export function getStoredProfile(): ProfileData {
  const current = getStoredPortfolioData();
  return current.profile || { ...DEFAULT_PROFILE };
}

export function updateStoredProfile(updatedFields: Partial<ProfileData>): ProfileData {
  const current = getStoredPortfolioData();
  const currentProfile = current.profile || { ...DEFAULT_PROFILE };
  const updatedProfile: ProfileData = {
    ...currentProfile,
    ...updatedFields,
    updatedAt: new Date().toISOString(),
  };

  savePortfolioData({
    ...current,
    profile: updatedProfile,
  });

  return updatedProfile;
}
