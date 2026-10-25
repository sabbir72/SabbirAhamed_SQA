import React, { useEffect, useState } from 'react';
import {
  Cloud,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  isAdminAuthenticated,
  recordAdminActivity,
  ADMIN_AUTH_CHANGED_EVENT,
} from '../utils/adminAuth';
import {
  CLOUD_SYNC_STATUS_EVENT,
  CloudSyncStatus,
  getCloudSyncStatus,
  signInOwnerWithGoogle,
  signOutOwnerFromGoogle,
  syncAllLocalDataToCloud,
} from '../utils/cloudSync';
import {
  getStoredPortfolioData,
  PORTFOLIO_UPDATED_EVENT,
} from '../utils/portfolioStore';
import { getStoredBlogPosts, BLOGS_UPDATED_EVENT } from '../utils/blogStore';

interface AdminCloudScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminCloudScanModal({
  isOpen,
  onClose,
}: AdminCloudScanModalProps) {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(() =>
    getCloudSyncStatus()
  );
  const [localCounts, setLocalCounts] = useState(() => {
    const portfolio = getStoredPortfolioData();
    const blogs = getStoredBlogPosts();
    return {
      projects: portfolio.projects.length,
      blogs: blogs.length,
      experiences: portfolio.experiences.length,
      lastModified: portfolio.lastModified || null,
    };
  });
  const [isScanning, setIsScanning] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    const syncLocalCounts = () => {
      const portfolio = getStoredPortfolioData();
      const blogs = getStoredBlogPosts();
      setLocalCounts({
        projects: portfolio.projects.length,
        blogs: blogs.length,
        experiences: portfolio.experiences.length,
        lastModified: portfolio.lastModified || null,
      });
    };

    const handleCloudStatus = (e: Event) => {
      const custom = e as CustomEvent<CloudSyncStatus>;
      setCloudStatus(custom.detail || getCloudSyncStatus());
    };

    const handleAuthChanged = () => {
      const authed = isAdminAuthenticated();
      setIsAdmin(authed);
      if (!authed) {
        onClose();
      }
    };

    syncLocalCounts();
    setCloudStatus(getCloudSyncStatus());

    window.addEventListener(PORTFOLIO_UPDATED_EVENT, syncLocalCounts);
    window.addEventListener(BLOGS_UPDATED_EVENT, syncLocalCounts);
    window.addEventListener(CLOUD_SYNC_STATUS_EVENT, handleCloudStatus);
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);

    return () => {
      window.removeEventListener(PORTFOLIO_UPDATED_EVENT, syncLocalCounts);
      window.removeEventListener(BLOGS_UPDATED_EVENT, syncLocalCounts);
      window.removeEventListener(CLOUD_SYNC_STATUS_EVENT, handleCloudStatus);
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);
    };
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      setIsAdmin(isAdminAuthenticated());
      setCloudStatus(getCloudSyncStatus());
      const portfolio = getStoredPortfolioData();
      const blogs = getStoredBlogPosts();
      setLocalCounts({
        projects: portfolio.projects.length,
        blogs: blogs.length,
        experiences: portfolio.experiences.length,
        lastModified: portfolio.lastModified || null,
      });
    }
  }, [isOpen]);

  // Strict Admin-only boundary: never render for unauthenticated visitors
  if (!isOpen || !isAdmin) {
    return null;
  }

  const hasUnsyncedEdits = Boolean(
    !cloudStatus.lastSyncedAt ||
      (localCounts.lastModified &&
        new Date(localCounts.lastModified).getTime() >
          new Date(cloudStatus.lastSyncedAt).getTime() + 1500)
  );

  const handleConnectAndScan = async () => {
    if (isScanning || cloudStatus.isSyncing) return;
    recordAdminActivity();
    setFeedback(null);
    setIsScanning(true);

    try {
      if (!cloudStatus.isOwnerConnected) {
        const signInRes = await signInOwnerWithGoogle();
        if (!signInRes.success) {
          setFeedback({
            type: 'error',
            message:
              signInRes.error ||
              'Google owner verification could not be completed.',
          });
          setIsScanning(false);
          return;
        }
      }

      const syncRes = await syncAllLocalDataToCloud();
      if (syncRes.success) {
        setFeedback({
          type: 'success',
          message: `স্ক্যান ও ব্যাকআপ সম্পন্ন হয়েছে (${syncRes.projectsSynced} Projects · ${syncRes.blogsSynced} Blogs)। এখন নিশ্চিন্তে নতুন Git Version / Commit করতে পারেন।`,
        });
      } else {
        setFeedback({
          type: 'error',
          message:
            syncRes.error ||
            'Cloud scan could not complete. Please try again.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Unexpected error during Cloud Scan. Please try again.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleDisconnectOwner = async () => {
    recordAdminActivity();
    await signOutOwnerFromGoogle();
    setFeedback(null);
  };

  const busy = isScanning || cloudStatus.isSyncing;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-cloud-scan-title"
    >
      <div className="relative w-full max-w-lg bg-[#0E1320] border border-white/15 rounded-2xl p-6 sm:p-7 shadow-2xl text-white space-y-5 my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            recordAdminActivity();
            onClose();
          }}
          className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close Cloud Scan Reminder"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pr-10">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Admin Exclusive Control</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                <span>Pre-Git Version Safeguard</span>
              </span>
            </div>
            <h2
              id="admin-cloud-scan-title"
              className="font-display font-bold text-lg sm:text-xl text-white tracking-tight"
            >
              Pre-Git Cloud Scan &amp; Backup
            </h2>
          </div>
        </div>

        {/* Bengali + English Pre-Git Scan Reminder */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <p className="text-[13px] text-slate-200 leading-relaxed">
            নতুন <strong className="text-white font-semibold">Git Version / Commit</strong> করার আগে অথবা অ্যাডমিন প্যানেলে প্রজেক্ট, ব্লগ ও ছবি আপডেট করার পর অবশ্যই একবার <strong className="text-emerald-300 font-semibold">স্ক্যান (Cloud Scan &amp; Backup)</strong> করে নিন।
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            এই স্ক্যান শুধুমাত্র আনলক করা অ্যাডমিন প্যানেল থেকেই করা সম্ভব—বাইরের কোনো ভিজিটর এটি দেখতে বা অ্যাক্সেস করতে পারবে না।
          </p>
        </div>

        {/* Live Dataset Inventory (Tabular Numerals, Clean Dividers) */}
        <div className="grid grid-cols-3 divide-x divide-white/10 rounded-xl bg-[#090D16] border border-white/10 py-3.5 px-2 text-center">
          <div className="px-2 space-y-0.5">
            <div className="text-lg font-display font-bold text-white tabular-nums">
              {localCounts.projects}
            </div>
            <div className="text-[11px] text-slate-400">Projects</div>
          </div>
          <div className="px-2 space-y-0.5">
            <div className="text-lg font-display font-bold text-white tabular-nums">
              {localCounts.blogs}
            </div>
            <div className="text-[11px] text-slate-400">Blogs</div>
          </div>
          <div className="px-2 space-y-0.5">
            <div className="text-lg font-display font-bold text-white tabular-nums">
              {localCounts.experiences}
            </div>
            <div className="text-[11px] text-slate-400">Experiences</div>
          </div>
        </div>

        {/* Owner Google Connection & Sync State */}
        <div className="space-y-2 text-xs text-slate-300 border-t border-b border-white/10 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">Owner Google Account</span>
            <span
              className={`font-mono truncate ${
                cloudStatus.isOwnerConnected ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {cloudStatus.isOwnerConnected
                ? cloudStatus.ownerEmail || 'Connected'
                : 'Not Connected Yet'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">Last Cloud Scan</span>
            <span className="font-mono tabular-nums text-slate-200">
              {cloudStatus.lastSyncedAt
                ? new Date(cloudStatus.lastSyncedAt).toLocaleString()
                : 'Pending scan in this browser'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">Git Readiness</span>
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${
                hasUnsyncedEdits || !cloudStatus.isOwnerConnected
                  ? 'text-amber-300'
                  : 'text-emerald-400'
              }`}
            >
              {hasUnsyncedEdits || !cloudStatus.isOwnerConnected ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Scan recommended before Git push</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Synced &amp; safe for Git push</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Inline Feedback */}
        {(feedback || cloudStatus.error) && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              feedback?.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {feedback?.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            )}
            <span>{feedback?.message || cloudStatus.error}</span>
          </div>
        )}

        {/* Action Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                recordAdminActivity();
                onClose();
              }}
              disabled={busy}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Later
            </button>

            {cloudStatus.isOwnerConnected && (
              <button
                type="button"
                onClick={handleDisconnectOwner}
                disabled={busy}
                className="min-h-[44px] px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                title="Disconnect Google Cloud write session"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Disconnect</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleConnectAndScan}
            disabled={busy}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${busy ? 'animate-spin' : ''}`} />
            <span>
              {busy
                ? 'Scanning & Syncing...'
                : cloudStatus.isOwnerConnected
                ? 'Scan & Backup Now'
                : 'Sign in with Google & Scan'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
