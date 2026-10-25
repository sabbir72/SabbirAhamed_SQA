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
  isEmbeddedInAppWebView,
  isMobileBrowserDevice,
  isTopLevelBrowserWindow,
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

const STANDALONE_SHARED_ADMIN_URL =
  'https://ais-pre-f7abqgvus7ali36cbsgtcy-609487281458.asia-southeast1.run.app/admin';

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
  const [copiedKey, setCopiedKey] = useState<'url' | 'domain' | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isMobile = isMobileBrowserDevice();
  const isTopLevel = isTopLevelBrowserWindow();
  const isInAppWebView = isEmbeddedInAppWebView();

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
      setLastErrorCode('');
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

  const handleConnectAndScan = async (forceAccountPicker = false) => {
    if (isScanning || cloudStatus.isSyncing) return;

    // Trigger signInOwnerWithGoogle FIRST on the synchronous tap tick before React state updates
    // so iOS Safari and Android Chrome never block the Google OAuth popup!
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
    setIsScanning(true);

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
            signInRes.error ||
            'Google owner verification could not be completed.',
        });
        setIsScanning(false);
        return;
      }

      const syncRes = await syncAllLocalDataToCloud();
      if (syncRes.success) {
        setFeedback({
          type: 'success',
          message: `স্ক্যান সফলভাবে সম্পন্ন হয়েছে (${syncRes.projectsSynced} Projects · ${syncRes.blogsSynced} Blogs Google Cloud-এ সিঙ্ক হয়েছে)।`,
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

  const handleMobileSameTabRedirect = async () => {
    if (isScanning || cloudStatus.isSyncing) return;
    const redirectPromise = signInOwnerWithGoogleRedirect(PRIMARY_OWNER_EMAIL, false);
    setFeedback(null);
    setLastErrorCode('');
    setIsScanning(true);
    const res = await redirectPromise;
    if (!res.success) {
      setIsScanning(false);
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

  const busy = isScanning || cloudStatus.isSyncing;
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-cloud-scan-title"
    >
      <div className="relative w-full max-w-lg bg-[#0E1320] border border-white/15 rounded-2xl p-5 sm:p-7 shadow-2xl text-white space-y-4 sm:space-y-5 my-auto max-h-[92dvh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            recordAdminActivity();
            onClose();
          }}
          className="absolute top-3.5 right-3.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close Cloud Scan Reminder"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pr-11">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Admin Exclusive</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-sky-300 font-medium">
                <Cloud className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <span>Google Cloud Only</span>
              </span>
            </div>
            <h2
              id="admin-cloud-scan-title"
              className="font-display font-bold text-lg sm:text-xl text-white tracking-tight"
            >
              Google Cloud Scan &amp; Sync
            </h2>
          </div>
        </div>

        {/* Bengali Cloud Scan Description */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
          <p className="text-[13px] text-slate-200 leading-relaxed">
            আপনার অনুমোদিত <strong className="text-white font-semibold">Google Account</strong> দিয়ে লগইন করে স্ক্যান করুন—যাতে সব প্রজেক্ট, ব্লগ এবং আপলোড করা ছবি সরাসরি <strong className="text-emerald-300 font-semibold">Google Cloud Database</strong>-এ স্থায়ীভাবে সিঙ্ক ও সুরক্ষিত থাকে।
          </p>
        </div>

        {/* Fixed Exclusive Owner Email (sabbircse72@gmail.com Only) */}
        {!cloudStatus.isOwnerConnected && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#090D16] border border-emerald-500/30">
            <span className="inline-flex items-center gap-2 text-xs text-slate-300 min-w-0">
              <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono text-emerald-200 font-semibold truncate">
                {PRIMARY_OWNER_EMAIL}
              </span>
            </span>
            <span className="text-[11px] font-medium text-emerald-400 shrink-0">
              Authorized Owner
            </span>
          </div>
        )}

        {/* Live Dataset Inventory (Tabular Numerals) */}
        <div className="grid grid-cols-3 divide-x divide-white/10 rounded-xl bg-[#090D16] border border-white/10 py-3 px-2 text-center">
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
        <div className="space-y-2 text-xs text-slate-300 border-t border-b border-white/10 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400 shrink-0">Connected Account</span>
            <span
              className={`font-mono truncate ${
                cloudStatus.isOwnerConnected ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {cloudStatus.isOwnerConnected
                ? PRIMARY_OWNER_EMAIL
                : `${PRIMARY_OWNER_EMAIL} (Not logged in)`}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400 shrink-0">Last Cloud Scan</span>
            <span className="font-mono tabular-nums text-slate-200 truncate">
              {cloudStatus.lastSyncedAt
                ? new Date(cloudStatus.lastSyncedAt).toLocaleString()
                : 'Not scanned on this device yet'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400 shrink-0">Cloud Sync Status</span>
            <span
              className={`inline-flex items-center gap-1.5 font-medium truncate ${
                hasUnsyncedEdits || !cloudStatus.isOwnerConnected
                  ? 'text-amber-300'
                  : 'text-emerald-400'
              }`}
            >
              {hasUnsyncedEdits || !cloudStatus.isOwnerConnected ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {cloudStatus.isOwnerConnected ? 'Ready to Scan' : 'Login & Scan Required'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Synced with Google Cloud</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Mobile In-App WebView Warning (Messenger / WhatsApp / Facebook) */}
        {!cloudStatus.isOwnerConnected && isInAppWebView && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 text-xs text-amber-200">
            <p className="leading-relaxed">
              আপনি ইন-অ্যাপ ব্রাউজার (Messenger / WhatsApp / Facebook) থেকে ঢুকেছেন, যেখানে Google সাইন-ইন ব্লক থাকে। নিচের বাটনে লিংক কপি করে <strong>Chrome</strong> বা <strong>Safari</strong> ব্রাউজারে ওপেন করুন:
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

        {/* Inline Feedback + Custom Domain / Iframe Helper */}
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

            {lastErrorCode === 'auth/unauthorized-domain' && currentHost && (
              <button
                type="button"
                onClick={() => handleCopyText(currentHost, 'domain')}
                className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-mono text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                {copiedKey === 'domain' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Copied: {currentHost}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>Copy Domain ({currentHost})</span>
                  </>
                )}
              </button>
            )}

            {lastErrorCode === 'auth/wrong-owner-email' && (
              <button
                type="button"
                onClick={() => handleConnectAndScan(true)}
                className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>অন্য Google Account বেছে নিন ({PRIMARY_OWNER_EMAIL})</span>
              </button>
            )}
          </div>
        )}

        {/* Primary & Mobile-Specific Connect Controls */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => handleConnectAndScan(false)}
            disabled={busy}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-950/50 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${busy ? 'animate-spin' : ''}`} />
            <span className="truncate">
              {busy
                ? 'Logging in & Scanning...'
                : cloudStatus.isOwnerConnected
                ? 'Scan Now to Google Cloud'
                : `Login (${PRIMARY_OWNER_EMAIL}) & Scan`}
            </span>
          </button>

          {/* Mobile Same-Tab Redirect (No Popup Needed) when opened directly in Mobile Browser */}
          {!cloudStatus.isOwnerConnected && isTopLevel && !isInAppWebView && (
            <button
              type="button"
              onClick={handleMobileSameTabRedirect}
              disabled={busy}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/35 text-indigo-200 text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">মোবাইল ডাইরেক্ট কানেক্ট (পপআপ ছাড়া · Same-Tab)</span>
            </button>
          )}

          {/* Mobile Iframe Helper: Copy Direct Standalone Link if inside AI Studio mobile iframe */}
          {!cloudStatus.isOwnerConnected && isMobile && !isTopLevel && !isInAppWebView && (
            <button
              type="button"
              onClick={() => handleCopyText(getDirectBrowserUrl(), 'url')}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedKey === 'url' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">ডাইরেক্ট লিংক কপি হয়েছে — ব্রাউজারে ওপেন করুন</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">মোবাইলে সমস্যা হলে ডাইরেক্ট লিংক কপি করুন</span>
                </>
              )}
            </button>
          )}

          {/* Secondary Footer Row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                recordAdminActivity();
                onClose();
              }}
              disabled={busy}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Later
            </button>

            {cloudStatus.isOwnerConnected && (
              <button
                type="button"
                onClick={handleDisconnectOwner}
                disabled={busy}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
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
