/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Portfolio Data Store & CRUD Manager
 * Description : Centralized state manager for Projects, Experience, and Skills.
 *               Synchronizes with localStorage and optional backend API persistence.
 *               Dispatches reactive DOM events on updates so all portfolio
 *               components update in real time.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-07
 * -----------------------------------------
 */

import { Project, Experience, Skill, TestLog } from '../types';
import { PROJECTS as DEFAULT_PROJECTS, WORK_EXPERIENCE as DEFAULT_EXPERIENCE, SKILL_CATEGORIES as DEFAULT_SKILLS, PERSONAL_INFO } from '../data';
import { getAdminToken } from './adminAuth';

const STORAGE_KEY_PORTFOLIO = 'sabbir_portfolio_data_v2';
export const PORTFOLIO_UPDATED_EVENT = 'sabbir_portfolio_updated';

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
  profile?: ProfileData;
  lastModified?: string;
}

const CANDIDATE_STORAGE_KEYS = [
  STORAGE_KEY_PORTFOLIO,
  'sabbir_portfolio_data',
  'sabbir_portfolio_data_v1',
  'sabbir_portfolio_cms'
];

/**
 * Loads portfolio dataset from localStorage non-destructively, preserving any live data on Vercel
 */
export function getStoredPortfolioData(): PortfolioData {
  try {
    for (const key of CANDIDATE_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: Partial<PortfolioData> = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const loadedData: PortfolioData = {
            projects: Array.isArray(parsed.projects) && parsed.projects.length > 0 
              ? parsed.projects 
              : [...DEFAULT_PROJECTS],
            experiences: Array.isArray(parsed.experiences) && parsed.experiences.length > 0 
              ? parsed.experiences 
              : [...DEFAULT_EXPERIENCE],
            skills: Array.isArray(parsed.skills) && parsed.skills.length > 0 
              ? parsed.skills 
              : [...DEFAULT_SKILLS],
            profile: parsed.profile 
              ? { ...DEFAULT_PROFILE, ...parsed.profile } 
              : { ...DEFAULT_PROFILE },
            lastModified: parsed.lastModified || new Date().toISOString(),
          };

          // Ensure primary key is synchronized without deleting data
          if (key !== STORAGE_KEY_PORTFOLIO) {
            try {
              localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(loadedData));
            } catch (e) {
              // ignore
            }
          }
          return loadedData;
        }
      }
    }
  } catch (err) {
    console.error('Error reading portfolio data from localStorage:', err);
  }

  // Initial seed if truly no prior data exists
  const initialData: PortfolioData = {
    projects: [...DEFAULT_PROJECTS],
    experiences: [...DEFAULT_EXPERIENCE],
    skills: [...DEFAULT_SKILLS],
    profile: { ...DEFAULT_PROFILE },
    lastModified: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(initialData));
    localStorage.setItem('sabbir_portfolio_data', JSON.stringify(initialData));
  } catch (e) {
    // ignore
  }

  return initialData;
}

/**
 * Save full portfolio dataset to localStorage, dispatch update event, and sync with server
 */
export function savePortfolioData(data: PortfolioData): void {
  const updatedData: PortfolioData = {
    ...data,
    lastModified: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(updatedData));
    localStorage.setItem('sabbir_portfolio_data', JSON.stringify(updatedData));
  } catch (err) {
    console.error('Error saving portfolio data to localStorage:', err);
  }

  // Dispatch reactive event across window
  window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT, { detail: updatedData }));

  // Asynchronously attempt server sync if admin token available
  syncWithServer(updatedData);
}

/**
 * Async background sync with backend server
 */
async function syncWithServer(data: PortfolioData): Promise<void> {
  const token = getAdminToken();
  try {
    await fetch('/api/portfolio/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token || '',
      },
      body: JSON.stringify({ data, token }),
    });
  } catch (err) {
    // Local storage acts as immediate reliable storage
  }
}

/**
 * Fetch latest data from server on startup (if available)
 */
export async function initializePortfolioStoreFromServer(): Promise<void> {
  try {
    const response = await fetch('/api/portfolio/data');
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const local = getStoredPortfolioData();
        // If server data is newer or local is default, sync
        if (result.data.lastModified && (!local.lastModified || new Date(result.data.lastModified) > new Date(local.lastModified))) {
          localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(result.data));
          window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT, { detail: result.data }));
        }
      }
    }
  } catch (err) {
    // Ignore server error and keep localStorage
  }
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
  const id = newProject.id && newProject.id.trim() 
    ? newProject.id.trim() 
    : `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  const created: Project = {
    ...newProject,
    id,
    metrics: newProject.metrics || [],
    assertions: newProject.assertions || [],
    logs: newProject.logs || [],
    tags: newProject.tags || [],
  };

  const updatedProjects = [created, ...current.projects];
  savePortfolioData({ ...current, projects: updatedProjects });
  return created;
}

export function updateStoredProject(id: string, updatedFields: Partial<Project>): boolean {
  const current = getStoredPortfolioData();
  const index = current.projects.findIndex(p => p.id === id);
  if (index === -1) return false;

  const updatedProjects = [...current.projects];
  updatedProjects[index] = {
    ...updatedProjects[index],
    ...updatedFields,
  };

  savePortfolioData({ ...current, projects: updatedProjects });
  return true;
}

export function deleteStoredProject(id: string): boolean {
  const current = getStoredPortfolioData();
  const filtered = current.projects.filter(p => p.id !== id);
  if (filtered.length === current.projects.length) return false;

  savePortfolioData({ ...current, projects: filtered });
  return true;
}

export function reorderStoredProjects(startIndex: number, endIndex: number): void {
  const current = getStoredPortfolioData();
  const items = [...current.projects];
  const [removed] = items.splice(startIndex, 1);
  items.splice(endIndex, 0, removed);
  savePortfolioData({ ...current, projects: items });
}

// ----------------------------------------------------------------------
// EXPERIENCE CRUD
// ----------------------------------------------------------------------

export function getStoredExperiences(): Experience[] {
  return getStoredPortfolioData().experiences;
}

export function saveStoredExperiences(experiences: Experience[]): void {
  const current = getStoredPortfolioData();
  savePortfolioData({ ...current, experiences });
}

export function addStoredExperience(newExp: Omit<Experience, 'id'> & { id?: string }): Experience {
  const current = getStoredPortfolioData();
  const id = newExp.id && newExp.id.trim()
    ? newExp.id.trim()
    : `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const created: Experience = {
    ...newExp,
    id,
    highlights: newExp.highlights || [],
  };

  const updatedExperiences = [created, ...current.experiences];
  savePortfolioData({ ...current, experiences: updatedExperiences });
  return created;
}

export function updateStoredExperience(id: string, updatedFields: Partial<Experience>): boolean {
  const current = getStoredPortfolioData();
  const index = current.experiences.findIndex(e => e.id === id);
  if (index === -1) return false;

  const updatedExperiences = [...current.experiences];
  updatedExperiences[index] = {
    ...updatedExperiences[index],
    ...updatedFields,
  };

  savePortfolioData({ ...current, experiences: updatedExperiences });
  return true;
}

export function deleteStoredExperience(id: string): boolean {
  const current = getStoredPortfolioData();
  const filtered = current.experiences.filter(e => e.id !== id);
  if (filtered.length === current.experiences.length) return false;

  savePortfolioData({ ...current, experiences: filtered });
  return true;
}

export function reorderStoredExperiences(startIndex: number, endIndex: number): void {
  const current = getStoredPortfolioData();
  const items = [...current.experiences];
  const [removed] = items.splice(startIndex, 1);
  items.splice(endIndex, 0, removed);
  savePortfolioData({ ...current, experiences: items });
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
    items: items.map(s => s.trim()).filter(Boolean),
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
    items: updatedSkill.items.map(s => s.trim()).filter(Boolean),
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
    profile: { ...DEFAULT_PROFILE },
    lastModified: new Date().toISOString(),
  };

  savePortfolioData(defaultData);

  const token = getAdminToken();
  fetch('/api/portfolio/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token || '',
    },
  }).catch(() => {});
}

export function exportPortfolioDataJson(): string {
  const data = getStoredPortfolioData();
  return JSON.stringify(data, null, 2);
}

export function importPortfolioDataJson(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return false;
    if (!Array.isArray(parsed.projects) && !Array.isArray(parsed.experiences) && !Array.isArray(parsed.skills)) {
      return false;
    }

    const current = getStoredPortfolioData();
    const importedData: PortfolioData = {
      projects: Array.isArray(parsed.projects) ? parsed.projects : current.projects,
      experiences: Array.isArray(parsed.experiences) ? parsed.experiences : current.experiences,
      skills: Array.isArray(parsed.skills) ? parsed.skills : current.skills,
      profile: parsed.profile ? { ...DEFAULT_PROFILE, ...parsed.profile } : current.profile || { ...DEFAULT_PROFILE },
      lastModified: new Date().toISOString(),
    };

    savePortfolioData(importedData);
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
  };

  savePortfolioData({
    ...current,
    profile: updatedProfile,
  });

  return updatedProfile;
}
