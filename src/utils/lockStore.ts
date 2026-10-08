/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Unified System Lock & Security Store
 * Description : Centralized access and lock management system controlling:
 *               1. SQA Blog Lock & Public Access Controls
 *               2. ATS Resume Suite Passcode Locks & PDF Export Locks
 *               3. AI Cover Letter Suite Access Locks
 *               4. CMS Projects, Experience, Skills & Profile Edit Locks
 *               5. Master All-in-One Global Lock Switch
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-07
 * -----------------------------------------
 */

export interface SystemLocks {
  // SQA Blog Section
  blogLocked: boolean;             // Master lock for SQA Blog
  blogPublicBrowsing: boolean;     // Allow public to view published blogs
  blogArticleEditingLocked: boolean; // Prevent draft creation / article modification
  
  // ATS Resume Suite
  resumeLocked: boolean;           // Restrict Resume Builder to Admin only
  resumeDownloadLocked: boolean;   // Lock PDF generation and downloads
  
  // AI Cover Letter Suite
  coverLetterLocked: boolean;      // Restrict Cover Letter Suite to Admin only
  coverLetterExportLocked: boolean;// Lock export and copying
  
  // Portfolio CMS Data Locks
  projectsLocked: boolean;         // Lock projects from editing/deletion
  experienceLocked: boolean;       // Lock career milestones from editing
  skillsLocked: boolean;           // Lock skills matrix from editing
  profileLocked: boolean;          // Lock personal profile metrics
  
  // Timestamp
  lastModified: string;
}

const STORAGE_KEY_LOCKS = 'sabbir_system_locks_v1';
export const LOCKS_UPDATED_EVENT = 'sabbir_system_locks_updated';

export const DEFAULT_LOCKS: SystemLocks = {
  blogLocked: false,
  blogPublicBrowsing: true,
  blogArticleEditingLocked: false,
  resumeLocked: true,             // Admin-only by default as requested
  resumeDownloadLocked: true,     // Admin-only PDF downloads
  coverLetterLocked: true,        // Admin-only by default as requested
  coverLetterExportLocked: true,
  projectsLocked: false,
  experienceLocked: false,
  skillsLocked: false,
  profileLocked: false,
  lastModified: new Date().toISOString(),
};

/**
 * Retrieve current system lock configuration from localStorage
 */
export function getSystemLocks(): SystemLocks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_LOCKS, ...parsed };
    }
  } catch (e) {
    console.error('Error reading lock settings:', e);
  }
  return { ...DEFAULT_LOCKS };
}

/**
 * Update system lock configuration
 */
export function updateSystemLocks(updates: Partial<SystemLocks>): SystemLocks {
  try {
    const current = getSystemLocks();
    const updated: SystemLocks = {
      ...current,
      ...updates,
      lastModified: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(LOCKS_UPDATED_EVENT, { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Error saving lock settings:', e);
    return getSystemLocks();
  }
}

/**
 * Toggle a specific lock flag
 */
export function toggleSystemLock(lockKey: keyof Omit<SystemLocks, 'lastModified'>): SystemLocks {
  const current = getSystemLocks();
  return updateSystemLocks({
    [lockKey]: !current[lockKey],
  });
}

/**
 * 1-Click Master Lock: Lock all systems down
 */
export function lockAllSystems(): SystemLocks {
  return updateSystemLocks({
    blogLocked: true,
    blogPublicBrowsing: false,
    blogArticleEditingLocked: true,
    resumeLocked: true,
    resumeDownloadLocked: true,
    coverLetterLocked: true,
    coverLetterExportLocked: true,
    projectsLocked: true,
    experienceLocked: true,
    skillsLocked: true,
    profileLocked: true,
  });
}

/**
 * 1-Click Master Unlock: Unlock all standard portfolio features
 */
export function unlockAllSystems(): SystemLocks {
  return updateSystemLocks({
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
  });
}

/**
 * Reset locks to standard security baseline
 */
export function resetSystemLocks(): SystemLocks {
  return updateSystemLocks({ ...DEFAULT_LOCKS });
}
