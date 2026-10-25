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

import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SkillsGrid from './components/SkillsGrid';
import Projects from './components/Projects';
import BlogSection from './components/BlogSection';
import ExperienceTimeline from './components/ExperienceTimeline';
import CareerVision from './components/CareerVision';
import EducationAndReferences from './components/EducationAndReferences';
import Contact from './components/Contact';
import ResumeBuilderModal from './components/ResumeBuilderModal';
import CoverLetterGeneratorModal from './components/CoverLetterGeneratorModal';
import BlogList from './components/BlogList';
import BlogPost from './components/BlogPost';
import AdminPortal from './components/AdminPortal';
import AdminQuickAccess from './components/AdminQuickAccess';
import AdminCloudScanModal from './components/AdminCloudScanModal';
import { getCurrentRoute, navigateTo, navigateToHomeSection, AppRoute } from './utils/router';
import {
  ADMIN_OAUTH_REDIRECT_COMPLETED_EVENT,
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
import AdminPasscodeModal, { SecurityModalMode } from './components/AdminPasscodeModal';
import { VisitingCardModal } from './components/VisitingCardModal';
import Footer from './components/Footer';

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

  useEffect(() => {
    document.documentElement.classList.add('dark');
    initializeTheme();
  }, [dark]);

  // Show Pre-Git Cloud Scan & Backup reminder popup every time an authenticated Admin enters /admin
  useEffect(() => {
    const isNowOnAdmin = route.type === 'admin';
    if (isAdmin && isNowOnAdmin && !wasOnAdminRouteRef.current) {
      setIsCloudScanModalOpen(true);
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

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('admin_auth_changed', syncAdmin);
    window.addEventListener(ADMIN_OAUTH_REDIRECT_COMPLETED_EVENT, handleOAuthRedirectCompleted);

    const interval = setInterval(() => {
      const authenticated = isAdminAuthenticated();
      setIsAdmin(authenticated);
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
      window.removeEventListener('hashchange', checkVCardRoute);
      window.removeEventListener('popstate', checkVCardRoute);
    };
  }, [isAdmin]);

  const handleOpenResumeBuilder = () => {
    setIsResumeModalOpen(true);
  };

  const handleOpenCoverLetter = () => {
    setIsCoverLetterModalOpen(true);
  };

  const handleOpenSecurityModal = (mode: SecurityModalMode = 'unlock') => {
    setSecurityModalMode(mode);
    setIsAdminPasscodeModalOpen(true);
  };

  const handleOpenCloudScanModal = () => {
    if (isAdminAuthenticated()) {
      setIsCloudScanModalOpen(true);
    }
  };

  const handleLogoutAdmin = () => {
    setIsCloudScanModalOpen(false);
    logoutAdmin();
    setIsAdmin(false);
    setIsOwnerVerified(false);
    if (route.type === 'admin') {
      navigateTo('/');
    }
  };

  const handleSecurityModalSuccess = (completedMode: SecurityModalMode) => {
    setIsAdmin(true);
    setIsAdminPasscodeModalOpen(false);
    if (completedMode === 'unlock') {
      if (route.type !== 'admin') {
        navigateTo('/admin');
      }
      setIsCloudScanModalOpen(true);
    }
  };

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
          <AdminPortal
            onBack={() => navigateTo('/')}
            initialTab={route.initialTab || 'overview'}
            onOpenResumeBuilder={handleOpenResumeBuilder}
            onOpenCoverLetter={handleOpenCoverLetter}
            onOpenMainSecurity={handleOpenSecurityModal}
            onOpenCloudScan={handleOpenCloudScanModal}
          />
        )}

        {route.type === 'blog-list' && (
          <BlogList
            onSelectPost={(slug) => navigateTo(`/blog/${slug}`)}
          />
        )}

        {route.type === 'blog-post' && (
          <BlogPost
            slug={route.slug}
            onBackToBlog={() => navigateTo('/blog')}
            onSelectPost={(slug) => navigateTo(`/blog/${slug}`)}
            onOpenContact={() => navigateToHomeSection('#contact')}
          />
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

      {/* Resume Builder Modal */}
      {isResumeModalOpen && (
        <ResumeBuilderModal
          isOpen={isResumeModalOpen}
          onClose={() => setIsResumeModalOpen(false)}
          onOpenCoverLetter={handleOpenCoverLetter}
        />
      )}

      {/* Cover Letter Generator Modal */}
      {isCoverLetterModalOpen && (
        <CoverLetterGeneratorModal
          isOpen={isCoverLetterModalOpen}
          onClose={() => setIsCoverLetterModalOpen(false)}
        />
      )}

      {/* Single External Main Security System Modal */}
      {isAdminPasscodeModalOpen && (
        <AdminPasscodeModal
          isOpen={isAdminPasscodeModalOpen}
          initialMode={securityModalMode}
          onClose={() => setIsAdminPasscodeModalOpen(false)}
          onSuccess={handleSecurityModalSuccess}
          title="Main System Security"
          description="Enter your password to unlock full portfolio management or update your password."
        />
      )}

      {/* Admin-Exclusive Pre-Git Cloud Scan & Backup Reminder Modal */}
      {isAdmin && isCloudScanModalOpen && (
        <AdminCloudScanModal
          isOpen={isCloudScanModalOpen}
          onClose={() => setIsCloudScanModalOpen(false)}
        />
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
