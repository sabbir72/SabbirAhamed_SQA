/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : SPA Client-Side Router Helper
 * Description : Lightweight SPA URL & history synchronization for /, /blog, and /blog/:slug routes.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-08-02
 * -----------------------------------------
 */

export type AppRoute = 
  | { type: 'home'; sectionHash?: string }
  | { type: 'auth-bridge' }
  | { type: 'vcard' }
  | { type: 'blog-list' }
  | { type: 'blog-post'; slug: string }
  | { type: 'admin'; initialTab?: 'overview' | 'projects' | 'experience' | 'references' | 'roadmap' | 'skills' | 'blogs' | 'resume' | 'cover-letter' | 'profile' | 'vcard' | 'security' };

/**
 * Parses current window location pathname into structured AppRoute state
 */
export function getCurrentRoute(): AppRoute {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const hash = window.location.hash.replace('#', '');
  
  const search = window.location.search.toLowerCase();
  const lowerHash = hash.toLowerCase();

  if (path === '/auth-bridge') {
    return { type: 'auth-bridge' };
  }

  if (path === '/admin' || lowerHash === 'admin') {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as
      | 'overview'
      | 'projects'
      | 'experience'
      | 'references'
      | 'roadmap'
      | 'skills'
      | 'blogs'
      | 'resume'
      | 'cover-letter'
      | 'profile'
      | 'vcard'
      | 'security'
      | null;
    const validTabs = new Set([
      'overview',
      'projects',
      'experience',
      'references',
      'roadmap',
      'skills',
      'blogs',
      'resume',
      'cover-letter',
      'profile',
      'vcard',
      'security',
    ]);
    return {
      type: 'admin',
      initialTab: tabParam && validTabs.has(tabParam) ? tabParam : undefined,
    };
  }

  const isAuthHash = lowerHash.includes('cloud_auth_');

  // Detect any visiting card access (QR scan query parameter ?card=1, ?vcard, #vcard, /vcard, /card)
  const isVCardRoute =
    !isAuthHash &&
    (path === '/vcard' || 
    path === '/card' || 
    path.startsWith('/card/') ||
    path.startsWith('/vcard/') ||
    lowerHash === 'vcard' || 
    lowerHash === 'card' || 
    lowerHash === 'visiting-card' ||
    lowerHash.includes('card') ||
    search.includes('card') ||
    search.includes('vcard'));

  if (isVCardRoute) {
    return { type: 'vcard' };
  }

  if (path === '/blog') {
    return { type: 'blog-list' };
  }
  
  if (path.startsWith('/blog/')) {
    const slug = path.replace('/blog/', '').trim();
    if (slug) {
      return { type: 'blog-post', slug };
    }
    return { type: 'blog-list' };
  }

  // Default to home page
  return { type: 'home', sectionHash: hash };
}

/**
 * Navigates to target path programmatically using HTML5 pushState
 */
export function navigateTo(path: string, options: { scrollToTop?: boolean } = { scrollToTop: true }) {
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (currentUrl !== path) {
    window.history.pushState({}, '', path);
    // Dispatch popstate so custom route listeners trigger re-render
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  if (options.scrollToTop) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Navigates to home page section (e.g., #about, #skills, #projects)
 */
export function navigateToHomeSection(sectionHash: string) {
  const targetHash = sectionHash.startsWith('#') ? sectionHash : `#${sectionHash}`;
  if (window.location.pathname !== '/') {
    window.history.pushState({}, '', `/${targetHash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setTimeout(() => {
      const el = document.querySelector(targetHash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  } else {
    window.location.hash = targetHash;
    const el = document.querySelector(targetHash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
