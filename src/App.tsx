/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Main React Application Component
 * Description : Core SPA component organizing navigation bar, Hero section, SQA Skills Grid,
 *               ATS Resume & Cover Letter callouts, Portfolio Projects, Experience Timeline,
 *               Career Vision, Education & References, and Contact Form.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-07-29
 * -----------------------------------------
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SkillsGrid from './components/SkillsGrid';
import Projects from './components/Projects';
import BlogSection from './components/BlogSection';
import ExperienceTimeline from './components/ExperienceTimeline';
import CareerVision from './components/CareerVision';
import EducationAndReferences from './components/EducationAndReferences';
import Contact from './components/Contact';
import VisitorCounter from './components/VisitorCounter';
import ResumeBuilderModal from './components/ResumeBuilderModal';
import CoverLetterGeneratorModal from './components/CoverLetterGeneratorModal';
import BlogList from './components/BlogList';
import BlogPost from './components/BlogPost';
import AdminPortal from './components/AdminPortal';
import AdminQuickAccess from './components/AdminQuickAccess';
import { getCurrentRoute, navigateTo, navigateToHomeSection, AppRoute } from './utils/router';
import { isAdminAuthenticated, verifyOwnerWithServer, logoutAdmin } from './utils/adminAuth';
import { initializePortfolioStoreFromServer } from './utils/portfolioStore';
import { ShieldCheck, ArrowRight, CheckCircle2, Lock, Settings } from 'lucide-react';
import AdminPasscodeModal from './components/AdminPasscodeModal';

/**
 * Main application component layout wrapper
 *
 * @returns {React.ReactNode} The rendered portfolio application view
 */
export default function App(): React.ReactNode {
  const [dark, setDark] = useState<boolean>(true);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState<boolean>(false);
  const [isCoverLetterModalOpen, setIsCoverLetterModalOpen] = useState<boolean>(false);
  const [route, setRoute] = useState<AppRoute>(() => getCurrentRoute());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [isOwnerVerified, setIsOwnerVerified] = useState<boolean>(false);
  const [isAdminPasscodeModalOpen, setIsAdminPasscodeModalOpen] = useState<boolean>(false);
  const [adminChallengeAction, setAdminChallengeAction] = useState<'resume' | 'coverLetter' | null>(null);

  useEffect(() => {
    // Force dark theme class on document element for consistent luxury dark styling
    document.documentElement.classList.add('dark');
  }, [dark]);

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
      }
    };

    syncAdmin();
    initializePortfolioStoreFromServer();

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('admin_auth_changed', syncAdmin);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('admin_auth_changed', syncAdmin);
    };
  }, []);

  const handleOpenResumeBuilder = () => {
    if (!isAdminAuthenticated()) {
      setAdminChallengeAction('resume');
      setIsAdminPasscodeModalOpen(true);
      return;
    }
    setIsResumeModalOpen(true);
  };

  const handleOpenCoverLetter = () => {
    if (!isAdminAuthenticated()) {
      setAdminChallengeAction('coverLetter');
      setIsAdminPasscodeModalOpen(true);
      return;
    }
    setIsCoverLetterModalOpen(true);
  };

  const handleOpenAdminLogin = () => {
    setAdminChallengeAction(null);
    setIsAdminPasscodeModalOpen(true);
  };

  const handleLogoutAdmin = () => {
    logoutAdmin();
    setIsAdmin(false);
    setIsOwnerVerified(false);
    if (route.type === 'admin') {
      navigateTo('/');
    }
  };

  const handleAdminPasscodeSuccess = () => {
    setIsAdmin(true);
    setIsAdminPasscodeModalOpen(false);
    if (adminChallengeAction === 'resume') {
      setIsResumeModalOpen(true);
    } else if (adminChallengeAction === 'coverLetter') {
      setIsCoverLetterModalOpen(true);
    } else {
      navigateTo('/admin');
    }
    setAdminChallengeAction(null);
  };

  const currentPath = window.location.pathname;

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F3F4F6] flex flex-col font-sans selection:bg-[#FF6B35] selection:text-white">
      {/* Navigation Header */}
      <Navbar 
        dark={dark} 
        setDark={setDark} 
        onOpenResumeBuilder={handleOpenResumeBuilder}
        onOpenCoverLetter={handleOpenCoverLetter}
        currentPath={currentPath}
      />

      {/* Main Page Sections or Blog Page or Admin Page */}
      <main className="flex-grow">
        {route.type === 'admin' && (
          <AdminPortal
            onBack={() => navigateTo('/')}
            initialTab={route.initialTab || 'projects'}
            onOpenResumeBuilder={handleOpenResumeBuilder}
            onOpenCoverLetter={handleOpenCoverLetter}
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

        {route.type === 'home' && (
          <>
            <Hero 
              onOpenResumeBuilder={handleOpenResumeBuilder} 
              onOpenCoverLetter={handleOpenCoverLetter}
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
            <Contact onOpenResumeBuilder={handleOpenResumeBuilder} />
          </>
        )}
      </main>

      {/* Resume Builder Modal */}
      {isResumeModalOpen && (
        <ResumeBuilderModal 
          isOpen={isResumeModalOpen}
          onClose={() => setIsResumeModalOpen(false)}
          onOpenCoverLetter={handleOpenCoverLetter}
        />
      )}

      {/* AI Cover Letter Generator Modal */}
      {isCoverLetterModalOpen && (
        <CoverLetterGeneratorModal
          isOpen={isCoverLetterModalOpen}
          onClose={() => setIsCoverLetterModalOpen(false)}
        />
      )}

      {/* Passcode Challenge Modal */}
      {isAdminPasscodeModalOpen && (
        <AdminPasscodeModal
          isOpen={isAdminPasscodeModalOpen}
          onClose={() => {
            setIsAdminPasscodeModalOpen(false);
            setAdminChallengeAction(null);
          }}
          onSuccess={handleAdminPasscodeSuccess}
          title={adminChallengeAction === 'resume' ? 'Resume Builder Admin Access' : 'Cover Letter Generator Admin Access'}
          description={adminChallengeAction === 'resume' 
            ? 'Only the verified portfolio administrator (Sabbir Ahamed) has permission to create and download ATS Resumes. Enter your Admin Passcode to proceed.' 
            : 'Only the verified portfolio administrator (Sabbir Ahamed) has permission to generate and download Cover Letters. Enter your Admin Passcode to proceed.'
          }
        />
      )}

      {/* Footer */}
      <footer className="bg-[#090A0E] border-t border-white/10 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Portfolio Admin Management System - VIEWED ONLY AFTER ADMIN LOGIN, HIDDEN WHEN LOGGED OUT */}
          {isAdmin && (
            <div className="rounded-2xl bg-[#10131A] border border-[#FF6B35]/40 hover:border-[#FF6B35] transition-all p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl animate-fadeIn">
              <div className="flex items-center gap-3.5 text-center md:text-left">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="font-display font-bold text-white text-sm sm:text-base tracking-tight">
                      Portfolio Admin Management System
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Admin Active</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#9CA3AF] font-light max-w-2xl">
                    Full Administrative Control: Add, edit & delete Projects, Work Experience, Technical Skills, Blog Articles & Profile details.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigateTo('/admin')}
                  className="shimmer inline-flex items-center space-x-2 px-4 py-2.5 rounded-full bg-[#FF6B35] hover:bg-[#FF814F] text-white font-mono text-xs font-bold shadow-lg shadow-[#FF6B35]/25 transition-all hover:scale-105 cursor-pointer"
                  title="Launch Portfolio Admin Management System"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Open Admin Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleLogoutAdmin}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
                  title="Logout and Lock Admin System"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Footer Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
            {/* Branding & Subtitle */}
            <div className="flex items-center space-x-3 text-center sm:text-left">
              <div className="bg-[#FF6B35]/10 p-2 rounded-xl border border-[#FF6B35]/25 shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <div>
                <span className="font-display font-extrabold text-white text-base tracking-tight block">
                  Sabbir<span className="text-[#FF6B35]">.QA</span>
                </span>
                <span className="text-xs text-[#9CA3AF] font-mono">
                  Software Quality Assurance Engineer
                </span>
              </div>
            </div>

            {/* Formal Verified Traffic Counter */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#12151C] border border-white/10 shadow-sm">
              <span className="text-xs font-mono text-[#9CA3AF] tracking-wide">Live Traffic:</span>
              <VisitorCounter variant="navbar" tooltipPlacement="top" />
            </div>
          </div>

          {/* Sub-Footer Copyright & Credits with Discreet Admin Login */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#9CA3AF] text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <p>© {new Date().getFullYear()} Sabbir Ahamed. All rights reserved.</p>
              <span className="hidden sm:inline text-white/20">•</span>
              {isAdmin ? (
                <div className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Admin Session Active</span>
                  <button 
                    onClick={handleLogoutAdmin}
                    className="ml-1 text-red-400 hover:text-red-300 underline underline-offset-2 cursor-pointer"
                  >
                    (Logout)
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleOpenAdminLogin}
                  className="inline-flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#FF6B35] transition-colors cursor-pointer"
                  title="Admin Access Login (Passcode Protected)"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>Admin Login</span>
                </button>
              )}
            </div>

            <p className="font-sans text-[#D1D5DB] font-light">
              Designed & Developed by <span className="text-white font-medium">Sabbir Ahamed</span> — Software Quality Assurance Engineer
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Modern Admin Quick Access Dock */}
      <AdminQuickAccess 
        currentPath={currentPath} 
        onOpenLogin={handleOpenAdminLogin}
        onLogout={handleLogoutAdmin}
      />
    </div>
  );
}
