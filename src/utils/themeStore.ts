/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Dynamic Theme & Color View Manager
 * Description : Centralized color theme system providing modern executive palettes
 *               tailored for Software Quality Assurance & SDET engineering portfolios.
 *               Persists user selection across sessions with live CSS custom property injection.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-14
 * -----------------------------------------
 */

export interface ColorTheme {
  id: string;
  name: string;
  subtitle: string;
  primary: string;
  light: string;
  hover: string;
  glow: string;
  rgb: string;
  bgDark: string;
  cardDark: string;
  borderSubtle: string;
  gradientBadge: string;
}

export const COLOR_THEMES: Record<string, ColorTheme> = {
  'cyber-cyan': {
    id: 'cyber-cyan',
    name: 'Cyber Cyan',
    subtitle: 'Precision QA Automation & Cloud Test Suites (Default)',
    primary: '#00D2FF',
    light: '#38BDF8',
    hover: '#0284C7',
    glow: 'rgba(0, 210, 255, 0.28)',
    rgb: '0, 210, 255',
    bgDark: '#080B11',
    cardDark: '#0E1422',
    borderSubtle: 'rgba(0, 210, 255, 0.22)',
    gradientBadge: 'from-[#00D2FF]/20 to-[#0284C7]/5'
  },
  'sapphire-indigo': {
    id: 'sapphire-indigo',
    name: 'Sapphire Indigo',
    subtitle: 'Enterprise SDET & High-Tech Core Systems',
    primary: '#6366F1',
    light: '#818CF8',
    hover: '#4F46E5',
    glow: 'rgba(99, 102, 241, 0.3)',
    rgb: '99, 102, 241',
    bgDark: '#090A14',
    cardDark: '#101326',
    borderSubtle: 'rgba(99, 102, 241, 0.25)',
    gradientBadge: 'from-[#6366F1]/20 to-[#4F46E5]/5'
  },
  'emerald-matrix': {
    id: 'emerald-matrix',
    name: 'Emerald Verified',
    subtitle: '100% Passed Test Pipelines & Zero Defects',
    primary: '#10B981',
    light: '#34D399',
    hover: '#059669',
    glow: 'rgba(16, 185, 129, 0.3)',
    rgb: '16, 185, 129',
    bgDark: '#070E0B',
    cardDark: '#0E1A14',
    borderSubtle: 'rgba(16, 185, 129, 0.25)',
    gradientBadge: 'from-[#10B981]/20 to-[#059669]/5'
  },
  'neon-violet': {
    id: 'neon-violet',
    name: 'Neon Violet',
    subtitle: 'Next-Gen Modern Developer Aesthetics',
    primary: '#A855F7',
    light: '#C084FC',
    hover: '#9333EA',
    glow: 'rgba(168, 85, 247, 0.3)',
    rgb: '168, 85, 247',
    bgDark: '#0D0814',
    cardDark: '#160E22',
    borderSubtle: 'rgba(168, 85, 247, 0.25)',
    gradientBadge: 'from-[#A855F7]/20 to-[#9333EA]/5'
  },
  'sunset-amber': {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    subtitle: 'Warm Radiant High-Contrast Classic',
    primary: '#FF6B35',
    light: '#FF814F',
    hover: '#E8551E',
    glow: 'rgba(255, 107, 53, 0.3)',
    rgb: '255, 107, 53',
    bgDark: '#0C0C10',
    cardDark: '#14141C',
    borderSubtle: 'rgba(255, 107, 53, 0.25)',
    gradientBadge: 'from-[#FF6B35]/20 to-[#FF814F]/5'
  }
};

const THEME_STORAGE_KEY = 'sabbir_sqa_theme_id_v2';
export const DEFAULT_THEME_ID = 'cyber-cyan';

/**
 * Applies the given theme parameters to the root document CSS custom variables
 */
export function applyThemeToDocument(theme: ColorTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  root.style.setProperty('--color-accent', theme.primary);
  root.style.setProperty('--color-accent-light', theme.light);
  root.style.setProperty('--color-accent-hover', theme.hover);
  root.style.setProperty('--color-accent-glow', theme.glow);
  root.style.setProperty('--color-accent-rgb', theme.rgb);
  root.style.setProperty('--color-dark-bg', theme.bgDark);
  root.style.setProperty('--color-dark-card', theme.cardDark);
  root.style.setProperty('--color-border-subtle', theme.borderSubtle);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme.bgDark);
  }
}

/**
 * Retrieves the currently saved theme ID or default
 */
export function getSavedThemeId(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && COLOR_THEMES[saved]) {
        return saved;
      }
    }
  } catch (err) {
    console.warn('Failed to read theme preference from storage', err);
  }
  return DEFAULT_THEME_ID;
}

export const SQA_THEME_USER_CHANGED_EVENT = 'sqa_theme_user_changed';

/**
 * Sets and applies a theme by ID (triggered by user/admin action)
 */
export function setAndApplyTheme(themeId: string): ColorTheme {
  const selected = COLOR_THEMES[themeId] || COLOR_THEMES[DEFAULT_THEME_ID];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, selected.id);
    }
  } catch (err) {
    console.warn('Failed to save theme preference', err);
  }

  applyThemeToDocument(selected);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sqa_theme_changed', { detail: selected }));
    window.dispatchEvent(new CustomEvent(SQA_THEME_USER_CHANGED_EVENT, { detail: selected.id }));
  }

  return selected;
}

/**
 * Hydrates theme silently from Cloud Database snapshot without triggering a write loop
 */
export function hydrateThemeFromCloud(themeId: string | undefined): void {
  if (!themeId || !COLOR_THEMES[themeId]) return;
  const current = getSavedThemeId();
  if (current === themeId) return;
  const selected = COLOR_THEMES[themeId];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, selected.id);
    }
  } catch {
    // ignore
  }
  applyThemeToDocument(selected);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sqa_theme_changed', { detail: selected }));
  }
}

/**
 * Initializes theme on early page load
 */
export function initializeTheme(): ColorTheme {
  const currentId = getSavedThemeId();
  const theme = COLOR_THEMES[currentId] || COLOR_THEMES[DEFAULT_THEME_ID];
  applyThemeToDocument(theme);
  return theme;
}

