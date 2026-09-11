/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Admin Passcode Login Modal
 * Description : Secure modal dialog requiring Admin Passcode before granting
 *               author access. Password field is strictly masked with backend
 *               validation and no client-side plaintext disclosures.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-08-04
 * -----------------------------------------
 */

import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, X, Check, Loader2 } from 'lucide-react';
import { verifyAdminPasscode } from '../utils/adminAuth';

interface AdminPasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function AdminPasscodeModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  title,
  description 
}: AdminPasscodeModalProps) {
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isSubmitting) return;

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const isValid = await verifyAdminPasscode(passcode);
      if (isValid) {
        setPasscode('');
        onSuccess();
        onClose();
      } else {
        setErrorMsg('Invalid Passcode! Access Denied.');
      }
    } catch (err) {
      setErrorMsg('Authentication error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#12151C] border border-[#FF6B35]/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35]">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="font-display font-extrabold text-xl text-white">
            {title || 'Admin Passcode Required'}
          </h3>
          <p className="text-xs font-mono text-[#9CA3AF] max-w-xs mx-auto">
            {description || 'Only authorized author can create, edit, or delete blog articles. Please enter your Admin Security Key.'}
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#FF6B35]" />
              Enter Admin Passcode
            </label>
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/20 text-sm font-mono text-white placeholder:text-white/30 focus:border-[#FF6B35] focus:outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-[#D1D5DB] font-mono text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="shimmer px-6 py-2.5 rounded-full bg-[#FF6B35] hover:bg-[#FF814F] text-white font-mono text-xs font-bold shadow-lg shadow-[#FF6B35]/25 cursor-pointer flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Unlock Admin Access</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
