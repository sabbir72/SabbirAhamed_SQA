/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Unified System Lock & Security Store
 * Description : Centralized security baseline:
 *               - ONLY the CMS Admin Panel has a passcode lock system.
 *               - Separate locks on Blog, Articles, Resume, Cover Letter, and public
 *                 portfolio sections are disabled so visitors never hit scattered
 *                 passcode prompts, while all content & draft management stays
 *                 protected behind the single CMS Admin Panel Lock.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-24
 * -----------------------------------------
 */

export interface SystemLocks {
  // Unified baseline flags (separate module locks disabled; governed solely by CMS Admin Panel Lock)
  blogLocked: boolean;
  blogPublicBrowsing: boolean;
  blogArticleEditingLocked: boolean;
  resumeLocked: boolean;
  resumeDownloadLocked: boolean;
  coverLetterLocked: boolean;
  coverLetterExportLocked: boolean;
  projectsLocked: boolean;
  experienceLocked: boolean;
  skillsLocked: boolean;
  profileLocked: boolean;
  lastModified: string;
}

const STORAGE_KEY_LOCKS = 'sabbir_system_locks_v1';
export const LOCKS_UPDATED_EVENT = 'sabbir_system_locks_updated';

export const DEFAULT_LOCKS: SystemLocks = {
  blogLocked: false,
  blogPublicBrowsing: true,
  blogArticleEditingLocked: false,
  resumeLocked: false,
  resumeDownloadLocked: false,
  coverLetterLocked: false,
  coverLetterExportLocked: false,
  projectsLocked: false,
  experienceLocked: false,
  skillsLocked: false,
  profileLocked: false,
  lastModified: new Date().toISOString(),
};

/**
 * Retrieve unified system lock state.
 * All separate module locks (Blog, Articles, Resume, Cover Letter, etc.) remain false
 * so only the single CMS Admin Panel Lock governs administrative operations.
 */
export function getSystemLocks(): SystemLocks {
  return {
    ...DEFAULT_LOCKS,
    lastModified: new Date().toISOString(),
  };
}

/**
 * Persist unified baseline and notify listeners.
 */
export function updateSystemLocks(_updates?: Partial<SystemLocks>): SystemLocks {
  const normalized: SystemLocks = {
    ...DEFAULT_LOCKS,
    lastModified: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(LOCKS_UPDATED_EVENT, { detail: normalized }));
  } catch (e) {
    console.error('Error saving lock settings:', e);
  }
  return normalized;
}

export function resetSystemLocks(): SystemLocks {
  return updateSystemLocks({ ...DEFAULT_LOCKS });
}
