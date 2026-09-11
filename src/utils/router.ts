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
  | { type: 'blog-list' }
  | { type: 'blog-post'; slug: string };

/**
 * Parses current window location pathname into structured AppRoute state
 */
export function getCurrentRoute(): AppRoute {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  
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
  const hash = window.location.hash.replace('#', '');
  return { type: 'home', sectionHash: hash };
}

/**
 * Navigates to target path programmatically using HTML5 pushState
 */
export function navigateTo(path: string, options: { scrollToTop?: boolean } = { scrollToTop: true }) {
  if (window.location.pathname !== path) {
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
