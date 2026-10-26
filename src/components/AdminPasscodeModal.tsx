/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Main External Security & Password System Modal
 * Description : Single centralized external lock & password update modal controlling
 *               the entire portfolio CMS system, with VisualViewport mobile keyboard
 *               adaptation and live server-persisted password update support.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-24
 * -----------------------------------------
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  X,
  Check,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Home,
} from 'lucide-react';
import {
  verifyAdminPasscode,
  updateAdminPasscode,
  isAdminAuthenticated,
} from '../utils/adminAuth';
import { useMobileKeyboardViewport } from '../utils/useMobileKeyboardViewport';

export type SecurityModalMode = 'unlock' | 'change-password';

interface AdminPasscodeModalProps {
  isOpen: boolean;
  initialMode?: SecurityModalMode;
  onClose: () => void;
  onSuccess: (mode: SecurityModalMode) => void;
  returnHomeOnCancel?: boolean;
  title?: string;
  description?: string;
}

export default function AdminPasscodeModal({
  isOpen,
  initialMode = 'unlock',
  onClose,
  onSuccess,
  returnHomeOnCancel = false,
  title,
  description,
}: AdminPasscodeModalProps) {
  const [mode, setMode] = useState<SecurityModalMode>(initialMode);

  // Unlock state
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  // Update password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);
  const unlockInputRef = useRef<HTMLInputElement>(null);
  const currentPassInputRef = useRef<HTMLInputElement>(null);

  const {
    viewportHeight,
    offsetTop,
    isKeyboardOpen,
    isMobileViewport,
    isInputFocused,
    setIsInputFocused,
    scrollElementIntoView,
  } = useMobileKeyboardViewport(isOpen);

  const isCompactMobileKeyboard = isKeyboardOpen || (isMobileViewport && isInputFocused);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setPasscode('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
      setSuccessMsg('');
      setShowPasscode(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (isOpen && isCompactMobileKeyboard) {
      scrollElementIntoView(cardRef.current);
    }
  }, [isOpen, isCompactMobileKeyboard, viewportHeight, scrollElementIntoView]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        e.preventDefault();
        setIsInputFocused(false);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose, setIsInputFocused]);

  if (!isOpen) return null;

  const isAlreadyUnlocked = isAdminAuthenticated();

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isSubmitting) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const isValid = await verifyAdminPasscode(passcode);
      if (isValid) {
        setPasscode('');
        setIsInputFocused(false);
        onSuccess('unlock');
        onClose();
      } else {
        setErrorMsg('Incorrect password. Please try again.');
      }
    } catch {
      setErrorMsg('Authentication error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword.trim()) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.trim().length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateAdminPasscode(currentPassword, newPassword);
      if (result.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg('Password updated! Your new password is now active.');
        setTimeout(() => {
          setIsInputFocused(false);
          onSuccess('change-password');
          onClose();
        }, 900);
      } else {
        setErrorMsg(result.error || 'Failed to update password.');
      }
    } catch {
      setErrorMsg('Network error while updating password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: SecurityModalMode) => {
    setMode(nextMode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleDismiss = () => {
    if (isSubmitting) return;
    setIsInputFocused(false);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
      className={`fixed inset-x-0 z-[80] flex justify-center bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain transition-all duration-150 ${
        isCompactMobileKeyboard
          ? 'items-start px-3 pt-3 pb-6'
          : 'items-center p-4'
      }`}
      style={{
        top: `${offsetTop}px`,
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
      }}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md bg-[#0E1422] border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl text-white transition-all duration-150 my-auto ${
          isCompactMobileKeyboard
            ? 'p-4 sm:p-7 space-y-3.5 mt-1 mb-4'
            : 'p-6 sm:p-8 space-y-5'
        }`}
        style={{ borderColor: 'var(--color-border-subtle, rgba(0,210,255,0.3))' }}
      >
        {/* Close button (44x44 touch hitbox) */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
          aria-label={returnHomeOnCancel ? 'Close and Return to Home Page' : 'Close Security Modal'}
          title={returnHomeOnCancel ? 'Back to Home Page' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        {isCompactMobileKeyboard ? (
          <div className="flex items-center gap-3 pr-10">
            <div
              className="p-2.5 rounded-xl border text-[var(--color-accent)] shrink-0"
              style={{
                backgroundColor: 'rgba(var(--color-accent-rgb, 0, 210, 255), 0.12)',
                borderColor: 'rgba(var(--color-accent-rgb, 0, 210, 255), 0.3)',
              }}
            >
              {mode === 'change-password' ? (
                <KeyRound className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-base text-white truncate">
                {mode === 'change-password'
                  ? 'Update Main Password'
                  : title || 'Main System Security'}
              </h3>
              <p className="text-[11px] text-[#9CA3AF] truncate">
                {mode === 'change-password'
                  ? 'Verify current password & set new password'
                  : 'Enter password to unlock full portfolio system'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2.5 pt-1">
            <div
              className="inline-flex p-3 rounded-2xl border text-[var(--color-accent)]"
              style={{
                backgroundColor: 'rgba(var(--color-accent-rgb, 0, 210, 255), 0.12)',
                borderColor: 'rgba(var(--color-accent-rgb, 0, 210, 255), 0.3)',
              }}
            >
              {mode === 'change-password' ? (
                <KeyRound className="w-7 h-7" />
              ) : (
                <ShieldCheck className="w-7 h-7" />
              )}
            </div>
            <h3 className="font-display font-extrabold text-xl text-white">
              {mode === 'change-password'
                ? 'Update System Password'
                : title || 'Main System Security'}
            </h3>
            <p className="text-xs font-mono text-[#9CA3AF] max-w-xs mx-auto leading-relaxed">
              {mode === 'change-password'
                ? 'Change the master password for your portfolio security system.'
                : description ||
                  'Enter your password to unlock full portfolio management.'}
            </p>
          </div>
        )}

        {/* Mode Switcher Tabs (Unlock vs Update Password) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          <button
            type="button"
            onClick={() => switchMode('unlock')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'unlock'
                ? 'bg-[var(--color-accent)] text-black shadow-md'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>{isAlreadyUnlocked ? 'Verify Lock' : 'Unlock System'}</span>
          </button>

          <button
            type="button"
            onClick={() => switchMode('change-password')}
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'change-password'
                ? 'bg-[var(--color-accent)] text-black shadow-md'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>Update Password</span>
          </button>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {mode === 'unlock' ? (
          <form onSubmit={handleUnlockSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="cms-admin-passcode-input"
                className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>System Password</span>
              </label>
              <div className="relative">
                <input
                  ref={unlockInputRef}
                  id="cms-admin-passcode-input"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  onFocus={() => {
                    setIsInputFocused(true);
                    scrollElementIntoView(unlockInputRef.current);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setIsInputFocused(false), 120);
                  }}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  autoFocus={!isMobileViewport}
                  required
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] pl-4 pr-12 py-3 rounded-xl bg-white/[0.06] border border-white/20 text-base sm:text-sm font-mono text-white placeholder:text-white/30 focus:border-[var(--color-accent)] focus:bg-white/[0.09] focus:outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPasscode(!showPasscode)}
                  disabled={isSubmitting}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#9CA3AF] hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/10"
                  title={showPasscode ? 'Hide Password' : 'Show Password'}
                  aria-label={showPasscode ? 'Hide Password' : 'Show Password'}
                >
                  {showPasscode ? (
                    <EyeOff className="w-4 h-4 text-[var(--color-accent)]" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleDismiss}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white font-mono text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {returnHomeOnCancel && <Home className="w-3.5 h-3.5 shrink-0" />}
                <span>{returnHomeOnCancel ? 'Back to Home' : 'Cancel'}</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="shimmer flex-1 sm:flex-initial min-h-[44px] px-5 sm:px-6 py-2.5 rounded-xl text-black font-mono text-xs font-bold shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  boxShadow: '0 8px 20px -5px var(--color-accent-glow)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black shrink-0" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Unlock System</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUpdatePasswordSubmit} className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="current-admin-password"
                className="text-xs font-mono text-[#D1D5DB] font-semibold"
              >
                Current Password
              </label>
              <div className="relative">
                <input
                  ref={currentPassInputRef}
                  id="current-admin-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onFocus={() => {
                    setIsInputFocused(true);
                    scrollElementIntoView(currentPassInputRef.current);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setIsInputFocused(false), 120);
                  }}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] pl-3.5 pr-11 py-2.5 rounded-xl bg-white/[0.06] border border-white/20 text-base sm:text-sm font-mono text-white placeholder:text-white/30 focus:border-[var(--color-accent)] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[38px] min-h-[38px] flex items-center justify-center text-[#9CA3AF] hover:text-white cursor-pointer rounded-lg"
                  aria-label="Toggle current password visibility"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4 text-[var(--color-accent)]" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="new-admin-password"
                className="text-xs font-mono text-[#D1D5DB] font-semibold"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-admin-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={(e) => {
                    setIsInputFocused(true);
                    scrollElementIntoView(e.currentTarget);
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setIsInputFocused(false), 120);
                  }}
                  placeholder="Minimum 4 characters"
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] pl-3.5 pr-11 py-2.5 rounded-xl bg-white/[0.06] border border-white/20 text-base sm:text-sm font-mono text-white placeholder:text-white/30 focus:border-[var(--color-accent)] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[38px] min-h-[38px] flex items-center justify-center text-[#9CA3AF] hover:text-white cursor-pointer rounded-lg"
                  aria-label="Toggle new password visibility"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4 text-[var(--color-accent)]" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="confirm-admin-password"
                className="text-xs font-mono text-[#D1D5DB] font-semibold"
              >
                Confirm New Password
              </label>
              <input
                id="confirm-admin-password"
                type={showNewPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={(e) => {
                  setIsInputFocused(true);
                  scrollElementIntoView(e.currentTarget);
                }}
                onBlur={() => {
                  window.setTimeout(() => setIsInputFocused(false), 120);
                }}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                enterKeyHint="done"
                required
                disabled={isSubmitting}
                className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/20 text-base sm:text-sm font-mono text-white placeholder:text-white/30 focus:border-[var(--color-accent)] focus:outline-none transition-all"
              />
            </div>

            <div className="pt-1.5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleDismiss}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white font-mono text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {returnHomeOnCancel && <Home className="w-3.5 h-3.5 shrink-0" />}
                <span>{returnHomeOnCancel ? 'Back to Home' : 'Cancel'}</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="shimmer flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-xl text-black font-mono text-xs font-bold shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  boxShadow: '0 8px 20px -5px var(--color-accent-glow)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black shrink-0" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Save New Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
