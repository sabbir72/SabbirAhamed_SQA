/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : External Main Security & System Controller Dock
 * Description : The SINGLE external security & lock system controlling the entire
 *               portfolio CMS, password updates, and instant system locking.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-24
 * -----------------------------------------
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, X, ChevronRight, Globe } from 'lucide-react';
import { isAdminAuthenticated } from '../utils/adminAuth';
import { navigateTo } from '../utils/router';
import { SecurityModalMode } from './AdminPasscodeModal';

interface AdminQuickAccessProps {
  currentPath?: string;
  onOpenSecurityModal?: (mode?: SecurityModalMode) => void;
  onLogout?: () => void;
}

export default function AdminQuickAccess({
  currentPath = '/',
  onOpenSecurityModal,
  onLogout,
}: AdminQuickAccessProps) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const isOnAdminPage = currentPath === '/admin' || currentPath.startsWith('/admin');

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAdmin(isAdminAuthenticated());
    };

    window.addEventListener('admin_auth_changed', handleAuthChange);
    return () => window.removeEventListener('admin_auth_changed', handleAuthChange);
  }, []);

  // Keyboard shortcut: Ctrl + Shift + A (or Cmd + Shift + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (isAdmin) {
          navigateTo(isOnAdminPage ? '/' : '/admin');
        } else if (onOpenSecurityModal) {
          onOpenSecurityModal('unlock');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, isOnAdminPage, onOpenSecurityModal]);

  const handlePrimaryAction = () => {
    if (!isAdmin) {
      if (onOpenSecurityModal) {
        onOpenSecurityModal('unlock');
      }
      return;
    }

    if (isOnAdminPage) {
      navigateTo('/');
    } else {
      navigateTo('/admin');
    }
  };

  // Locked state: Single external Main Security Lock button
  if (!isAdmin) {
    return (
      <aside
        className="fixed bottom-5 right-5 z-50 select-none font-mono"
        aria-label="Main Security System"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          onClick={handlePrimaryAction}
          className="group flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#12151C]/95 hover:bg-[#12151C] border border-white/15 hover:border-[var(--color-accent)]/60 text-[#9CA3AF] hover:text-[var(--color-accent)] shadow-2xl backdrop-blur-md transition-all duration-200 cursor-pointer"
          title="Main System Lock (Unlock or Update Password)"
          aria-label="Main System Lock"
        >
          <Lock className="w-4 h-4 transition-transform group-hover:scale-105" />
        </button>

        {isHovered && (
          <div className="hidden sm:block absolute -top-9 right-0 bg-[#090A0E] text-[#D1D5DB] border border-white/15 px-2.5 py-1 rounded-md text-[10px] whitespace-nowrap shadow-xl pointer-events-none animate-fadeIn">
            Main Security Lock <kbd className="px-1 py-0.5 rounded bg-white/10 text-white font-semibold ml-1">Ctrl+Shift+A</kbd>
          </div>
        )}
      </aside>
    );
  }

  // Unlocked state: Single external Main Security Dock controlling CMS navigation, Password Update, and System Lock
  return (
    <aside
      className="fixed bottom-5 right-5 z-50 select-none font-mono animate-fadeIn"
      aria-label="Main Security Control Dock"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isMinimized ? (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="group flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-full shadow-2xl transition-all duration-200 backdrop-blur-xl border border-emerald-500/50 hover:border-emerald-400 bg-[#12151C]/95 text-emerald-400 cursor-pointer relative"
          title="Expand Main Security Controller"
          aria-label="Expand Main Security Controller"
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0B0D12] bg-emerald-400" />
        </button>
      ) : (
        <div className="relative flex items-center gap-1.5 px-3 py-2 rounded-full shadow-2xl backdrop-blur-xl border border-emerald-500/40 hover:border-emerald-400 bg-[#12151C]/95 transition-all duration-200">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="flex items-center space-x-2.5 text-left group cursor-pointer min-h-[36px] pr-1"
            title={isOnAdminPage ? 'Return to Public Portfolio' : 'Open Portfolio CMS Dashboard'}
          >
            <div className="p-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shrink-0">
              {isOnAdminPage ? (
                <Globe className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-bold text-white tracking-wide group-hover:text-emerald-300 transition-colors whitespace-nowrap">
                  {isOnAdminPage ? 'Live Portfolio' : 'CMS Portal'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              </div>
              <span className="text-[10px] text-emerald-400/80 font-light mt-0.5 leading-none whitespace-nowrap">
                System Unlocked
              </span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          {/* Update Password Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenSecurityModal) {
                onOpenSecurityModal('change-password');
              }
            }}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-[var(--color-accent)] hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Update System Password"
            aria-label="Update System Password"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          {/* Instant Lock System Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onLogout) {
                onLogout();
              }
            }}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
            title="Lock Entire System"
            aria-label="Lock Entire System"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Minimize Dock"
            aria-label="Minimize Main Security Dock"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
}
