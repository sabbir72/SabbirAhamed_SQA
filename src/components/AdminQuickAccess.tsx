/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Admin Quick Access Floating Dock
 * Description : An aesthetically pleasing, discreet floating trigger for the unified
 *               Portfolio Admin CMS. Replaces cluttered navbar links with a modern,
 *               high-tech glassmorphism button protected by the Common Passcode.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-07
 * -----------------------------------------
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, KeyRound, Sparkles, X, ChevronRight } from 'lucide-react';
import { isAdminAuthenticated } from '../utils/adminAuth';
import { navigateTo } from '../utils/router';

interface AdminQuickAccessProps {
  currentPath?: string;
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

export default function AdminQuickAccess({ 
  currentPath = '/', 
  onOpenLogin,
  onLogout 
}: AdminQuickAccessProps) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Sync admin authentication state across tabs & events
  useEffect(() => {
    const handleAuthChange = () => {
      setIsAdmin(isAdminAuthenticated());
    };

    window.addEventListener('admin_auth_changed', handleAuthChange);
    return () => window.removeEventListener('admin_auth_changed', handleAuthChange);
  }, []);

  // Keyboard shortcut listener: Ctrl + Shift + A (or Cmd + Shift + A) to open Admin Portal or Login
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (isAdmin) {
          navigateTo('/admin');
        } else if (onOpenLogin) {
          onOpenLogin();
        } else {
          navigateTo('/admin');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, onOpenLogin]);

  // If already on the /admin page, do not display the floating button
  if (currentPath === '/admin' || currentPath.startsWith('/admin')) {
    return null;
  }

  // Handle opening admin
  const handleOpenAdmin = () => {
    if (isAdmin) {
      navigateTo('/admin');
    } else if (onOpenLogin) {
      onOpenLogin();
    } else {
      navigateTo('/admin');
    }
  };

  // If logged out: Show only a discreet, minimal lock trigger (Portfolio Admin Management System is HIDDEN)
  if (!isAdmin) {
    return (
      <aside 
        className="fixed bottom-5 right-5 z-40 select-none font-mono"
        aria-label="Admin Login Dock"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={handleOpenAdmin}
          className="group flex items-center justify-center w-9 h-9 rounded-full bg-[#12151C]/80 hover:bg-[#12151C] border border-white/10 hover:border-[var(--color-accent)]/50 text-[#6B7280] hover:text-[var(--color-accent)] shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 cursor-pointer"
          title="Admin Access Login (Passcode Protected)"
          aria-label="Admin Login"
        >
          <Lock className="w-3.5 h-3.5 group-hover:rotate-6 transition-transform" />
        </button>

        {isHovered && (
          <div className="absolute -top-8 right-0 bg-[#090A0E] text-[#D1D5DB] border border-white/15 px-2.5 py-1 rounded-md text-[10px] whitespace-nowrap shadow-xl pointer-events-none animate-fadeIn">
            Admin Login <kbd className="px-1 py-0.5 rounded bg-white/10 text-white font-semibold ml-1">Ctrl+Shift+A</kbd>
          </div>
        )}
      </aside>
    );
  }

  // When logged in as Admin: Full "Portfolio Admin Management System" dock is VIEWED!
  return (
    <aside 
      className="fixed bottom-5 right-5 z-40 select-none font-mono animate-fadeIn"
      aria-label="Portfolio Admin Management Dock"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isMinimized ? (
        // Minimized Orb
        <button
          onClick={() => setIsMinimized(false)}
          className="group flex items-center justify-center w-11 h-11 rounded-full shadow-2xl transition-all duration-300 backdrop-blur-xl border border-emerald-500/50 hover:border-emerald-400 bg-[#12151C]/90 text-emerald-400 shadow-emerald-500/20 hover:scale-110 cursor-pointer relative"
          title="Expand Portfolio Admin Management System"
          aria-label="Expand Admin Dock"
        >
          <ShieldCheck className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0B0D12] bg-emerald-400 animate-pulse" />
        </button>
      ) : (
        // Full Polished Floating Pill
        <div className="relative flex items-center gap-2 px-3.5 py-2 rounded-full shadow-2xl backdrop-blur-xl border border-emerald-500/40 hover:border-emerald-400 bg-[#12151C]/95 shadow-emerald-950/40 transition-all duration-300">
          {/* Main Action Button */}
          <button
            onClick={handleOpenAdmin}
            className="flex items-center space-x-2.5 text-left group cursor-pointer"
            title="Open Portfolio Admin Management System"
          >
            {/* High-tech Icon Badge */}
            <div className="p-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 transition-all duration-300 group-hover:scale-110">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Label and Status */}
            <div className="flex flex-col pr-1">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs font-bold text-white tracking-wide group-hover:text-emerald-300 transition-colors">
                  Portfolio Admin CMS
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[10px] text-emerald-400/80 font-light mt-0.5 leading-none">
                Session Active • Full CRUD
              </span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Quick Logout Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onLogout) {
                onLogout();
              }
            }}
            className="p-1.5 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Logout & Hide Admin System"
            aria-label="Logout Admin"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          {/* Minimize Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="p-1 rounded-full text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Minimize Dock"
            aria-label="Minimize Admin Dock"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Shortcut Tooltip on Hover */}
          {isHovered && (
            <div className="absolute -top-8 right-0 bg-[#090A0E] text-[#D1D5DB] border border-white/15 px-2.5 py-1 rounded-md text-[10px] whitespace-nowrap shadow-xl pointer-events-none animate-fadeIn">
              Portfolio Admin System <kbd className="px-1 py-0.5 rounded bg-white/10 text-white font-semibold ml-1">Ctrl+Shift+A</kbd>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
