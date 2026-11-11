import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  X,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import {
  isAdminAuthenticated,
  recordAdminActivity,
  ADMIN_AUTH_CHANGED_EVENT,
} from '../utils/adminAuth';
import {
  CLOUD_AUTO_SCAN_COMPLETED_EVENT,
  CLOUD_SYNC_STATUS_EVENT,
  CloudSyncStatus,
  getCloudSyncStatus,
  isEmbeddedInAppWebView,
  signInOwnerWithGoogle,
  signOutOwnerFromGoogle,
  syncAllLocalDataToCloud,
} from '../utils/cloudSync';
import { PRIMARY_OWNER_EMAIL } from '../firebase';
import {
  getStoredPortfolioData,
  PORTFOLIO_UPDATED_EVENT,
} from '../utils/portfolioStore';
import { getStoredBlogPosts, BLOGS_UPDATED_EVENT } from '../utils/blogStore';

export const CLOUD_PROMPT_DISMISSED_SESSION_KEY = 'sabbir_cloud_prompt_dismissed';

interface AdminCloudScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function readLiveCounts() {
  const portfolio = getStoredPortfolioData();
  const blogs = getStoredBlogPosts();
  const skillItems = portfolio.skills.reduce((sum, cat) => sum + cat.items.length, 0);
  return {
    projects: portfolio.projects.length,
    blogs: blogs.length,
    experiences: portfolio.experiences.length,
    roadmap: portfolio.careerRoadmap.length,
    references: portfolio.references.length,
    skills: skillItems,
  };
}

export default function AdminCloudScanModal({
  isOpen,
  onClose,
}: AdminCloudScanModalProps) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(() =>
    getCloudSyncStatus()
  );
  const [localCounts, setLocalCounts] = useState(readLiveCounts);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [lastErrorCode, setLastErrorCode] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isInAppWebView = isEmbeddedInAppWebView();

  useEffect(() => {
    const syncCounts = () => setLocalCounts(readLiveCounts());

    const handleCloudStatus = (e: Event) => {
      const custom = e as CustomEvent<CloudSyncStatus>;
      setCloudStatus(custom.detail || getCloudSyncStatus());
    };

    const handleAuthChanged = () => {
      const authed = isAdminAuthenticated();
      setIsAdmin(authed);
      if (!authed) onClose();
    };

    const handleAutoScanCompleted = () => {
      setIsSyncingNow(false);
      setLastErrorCode('');
      setFeedback({
        type: 'success',
        message: 'সব প্রজেক্ট, ব্লগ, স্টোরি, রোডম্যাপ, রেফারেন্স, স্কিল ও প্রোফাইল সফলভাবে সেভ হয়েছে।',
      });
    };

    syncCounts();
    setCloudStatus(getCloudSyncStatus());

    window.addEventListener(PORTFOLIO_UPDATED_EVENT, syncCounts);
    window.addEventListener(BLOGS_UPDATED_EVENT, syncCounts);
    window.addEventListener(CLOUD_SYNC_STATUS_EVENT, handleCloudStatus);
    window.addEventListener(CLOUD_AUTO_SCAN_COMPLETED_EVENT, handleAutoScanCompleted);
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);

    return () => {
      window.removeEventListener(PORTFOLIO_UPDATED_EVENT, syncCounts);
      window.removeEventListener(BLOGS_UPDATED_EVENT, syncCounts);
      window.removeEventListener(CLOUD_SYNC_STATUS_EVENT, handleCloudStatus);
      window.removeEventListener(CLOUD_AUTO_SCAN_COMPLETED_EVENT, handleAutoScanCompleted);
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);
    };
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setLastErrorCode('');
      setIsAdmin(isAdminAuthenticated());
      const current = getCloudSyncStatus();
      setCloudStatus(current);
      if (!current.isSyncing && !current.isOwnerConnected) {
        setFeedback(null);
      }
      setLocalCounts(readLiveCounts());
    }
  }, [isOpen]);

  if (!isOpen || !isAdmin) {
    return null;
  }

  const dismissAndClose = () => {
    recordAdminActivity();
    try {
      sessionStorage.setItem(CLOUD_PROMPT_DISMISSED_SESSION_KEY, '1');
    } catch {
      // ignore
    }
    onClose();
  };

  const handleConnectAndSync = async (forceAccountPicker = false) => {
    if (isSyncingNow || cloudStatus.isSyncing) return;

    setFeedback(null);
    setLastErrorCode('');
    setIsSyncingNow(true);

    try {
      if (!cloudStatus.firebaseConnected) {
        const signInRes = await signInOwnerWithGoogle(PRIMARY_OWNER_EMAIL, forceAccountPicker);
        if (!signInRes.success) {
          setLastErrorCode(signInRes.errorCode || '');
          setFeedback({
            type: 'error',
            message: signInRes.error || 'Google সাইন-ইন সম্পন্ন হয়নি। আবার চেষ্টা করুন।',
          });
          setIsSyncingNow(false);
          return;
        }
      }

      const syncRes = await syncAllLocalDataToCloud();
      if (syncRes.success) {
        setFeedback({
          type: 'success',
          message:
            'সব প্রজেক্ট, ব্লগ, স্টোরি, রোডম্যাপ, রেফারেন্স, স্কিল ও প্রোফাইল সফলভাবে সেভ ও সিঙ্ক হয়েছে!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: syncRes.error || 'সেভ সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'সিঙ্কে সাময়িক সমস্যা হয়েছে। আপনার ডাটা ডিভাইসে সুরক্ষিত আছে।',
      });
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleDisconnectOwner = async () => {
    recordAdminActivity();
    await signOutOwnerFromGoogle();
    setFeedback(null);
  };

  const busy = isSyncingNow || cloudStatus.isSyncing;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-account-sync-title"
    >
      <div className="relative w-full max-w-xl bg-[#0E1320] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl text-white space-y-4 my-auto max-h-[92dvh] overflow-y-auto">
        <button
          type="button"
          onClick={dismissAndClose}
          className="absolute top-3.5 right-3.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close Account Sync Dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-11">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="text-emerald-400 font-medium">Owner Account</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{PRIMARY_OWNER_EMAIL}</span>
            </div>
            <h2
              id="admin-account-sync-title"
              className="font-display font-bold text-lg sm:text-xl text-white tracking-tight"
            >
              Cross-Device Portfolio Sync
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 rounded-xl bg-[#090D16] border border-white/10 p-3 text-center">
          <div className="space-y-0.5">
            <div className="text-base font-display font-bold text-white tabular-nums">
              {localCounts.projects}
            </div>
            <div className="text-[11px] text-slate-400">Projects</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-base font-display font-bold text-white tabular-nums">
              {localCounts.blogs}
            </div>
            <div className="text-[11px] text-slate-400">Blogs</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-base font-display font-bold text-white tabular-nums">
              {localCounts.experiences}
            </div>
            <div className="text-[11px] text-slate-400">Story</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-base font-display font-bold text-white tabular-nums">
              {localCounts.roadmap}
            </div>
            <div className="text-[11px] text-slate-400">Roadmap</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-base font-display font-bold text-white tabular-nums">
              {localCounts.references}
            </div>
            <div className="text-[11px] text-slate-400">Refs</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-base font-display font-bold text-white tabular-nums">
              {localCounts.skills}
            </div>
            <div className="text-[11px] text-slate-400">Skills</div>
          </div>
        </div>

        <div
          className={`rounded-2xl p-4 border space-y-3 ${
            cloudStatus.firebaseConnected
              ? 'bg-emerald-500/10 border-emerald-500/35'
              : 'bg-sky-500/10 border-sky-500/30'
          }`}
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white">
              <span>
                {cloudStatus.firebaseConnected
                  ? `Connected as ${cloudStatus.ownerEmail || PRIMARY_OWNER_EMAIL}`
                  : `Sign in with ${PRIMARY_OWNER_EMAIL}`}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {cloudStatus.firebaseConnected
                ? 'অ্যাকাউন্ট কানেক্টেড আছে। যেকোনো প্রোফাইল, ছবি, প্রজেক্ট বা ব্লগ আপডেট করলেই সাথে সাথে ফোনে ও সব ডিভাইসে দেখা যাবে।'
                : 'একবার Google অ্যাকাউন্ট দিয়ে কানেক্ট করলে ডেস্কটপ ও ফোন থেকে করা সব আপডেট সরাসরি লাইভ সাইটে সিঙ্ক থাকবে।'}
            </p>
          </div>

          {!cloudStatus.firebaseConnected && isInAppWebView && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
              ইন-অ্যাপ ব্রাউজারে Google লগইন বন্ধ থাকে। অনুগ্রহ করে <strong>Chrome</strong> বা{' '}
              <strong>Safari</strong> ব্রাউজারে ওপেন করুন।
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => handleConnectAndSync(false)}
              disabled={busy}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${busy ? 'animate-spin' : ''}`} />
              <span>
                {busy
                  ? 'Saving & Syncing...'
                  : cloudStatus.firebaseConnected
                  ? 'Save & Sync All Updates'
                  : `Sign in & Sync (${PRIMARY_OWNER_EMAIL})`}
              </span>
            </button>

            {cloudStatus.firebaseConnected && (
              <button
                type="button"
                onClick={handleDisconnectOwner}
                disabled={busy}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {cloudStatus.lastSyncedAt && (
          <div className="flex items-center justify-between gap-3 text-xs text-slate-300 px-1">
            <span className="text-slate-400 shrink-0">Last Sync</span>
            <span className="font-mono tabular-nums text-emerald-300 truncate">
              {new Date(cloudStatus.lastSyncedAt).toLocaleString()}
            </span>
          </div>
        )}

        {(feedback || cloudStatus.error) && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-2.5 ${
              feedback?.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedback?.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              )}
              <span>{feedback?.message || cloudStatus.error}</span>
            </div>

            {lastErrorCode === 'auth/wrong-owner-email' && (
              <button
                type="button"
                onClick={() => handleConnectAndSync(true)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>সঠিক ইমেইল বেছে নিন ({PRIMARY_OWNER_EMAIL})</span>
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={dismissAndClose}
            disabled={busy}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
