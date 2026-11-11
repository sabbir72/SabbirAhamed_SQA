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
  ChevronDown,
  ChevronUp,
  Server,
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
  refreshCloudflareStatus,
  refreshKnownAuthorizedDomains,
  signInOwnerWithGoogle,
  signInOwnerWithGoogleRedirect,
  signOutOwnerFromGoogle,
  syncAllLocalDataToCloud,
} from '../utils/cloudSync';
import {
  OWNER_ADMIN_EMAILS,
  PRIMARY_OWNER_EMAIL,
  getPreferredOwnerEmail,
  setPreferredOwnerEmail,
} from '../firebase';
import {
  getStoredPortfolioData,
  PORTFOLIO_UPDATED_EVENT,
} from '../utils/portfolioStore';
import { getStoredBlogPosts, BLOGS_UPDATED_EVENT } from '../utils/blogStore';

export const CLOUD_PROMPT_DISMISSED_SESSION_KEY = 'sabbir_cloud_prompt_dismissed';

const STANDALONE_SHARED_ADMIN_URL =
  'https://ais-pre-f7abqgvus7ali36cbsgtcy-609487281458.asia-southeast1.run.app/admin';

const CLOUDFLARE_ENV_KEYS = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_KV_NAMESPACE_ID',
  'CLOUDFLARE_API_TOKEN',
] as const;

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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string>('');
  const [domainsLoaded, setDomainsLoaded] = useState<boolean>(() =>
    areAuthorizedDomainsLoaded()
  );
  const [isHostAuthorized, setIsHostAuthorized] = useState<boolean>(() =>
    isCurrentHostFirebaseAuthorized()
  );
  const [selectedOwnerEmail, setSelectedOwnerEmail] = useState<string>(() =>
    getPreferredOwnerEmail()
  );
  const [showCfGuide, setShowCfGuide] = useState<boolean>(false);
  const [showFirebaseFallback, setShowFirebaseFallback] = useState<boolean>(false);
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
          'সব প্রজেক্ট, ব্লগ, স্টোরি, রোডম্যাপ, রেফারেন্স, স্কিল, ছবি ও প্রোফাইল ক্লাউড ডাটাবেসে সফলভাবে সেভ হয়েছে।',
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
      setSelectedOwnerEmail(current.ownerEmail || getPreferredOwnerEmail());
      setShowCfGuide(!current.cloudflareConfigured && !current.firebaseConnected);
      if (!current.isSyncing && !current.isOwnerConnected) {
        setFeedback(null);
      }
      setLocalCounts(readLiveCounts());
      void refreshCloudflareStatus();
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

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleSyncCloudflareNow = async () => {
    if (isSyncingNow || cloudStatus.isSyncing) return;
    setFeedback(null);
    setLastErrorCode('');
    setIsSyncingNow(true);
    try {
      const syncRes = await syncAllLocalDataToCloud();
      if (syncRes.success) {
        setFeedback({
          type: 'success',
          message:
            'সব প্রজেক্ট, ব্লগ, স্টোরি, রোডম্যাপ, রেফারেন্স, স্কিল ও প্রোফাইল সফলভাবে Cloudflare/Cloud-এ সেভ হয়েছে—ফোনে এখনই আপডেট দেখা যাবে!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: syncRes.error || 'ক্লাউডে সেভ সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
        });
      }
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleConnectAndSaveFirebase = async (forceAccountPicker = false) => {
    if (isSyncingNow || cloudStatus.isSyncing) return;

    const targetEmail = cloudStatus.ownerEmail || selectedOwnerEmail || PRIMARY_OWNER_EMAIL;
    const signInPromise = !cloudStatus.firebaseConnected
      ? signInOwnerWithGoogle(targetEmail, forceAccountPicker)
      : Promise.resolve({
          success: true,
          email: targetEmail,
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
            'সব প্রজেক্ট, ব্লগ, স্টোরি, রোডম্যাপ, রেফারেন্স, স্কিল ও প্রোফাইল ক্লাউড ডাটাবেসে সফলভাবে সেভ হয়েছে।',
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
    const targetEmail = selectedOwnerEmail || PRIMARY_OWNER_EMAIL;
    const redirectPromise = signInOwnerWithGoogleRedirect(targetEmail, false);
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
    !cloudStatus.firebaseConnected &&
    Boolean(currentHost) &&
    currentHost !== 'localhost' &&
    ((domainsLoaded && !isHostAuthorized) || lastErrorCode === 'auth/unauthorized-domain');
  const showMobileSameTabOption =
    !cloudStatus.firebaseConnected &&
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
      <div className="relative w-full max-w-xl bg-[#0E1320] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl text-white space-y-4 my-auto max-h-[92dvh] overflow-y-auto">
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
              <span className="text-emerald-400 font-medium">Zero Google Popup</span>
              <span aria-hidden="true">·</span>
              <span>Cloudflare Free Store</span>
            </div>
            <h2
              id="admin-cloud-autosave-title"
              className="font-display font-bold text-lg sm:text-xl text-white tracking-tight"
            >
              Cloudflare &amp; Cloud Sync Center
            </h2>
          </div>
        </div>

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
        </div>

        {/* Primary Card: Cloudflare Free Server Store */}
        <div
          className={`rounded-2xl p-4 border space-y-3 ${
            cloudStatus.cloudflareConfigured
              ? 'bg-emerald-500/10 border-emerald-500/35'
              : 'bg-sky-500/10 border-sky-500/30'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <Server
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  cloudStatus.cloudflareConfigured ? 'text-emerald-400' : 'text-sky-400'
                }`}
              />
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white">
                  <span>Cloudflare Free Store (1 GB Free · No Card)</span>
                  <span
                    className={`font-mono text-[11px] ${
                      cloudStatus.cloudflareConfigured ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {cloudStatus.cloudflareConfigured
                      ? `· ${cloudStatus.cloudflareProviderLabel}`
                      : '· Setup Needed'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {cloudStatus.cloudflareConfigured
                    ? 'চালু আছে! এখন Admin আনলক করে ছবি বা ডাটা সেভ করলেই সরাসরি Cloudflare সার্ভারে সেভ হবে এবং ফোনে সাথে সাথে আপডেট দেখা যাবে—Google পপআপ ছাড়াই।'
                    : 'একবার Vercel-এ ফ্রি Cloudflare KV সেটআপ করলে আর কখনো Google পপআপ বা ডোমেইন অ্যাপ্রুভাল লাগবে না—ডেক্সটপ থেকে সেভ করলেই ফোনে চলে যাবে।'}
                </p>
              </div>
            </div>

            {!cloudStatus.cloudflareConfigured && (
              <button
                type="button"
                onClick={() => setShowCfGuide((prev) => !prev)}
                className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white inline-flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
              >
                <span>Setup Guide</span>
                {showCfGuide ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {cloudStatus.cloudflareConfigured && (
            <button
              type="button"
              onClick={handleSyncCloudflareNow}
              disabled={busy}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${busy ? 'animate-spin' : ''}`} />
              <span>
                {busy
                  ? 'Saving to Cloudflare...'
                  : 'Save & Sync All Updates to Cloudflare & Phone'}
              </span>
            </button>
          )}

          {showCfGuide && !cloudStatus.cloudflareConfigured && (
            <div className="pt-2 border-t border-white/10 space-y-2.5 text-xs text-slate-200 leading-relaxed">
              <div className="space-y-1.5">
                <p>
                  <strong className="text-white">১.</strong>{' '}
                  <a
                    href="https://dash.cloudflare.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-300 underline inline-flex items-center gap-1"
                  >
                    Cloudflare Dashboard
                    <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  এ গিয়ে <strong className="text-white">Storage &amp; Databases &gt; KV</strong> থেকে ফ্রি Namespace তৈরি করুন (ক্রেডিট কার্ড লাগে না)।
                </p>
                <p>
                  <strong className="text-white">২.</strong>{' '}
                  <strong className="text-white">My Profile &gt; API Tokens &gt; Create Custom Token</strong> এ{' '}
                  <span className="font-mono text-sky-200">Account : Workers KV Storage : Edit</span> পারমিশন দিয়ে টোকেন তৈরি করুন।
                </p>
                <p>
                  <strong className="text-white">৩.</strong>{' '}
                  <strong className="text-white">Vercel Project &gt; Settings &gt; Environment Variables</strong>-এ এই ৩টি যোগ করে Redeploy করুন:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {CLOUDFLARE_ENV_KEYS.map((envKey) => (
                  <button
                    key={envKey}
                    type="button"
                    onClick={() => handleCopyText(envKey, envKey)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#090D16] hover:bg-white/10 border border-white/10 flex items-center justify-between gap-2 font-mono text-[11px] text-sky-200 cursor-pointer"
                  >
                    <span className="truncate">{envKey}</span>
                    {copiedKey === envKey ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Last Sync Timestamp Row */}
        {cloudStatus.lastSyncedAt && (
          <div className="flex items-center justify-between gap-3 text-xs text-slate-300 px-1">
            <span className="text-slate-400 shrink-0">Last Cloud Save</span>
            <span className="font-mono tabular-nums text-emerald-300 truncate">
              {new Date(cloudStatus.lastSyncedAt).toLocaleString()}
            </span>
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
                onClick={() => handleConnectAndSaveFirebase(true)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>সঠিক ইমেইল বেছে নিন ({selectedOwnerEmail})</span>
              </button>
            )}
          </div>
        )}

        {/* Firebase Cloud Sync (Ready Now with sabbir.altersense@gmail.com) */}
        <div
          className={`rounded-2xl p-3.5 border space-y-3 ${
            cloudStatus.firebaseConnected
              ? 'bg-emerald-500/10 border-emerald-500/35'
              : !cloudStatus.cloudflareConfigured
              ? 'bg-[#090D16] border-emerald-500/30'
              : 'bg-[#090D16] border-white/10'
          }`}
        >
          <button
            type="button"
            onClick={() => setShowFirebaseFallback((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-slate-200 min-w-0">
              <ShieldCheck
                className={`w-4 h-4 shrink-0 ${
                  cloudStatus.firebaseConnected ? 'text-emerald-400' : 'text-sky-400'
                }`}
              />
              <span className="truncate">
                Firebase Cloud Database:{' '}
                <strong
                  className={
                    cloudStatus.firebaseConnected ? 'text-emerald-300' : 'text-sky-300'
                  }
                >
                  {cloudStatus.firebaseConnected
                    ? `Connected (${cloudStatus.ownerEmail})`
                    : `Ready (${selectedOwnerEmail})`}
                </strong>
              </span>
            </div>
            {showFirebaseFallback || !cloudStatus.cloudflareConfigured ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </button>

          {(showFirebaseFallback || !cloudStatus.cloudflareConfigured) && (
            <div className="space-y-2.5 pt-1 border-t border-white/10">
              {!cloudStatus.firebaseConnected && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {OWNER_ADMIN_EMAILS.map((email) => {
                    const active = selectedOwnerEmail === email;
                    return (
                      <button
                        key={email}
                        type="button"
                        onClick={() => {
                          const saved = setPreferredOwnerEmail(email);
                          setSelectedOwnerEmail(saved);
                        }}
                        className={`min-h-[38px] px-2.5 py-1.5 rounded-lg font-mono text-[11px] border text-left transition-colors cursor-pointer truncate ${
                          active
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {email}
                      </button>
                    );
                  })}
                </div>
              )}

              {!cloudStatus.firebaseConnected && isInAppWebView && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs text-amber-200">
                  <p className="leading-relaxed">
                    ইন-অ্যাপ ব্রাউজারে Google লগইন বন্ধ থাকে। <strong>Chrome</strong> বা <strong>Safari</strong> ব্রাউজারে ওপেন করুন:
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopyText(getDirectBrowserUrl(), 'url')}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    {copiedKey === 'url' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>লিংক কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 shrink-0" />
                        <span>অ্যাডমিন লিংক কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {needsDomainAuthSetup && !cloudStatus.cloudflareConfigured && (
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-100 leading-relaxed space-y-2">
                  <span>
                    Google Auth ব্যবহার করতে চাইলে <strong className="font-mono text-white">{currentHost}</strong> Firebase Authorized Domains-এ যোগ করুন:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText(currentHost, 'domain')}
                      className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-mono text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      {copiedKey === 'domain' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Copy: {currentHost}</span>
                        </>
                      )}
                    </button>
                    <a
                      href="https://console.firebase.google.com/project/splendid-meridian-64mm2/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-100 font-medium text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Firebase Settings</span>
                    </a>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleConnectAndSaveFirebase(false)}
                  disabled={busy}
                  className={`flex-1 min-h-[42px] px-4 py-2 rounded-xl text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap ${
                    !cloudStatus.cloudflareConfigured
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-sm'
                      : 'bg-white/10 hover:bg-white/15'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${busy ? 'animate-spin' : ''}`} />
                  <span className="truncate">
                    {cloudStatus.firebaseConnected
                      ? 'Save & Sync to Firebase Cloud'
                      : `Connect Google (${selectedOwnerEmail})`}
                  </span>
                </button>

                {showMobileSameTabOption && (
                  <button
                    type="button"
                    onClick={handleMobileSameTabRedirect}
                    disabled={busy}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Same-Tab</span>
                  </button>
                )}

                {cloudStatus.firebaseConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectOwner}
                    disabled={busy}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clean Footer Row */}
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

