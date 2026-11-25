/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Main React Application Component
 * Description : Core SPA component organizing navigation bar, Hero section, SQA Skills Grid,
 *               ATS Resume & Cover Letter callouts, Portfolio Projects, Experience Timeline,
 *               Career Vision, Education & References, Contact Form, and the single
 *               external Main Security System.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-24
 * -----------------------------------------
 */

import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SkillsGrid from './components/SkillsGrid';
import Projects from './components/Projects';
import BlogSection from './components/BlogSection';
import ExperienceTimeline from './components/ExperienceTimeline';
import CareerVision from './components/CareerVision';
import EducationAndReferences from './components/EducationAndReferences';
import Contact from './components/Contact';
import AdminQuickAccess from './components/AdminQuickAccess';
import { getCurrentRoute, navigateTo, navigateToHomeSection, AppRoute } from './utils/router';
import {
  ADMIN_OAUTH_REDIRECT_COMPLETED_EVENT,
  ADMIN_SESSION_EXPIRED_EVENT,
  isAdminAuthenticated,
  verifyOwnerWithServer,
  logoutAdmin,
} from './utils/adminAuth';
import {
  applyCloudPortfolioSnapshot,
  getStoredPortfolioData,
  initializePortfolioStoreFromServer,
} from './utils/portfolioStore';
import { getStoredBlogCategories, getStoredBlogPosts } from './utils/blogStore';
import { initializeCloudRealtimeSync } from './utils/cloudSync';
import { initializeTheme } from './utils/themeStore';
import type { SecurityModalMode } from './components/AdminPasscodeModal';
import Footer from './components/Footer';

const AdminPortal = lazy(() => import('./components/AdminPortal'));
const BlogList = lazy(() => import('./components/BlogList'));
const BlogPost = lazy(() => import('./components/BlogPost'));
const ResumeBuilderModal = lazy(() => import('./components/ResumeBuilderModal'));
const CoverLetterGeneratorModal = lazy(() => import('./components/CoverLetterGeneratorModal'));
const AdminPasscodeModal = lazy(() => import('./components/AdminPasscodeModal'));
const AdminCloudScanModal = lazy(() => import('./components/AdminCloudScanModal'));
const VisitingCardModal = lazy(() =>
  import('./components/VisitingCardModal').then((m) => ({ default: m.VisitingCardModal }))
);

const LazyChunkFallback = ({ fullScreen = false }: { fullScreen?: boolean }) => (
  <div
    className={
      fullScreen
        ? 'min-h-[60vh] flex items-center justify-center p-8'
        : 'fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center'
    }
    role="status"
    aria-live="polite"
  >
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent,#00D2FF)]/30 border-t-[var(--color-accent,#00D2FF)] animate-spin" />
      <span className="text-xs font-mono text-slate-300 tracking-wide">Loading module...</span>
    </div>
  </div>
);

export default function App(): React.ReactNode {
  const [dark, setDark] = useState<boolean>(true);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState<boolean>(false);
  const [isCoverLetterModalOpen, setIsCoverLetterModalOpen] = useState<boolean>(false);
  const [route, setRoute] = useState<AppRoute>(() => getCurrentRoute());
  const [isVisitingCardModalOpen, setIsVisitingCardModalOpen] = useState<boolean>(() => getCurrentRoute().type === 'vcard');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [, setIsOwnerVerified] = useState<boolean>(false);
  const [isAdminPasscodeModalOpen, setIsAdminPasscodeModalOpen] = useState<boolean>(false);
  const [securityModalMode, setSecurityModalMode] = useState<SecurityModalMode>('unlock');
  const [isCloudScanModalOpen, setIsCloudScanModalOpen] = useState<boolean>(false);
  const wasOnAdminRouteRef = useRef<boolean>(false);
  const promptedLockedAdminRouteRef = useRef<boolean>(false);

  const handleReturnHomeFromAdmin = useCallback(() => {
    setIsCloudScanModalOpen(false);
    setIsAdminPasscodeModalOpen(false);
    promptedLockedAdminRouteRef.current = false;
    navigateTo('/', { replace: true, scrollToTop: true });
    setRoute({ type: 'home' });
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    initializeTheme();
  }, [dark]);

  // Prompt Cloud Auto-Save once per session if unlocked Admin enters /admin;
  // or prompt password once if a visitor/logged-out admin lands directly on /admin URL.
  useEffect(() => {
    const isNowOnAdmin = route.type === 'admin';
    if (isNowOnAdmin && !isAdmin) {
      if (!promptedLockedAdminRouteRef.current) {
        promptedLockedAdminRouteRef.current = true;
        setSecurityModalMode('unlock');
        setIsAdminPasscodeModalOpen(true);
      }
    } else {
      promptedLockedAdminRouteRef.current = false;
    }

    if (!isAdmin) {
      setIsCloudScanModalOpen(false);
    }
    wasOnAdminRouteRef.current = isAdmin && isNowOnAdmin;
  }, [isAdmin, route.type]);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getCurrentRoute());
    };

    const syncAdmin = async () => {
      const authenticated = isAdminAuthenticated();
      setIsAdmin(authenticated);
      if (authenticated) {
        const verified = await verifyOwnerWithServer();
        setIsOwnerVerified(verified);
      } else {
        setIsOwnerVerified(false);
        setIsCloudScanModalOpen(false);
      }
    };

    syncAdmin();
    initializePortfolioStoreFromServer();
    initializeCloudRealtimeSync({
      getPortfolioData: getStoredPortfolioData,
      getBlogs: getStoredBlogPosts,
      getBlogCategories: getStoredBlogCategories,
      onCloudSnapshot: applyCloudPortfolioSnapshot,
    });

    const handleOAuthRedirectCompleted = () => {
      if (isAdminAuthenticated()) {
        setIsAdmin(true);
        if (getCurrentRoute().type !== 'admin') {
          navigateTo('/admin');
        }
        setIsCloudScanModalOpen(true);
      }
    };

    const handleSessionExpired = () => {
      setIsAdmin(false);
      setIsOwnerVerified(false);
      setIsCloudScanModalOpen(false);
      setIsAdminPasscodeModalOpen(false);
      if (getCurrentRoute().type === 'admin') {
        promptedLockedAdminRouteRef.current = false;
        navigateTo('/', { replace: true, scrollToTop: true });
        setRoute({ type: 'home' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('admin_auth_changed', syncAdmin);
    window.addEventListener(ADMIN_OAUTH_REDIRECT_COMPLETED_EVENT, handleOAuthRedirectCompleted);
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired);

    const interval = setInterval(() => {
      const authenticated = isAdminAuthenticated();
      setIsAdmin((prev) => {
        if (prev && !authenticated && getCurrentRoute().type === 'admin') {
          promptedLockedAdminRouteRef.current = false;
          navigateTo('/', { replace: true, scrollToTop: true });
          setRoute({ type: 'home' });
        }
        return authenticated;
      });
      if (!authenticated) {
        setIsOwnerVerified(false);
        setIsCloudScanModalOpen(false);
      }
    }, 4000);

    const checkVCardRoute = () => {
      const activeRoute = getCurrentRoute();
      if (activeRoute.type === 'vcard') {
        setIsVisitingCardModalOpen(true);
      }
    };
    checkVCardRoute();
    window.addEventListener('hashchange', checkVCardRoute);
    window.addEventListener('popstate', checkVCardRoute);

    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('admin_auth_changed', syncAdmin);
      window.removeEventListener(ADMIN_OAUTH_REDIRECT_COMPLETED_EVENT, handleOAuthRedirectCompleted);
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired);
      window.removeEventListener('hashchange', checkVCardRoute);
      window.removeEventListener('popstate', checkVCardRoute);
    };
  }, [isAdmin]);

  const handleOpenResumeBuilder = useCallback(() => {
    setIsResumeModalOpen(true);
  }, []);

  const handleOpenCoverLetter = useCallback(() => {
    setIsCoverLetterModalOpen(true);
  }, []);

  const handleOpenSecurityModal = useCallback((mode: SecurityModalMode = 'unlock') => {
    setSecurityModalMode(mode);
    setIsAdminPasscodeModalOpen(true);
  }, []);

  const handleCloseSecurityModal = useCallback(() => {
    setIsAdminPasscodeModalOpen(false);
    // If user closes/cancels the password prompt while on a locked/expired /admin URL,
    // immediately return them smoothly to the Home Page without requiring a reload.
    if (!isAdminAuthenticated() && getCurrentRoute().type === 'admin') {
      promptedLockedAdminRouteRef.current = false;
      navigateTo('/', { replace: true, scrollToTop: true });
      setRoute({ type: 'home' });
    }
  }, []);

  const handleOpenCloudScanModal = useCallback(() => {
    if (isAdminAuthenticated()) {
      setIsCloudScanModalOpen(true);
    }
  }, []);

  const handleLogoutAdmin = useCallback(() => {
    setIsCloudScanModalOpen(false);
    setIsAdminPasscodeModalOpen(false);
    logoutAdmin();
    setIsAdmin(false);
    setIsOwnerVerified(false);
    if (getCurrentRoute().type === 'admin') {
      promptedLockedAdminRouteRef.current = false;
      navigateTo('/', { replace: true, scrollToTop: true });
      setRoute({ type: 'home' });
    }
  }, []);

  const handleSecurityModalSuccess = useCallback((completedMode: SecurityModalMode) => {
    setIsAdmin(true);
    setIsAdminPasscodeModalOpen(false);
    if (completedMode === 'unlock') {
      if (getCurrentRoute().type !== 'admin') {
        navigateTo('/admin');
        setRoute(getCurrentRoute());
      }
    }
  }, []);

  const currentPath = window.location.pathname;

  return (
    <div className="min-h-screen bg-[var(--color-dark-bg,#080B11)] text-[#F3F4F6] flex flex-col font-sans selection:bg-[var(--color-accent,#00D2FF)] selection:text-black transition-colors duration-300">
      {/* Navigation Header (hidden inside full-screen Admin Dashboard) */}
      {route.type !== 'admin' && (
        <Navbar
          dark={dark}
          setDark={setDark}
          onOpenResumeBuilder={handleOpenResumeBuilder}
          onOpenCoverLetter={handleOpenCoverLetter}
          onOpenVisitingCard={() => setIsVisitingCardModalOpen(true)}
          currentPath={currentPath}
        />
      )}

      {/* Main Page Sections or Blog Page or Admin Page */}
      <main className="flex-grow">
        {route.type === 'admin' && (
          <Suspense fallback={<LazyChunkFallback fullScreen />}>
            <AdminPortal
              onBack={handleReturnHomeFromAdmin}
              initialTab={route.initialTab || 'overview'}
              onOpenResumeBuilder={handleOpenResumeBuilder}
              onOpenCoverLetter={handleOpenCoverLetter}
              onOpenMainSecurity={handleOpenSecurityModal}
              onOpenCloudScan={handleOpenCloudScanModal}
            />
          </Suspense>
        )}

        {route.type === 'blog-list' && (
          <Suspense fallback={<LazyChunkFallback fullScreen />}>
            <BlogList
              onSelectPost={(slug) => navigateTo(`/blog/${slug}`)}
            />
          </Suspense>
        )}

        {route.type === 'blog-post' && (
          <Suspense fallback={<LazyChunkFallback fullScreen />}>
            <BlogPost
              slug={route.slug}
              onBackToBlog={() => navigateTo('/blog')}
              onSelectPost={(slug) => navigateTo(`/blog/${slug}`)}
              onOpenContact={() => navigateToHomeSection('#contact')}
            />
          </Suspense>
        )}

        {(route.type === 'home' || route.type === 'vcard') && (
          <>
            <Hero
              onOpenResumeBuilder={handleOpenResumeBuilder}
              onOpenCoverLetter={handleOpenCoverLetter}
              onOpenVisitingCard={() => setIsVisitingCardModalOpen(true)}
            />
            <SkillsGrid />

            <Projects />
            <BlogSection
              onSelectPost={(slug) => navigateTo(`/blog/${slug}`)}
              onViewAllBlog={() => navigateTo('/blog')}
            />
            <ExperienceTimeline />
            <CareerVision />
            <EducationAndReferences />
            <Contact
              onOpenResumeBuilder={handleOpenResumeBuilder}
              onOpenVisitingCard={() => setIsVisitingCardModalOpen(true)}
            />
          </>
        )}
      </main>

      {/* Virtual Visiting Card & Smart NFC Suite Modal */}
      {isVisitingCardModalOpen && (
        <Suspense fallback={<LazyChunkFallback />}>
          <VisitingCardModal
            isOpen={isVisitingCardModalOpen}
            onClose={() => {
              setIsVisitingCardModalOpen(false);
              const search = window.location.search.toLowerCase();
              const hash = window.location.hash.toLowerCase();
              const path = window.location.pathname.toLowerCase();
              if (
                hash.includes('card') ||
                search.includes('card') ||
                search.includes('vcard') ||
                path === '/vcard' ||
                path === '/card'
              ) {
                window.history.pushState(null, '', '/');
                setRoute(getCurrentRoute());
              }
            }}
          />
        </Suspense>
      )}

      {/* Resume Builder Modal */}
      {isResumeModalOpen && (
        <Suspense fallback={<LazyChunkFallback />}>
          <ResumeBuilderModal
            isOpen={isResumeModalOpen}
            onClose={() => setIsResumeModalOpen(false)}
            onOpenCoverLetter={handleOpenCoverLetter}
          />
        </Suspense>
      )}

      {/* Cover Letter Generator Modal */}
      {isCoverLetterModalOpen && (
        <Suspense fallback={<LazyChunkFallback />}>
          <CoverLetterGeneratorModal
            isOpen={isCoverLetterModalOpen}
            onClose={() => setIsCoverLetterModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Single External Main Security System Modal */}
      {isAdminPasscodeModalOpen && (
        <Suspense fallback={<LazyChunkFallback />}>
          <AdminPasscodeModal
            isOpen={isAdminPasscodeModalOpen}
            initialMode={securityModalMode}
            onClose={handleCloseSecurityModal}
            onSuccess={handleSecurityModalSuccess}
            returnHomeOnCancel={route.type === 'admin' && !isAdmin}
            title="Main System Security"
            description="Enter your password to unlock full portfolio management or update your password."
          />
        </Suspense>
      )}

      {/* Admin-Exclusive Pre-Git Cloud Scan & Backup Reminder Modal */}
      {isAdmin && isCloudScanModalOpen && (
        <Suspense fallback={<LazyChunkFallback />}>
          <AdminCloudScanModal
            isOpen={isCloudScanModalOpen}
            onClose={() => setIsCloudScanModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Rich Executive Glassmorphism Footer (hidden inside full-screen Admin Dashboard) */}
      {route.type !== 'admin' && (
        <Footer
          onOpenVisitingCard={() => setIsVisitingCardModalOpen(true)}
          onOpenResumeBuilder={handleOpenResumeBuilder}
          onOpenCoverLetter={handleOpenCoverLetter}
        />
      )}

      {/* Single External Main Security Dock */}
      {!isAdminPasscodeModalOpen && (
        <AdminQuickAccess
          currentPath={currentPath}
          onOpenSecurityModal={handleOpenSecurityModal}
          onOpenCloudScan={handleOpenCloudScanModal}
          onLogout={handleLogoutAdmin}
        />
      )}
    </div>
  );
}
