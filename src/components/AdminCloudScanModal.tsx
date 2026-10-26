import React, { useEffect, useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  X,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  Mail,
  ExternalLink,
} from 'lucide-react';
import {
  isAdminAuthenticated,
  recordAdminActivity,
  ADMIN_AUTH_CHANGED_EVENT,
} from '../utils/adminAuth';
import {
  AUTHORIZED_DOMAINS_UPDATED_EVENT,
  areAuthorizedDomainsLoaded,
  CLOUD_AUTO_SCAN_COMPLETED_EVENT,
  CLOUD_SYNC_STATUS_EVENT,
  CloudSyncStatus,
  getCloudSyncStatus,
  isCurrentHostFirebaseAuthorized,
  isEmbeddedInAppWebView,
  isMobileBrowserDevice,
  isTopLevelBrowserWindow,
  refreshKnownAuthorizedDomains,
  signInOwnerWithGoogle,
  signInOwnerWithGoogleRedirect,
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

const STANDALONE_SHARED_ADMIN_URL =
  'https://ais-pre-f7abqgvus7ali36cbsgtcy-609487281458.asia-southeast1.run.app/admin';

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
  const [copiedKey, setCopiedKey] = useState<'url' | 'domain' | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string>('');
  const [domainsLoaded, setDomainsLoaded] = useState<boolean>(() =>
    areAuthorizedDomainsLoaded()
  );
  const [isHostAuthorized, setIsHostAuthorized] = useState<boolean>(() =>
    isCurrentHostFirebaseAuthorized()
  );
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isMobile = isMobileBrowserDevice();
  const isTopLevel = isTopLevelBrowserWindow();
  const isInAppWebView = isEmbeddedInAppWebView();

  useEffect(() => {
    const syncCounts = () => {
      setLocalCounts(readLiveCounts());
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

    const handleAutoScanCompleted = () => {
      setIsSyncingNow(false);
      setLastErrorCode('');
      setFeedback({
        type: 'success',
        message:
          'সব প্রজেক্ট, ব্লগ, স্টোরি, রোডম্যাপ, রেফারেন্স, স্কিল ও প্রোফাইল Google Cloud Database-এ সফলভাবে সেভ হয়েছে।',
      });
    };

    const handleDomainsUpdated = () => {
      setDomainsLoaded(areAuthorizedDomainsLoaded());
      setIsHostAuthorized(isCurrentHostFirebaseAuthorized());
    };

    syncCounts();
    setCloudStatus(getCloudSyncStatus());
    handleDomainsUpdated();

    window.addEventListener(PORTFOLIO_UPDATED_EVENT, syncCounts);
    window.addEventListener(BLOGS_UPDATED_EVENT, syncCounts);
    window.addEventListener(CLOUD_SYNC_STATUS_EVENT, handleCloudStatus);
    window.addEventListener(CLOUD_AUTO_SCAN_COMPLETED_EVENT, handleAutoScanCompleted);
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);
    window.addEventListener(AUTHORIZED_DOMAINS_UPDATED_EVENT, handleDomainsUpdated);

    return () => {
      window.removeEventListener(PORTFOLIO_UPDATED_EVENT, syncCounts);
      window.removeEventListener(BLOGS_UPDATED_EVENT, syncCounts);
      window.removeEventListener(CLOUD_SYNC_STATUS_EVENT, handleCloudStatus);
      window.removeEventListener(CLOUD_AUTO_SCAN_COMPLETED_EVENT, handleAutoScanCompleted);
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChanged);
      window.removeEventListener(AUTHORIZED_DOMAINS_UPDATED_EVENT, handleDomainsUpdated);
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
      void refreshKnownAuthorizedDomains(true).then((authorized) => {
        setDomainsLoaded(true);
        setIsHostAuthorized(authorized);
      });
    }
  }, [isOpen]);

  // Strict Admin-only boundary: never render for unauthenticated visitors
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

  const getDirectBrowserUrl = () => {
    if (typeof window === 'undefined') return STANDALONE_SHARED_ADMIN_URL;
    const host = window.location.hostname;
    if (host.startsWith('ais-dev-')) {
      return STANDALONE_SHARED_ADMIN_URL;
    }
    return `${window.location.origin}/admin`;
  };

  const handleCopyText = async (text: string, key: 'url' | 'domain') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleConnectAndSave = async (forceAccountPicker = false) => {
    if (isSyncingNow || cloudStatus.isSyncing) return;

    // Trigger Google popup synchronously on user tap before React state updates
    const signInPromise = !cloudStatus.isOwnerConnected
      ? signInOwnerWithGoogle(PRIMARY_OWNER_EMAIL, forceAccountPicker)
      : Promise.resolve({
          success: true,
          email: PRIMARY_OWNER_EMAIL,
          redirecting: false,
          error: undefined,
          errorCode: undefined,
        });

    setFeedback(null);
    setLastErrorCode('');
    setIsSyncingNow(true);

    try {
      const signInRes = await signInPromise;
      if (signInRes.redirecting) {
        return;
      }
      if (!signInRes.success) {
        setLastErrorCode(signInRes.errorCode || '');
        setFeedback({
          type: 'error',
          message:
            signInRes.error || 'Google কানেকশন সম্পন্ন হয়নি। আবার চেষ্টা করুন।',
        });
        setIsSyncingNow(false);
        return;
      }

      const syncRes = await syncAllLocalDataToCloud();
      if (syncRes.success) {
        setFeedback({
          type: 'success',
          message:
            'সব প্রজেক্ট, ব্লগ, স্টোরি, রোডম্যাপ, রেফারেন্স, স্কিল ও প্রোফাইল Google Cloud Database-এ সফলভাবে সেভ হয়েছে।',
        });
      } else {
        setFeedback({
          type: 'error',
          message:
            syncRes.error || 'ক্লাউডে সেভ সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'ক্লাউড সিঙ্কে সাময়িক সমস্যা হয়েছে। আপনার ডাটা ডিভাইসে সুরক্ষিত আছে।',
      });
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleMobileSameTabRedirect = async () => {
    if (isSyncingNow || cloudStatus.isSyncing) return;
    const redirectPromise = signInOwnerWithGoogleRedirect(PRIMARY_OWNER_EMAIL, false);
    setFeedback(null);
    setLastErrorCode('');
    setIsSyncingNow(true);
    const res = await redirectPromise;
    if (!res.success) {
      setIsSyncingNow(false);
      setLastErrorCode(res.errorCode || '');
      setFeedback({
        type: 'error',
        message: res.error || 'মোবাইল ডাইরেক্ট কানেক্ট শুরু করা যায়নি।',
      });
    }
  };

  const handleDisconnectOwner = async () => {
    recordAdminActivity();
    await signOutOwnerFromGoogle();
    setFeedback(null);
  };

  const busy = isSyncingNow || cloudStatus.isSyncing;
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const needsDomainAuthSetup =
    !cloudStatus.isOwnerConnected &&
    Boolean(currentHost) &&
    currentHost !== 'localhost' &&
    ((domainsLoaded && !isHostAuthorized) || lastErrorCode === 'auth/unauthorized-domain');
  const showMobileSameTabOption =
    !cloudStatus.isOwnerConnected &&
    isMobile &&
    isTopLevel &&
    !isInAppWebView &&
    isHostAuthorized;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-cloud-autosave-title"
    >
      <div className="relative w-full max-w-lg bg-[#0E1320] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl text-white space-y-4 my-auto max-h-[92dvh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={dismissAndClose}
          className="absolute top-3.5 right-3.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close Cloud Database Dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Clean Header */}
        <div className="flex items-start gap-3.5 pr-11">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="text-emerald-400 font-medium">Admin Exclusive</span>
              <span aria-hidden="true">·</span>
              <span>Zero Data Loss</span>
            </div>
            <h2
              id="admin-cloud-autosave-title"
              className="font-display font-bold text-lg sm:text-xl text-white tracking-tight"
            >
              Cloud Auto-Save Database
            </h2>
          </div>
        </div>

        {/* Simple Reassuring Bengali Explanation */}
        <p className="text-[13px] text-slate-300 leading-relaxed">
          একবার কানেক্ট করলেই আপনার নতুন <strong className="text-white font-semibold">প্রজেক্ট, ব্লগ, স্টোরি (অভিজ্ঞতা), রোডম্যাপ, রেফারেন্স ও প্রোফাইল</strong> অটোমেটিক সেভ হবে—কোনো ডাটা কখনো হারাবে না।
        </p>

        {/* Complete 6-Dataset Inventory Grid */}
        <div className="space-y-2">
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
          <div className="text-[11px] text-slate-400 text-center">
            Profile · Visiting Card · Color Theme — সবগুলো ডাটাবেসে অন্তর্ভুক্ত আছে
          </div>
        </div>

        {/* Calm Connection & Save State */}
        <div className="space-y-2 text-xs text-slate-300 border-t border-b border-white/10 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400 shrink-0">Admin Account</span>
            <span className="font-mono text-emerald-300 truncate">{PRIMARY_OWNER_EMAIL}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400 shrink-0">Database Status</span>
            {cloudStatus.isOwnerConnected ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {cloudStatus.hasUnsyncedChanges ? 'Auto-Saving...' : 'Auto-Save Active'}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-sky-300 truncate">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <span className="truncate">Saved on Device · Connect for Cloud</span>
              </span>
            )}
          </div>

          {cloudStatus.lastSyncedAt && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400 shrink-0">Last Cloud Save</span>
              <span className="font-mono tabular-nums text-slate-200 truncate">
                {new Date(cloudStatus.lastSyncedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Mobile In-App WebView Helper (Messenger / WhatsApp / Facebook) */}
        {!cloudStatus.isOwnerConnected && isInAppWebView && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 text-xs text-amber-200">
            <p className="leading-relaxed">
              ইন-অ্যাপ ব্রাউজারে Google লগইন বন্ধ থাকে। নিচের বাটনে লিংক কপি করে <strong>Chrome</strong> বা <strong>Safari</strong> ব্রাউজারে ওপেন করুন:
            </p>
            <button
              type="button"
              onClick={() => handleCopyText(getDirectBrowserUrl(), 'url')}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              {copiedKey === 'url' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>লিংক কপি হয়েছে — Chrome/Safari-তে পেস্ট করুন</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>অ্যাডমিন লিংক কপি করুন (Chrome/Safari)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Vercel / Custom Domain One-Time Setup Helper */}
        {needsDomainAuthSetup && (
          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-100 leading-relaxed space-y-2.5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
              <span>
                ভিজিটররা এখনই সব ডাটা লাইভ দেখতে পাচ্ছে। এই ডোমেইন (<strong className="font-mono text-white">{currentHost}</strong>) থেকে অ্যাডমিন Google Auto-Save চালু করতে শুধু ১ বার Firebase Authorized Domains-এ ডোমেইনটি যোগ করুন:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleCopyText(currentHost, 'domain')}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-mono text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                {copiedKey === 'domain' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Copied: {currentHost}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">1. Copy: {currentHost}</span>
                  </>
                )}
              </button>
              <a
                href="https://console.firebase.google.com/project/splendid-meridian-64mm2/authentication/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-100 font-medium text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">2. Add in Firebase Settings</span>
              </a>
            </div>
          </div>
        )}

        {/* Inline Feedback */}
        {(feedback || cloudStatus.error) && lastErrorCode !== 'auth/unauthorized-domain' && (
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
                onClick={() => handleConnectAndSave(true)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>সঠিক ইমেইল বেছে নিন ({PRIMARY_OWNER_EMAIL})</span>
              </button>
            )}
          </div>
        )}

        {/* Single Clear Primary Button + Optional Mobile Helper */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => handleConnectAndSave(false)}
            disabled={busy}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-950/50 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${busy ? 'animate-spin' : ''}`} />
            <span className="truncate">
              {busy
                ? 'Saving to Google Cloud...'
                : cloudStatus.isOwnerConnected
                ? 'Save & Sync All Data Now'
                : `Connect Auto-Save (${PRIMARY_OWNER_EMAIL})`}
            </span>
          </button>

          {showMobileSameTabOption && (
            <button
              type="button"
              onClick={handleMobileSameTabRedirect}
              disabled={busy}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">মোবাইল ডাইরেক্ট কানেক্ট (পপআপ ছাড়া · Same-Tab)</span>
            </button>
          )}

          {!cloudStatus.isOwnerConnected && isMobile && !isTopLevel && !isInAppWebView && (
            <button
              type="button"
              onClick={() => handleCopyText(getDirectBrowserUrl(), 'url')}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedKey === 'url' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">লিংক কপি হয়েছে — ব্রাউজারে ওপেন করুন</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">মোবাইলে সমস্যা হলে ডাইরেক্ট লিংক কপি করুন</span>
                </>
              )}
            </button>
          )}

          {/* Clean Footer Row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={dismissAndClose}
              disabled={busy}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Close
            </button>

            {cloudStatus.isOwnerConnected && (
              <button
                type="button"
                onClick={handleDisconnectOwner}
                disabled={busy}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                title="Disconnect Google Cloud write session"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
