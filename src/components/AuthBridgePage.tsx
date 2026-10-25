import React, { useEffect, useState } from 'react';
import {
  Cloud,
  ShieldCheck,
  Mail,
  RefreshCw,
  Smartphone,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import {
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  UserCredential,
} from 'firebase/auth';
import {
  auth,
  browserPopupRedirectResolver,
  createOwnerGoogleProvider,
  isVerifiedFirebaseOwner,
  PRIMARY_OWNER_EMAIL,
  purgeExpiredRuntimeAuthSession,
} from '../firebase';
import {
  formatMobileAwareAuthError,
  isEmbeddedInAppWebView,
  isMobileBrowserDevice,
  validateAuthBridgeReturnUrl,
} from '../utils/cloudSync';

const BRIDGE_RETURN_TO_STORAGE_KEY = 'sabbir_auth_bridge_return_to';

function resolveInitialReturnUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const queryReturn = validateAuthBridgeReturnUrl(params.get('returnTo'));
  if (queryReturn) {
    try {
      window.sessionStorage.setItem(BRIDGE_RETURN_TO_STORAGE_KEY, queryReturn);
    } catch {
      // Ignore storage restrictions
    }
    return queryReturn;
  }
  try {
    const stored = window.sessionStorage.getItem(BRIDGE_RETURN_TO_STORAGE_KEY);
    return validateAuthBridgeReturnUrl(stored);
  } catch {
    return null;
  }
}

export default function AuthBridgePage(): React.ReactNode {
  const [returnTo] = useState<string | null>(() => resolveInitialReturnUrl());
  const [forceSelect] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('select') === '1';
  });
  const [isBusy, setIsBusy] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [wrongEmailDetected, setWrongEmailDetected] = useState<boolean>(false);

  const returnHostname = (() => {
    if (!returnTo) return 'sabbir-sqa.vercel.app';
    try {
      return new URL(returnTo).hostname;
    } catch {
      return 'Portfolio';
    }
  })();

  const completeAndRedirectBack = async (credResult: UserCredential, targetUrl: string) => {
    if (!isVerifiedFirebaseOwner(credResult.user)) {
      const wrongEmail = credResult.user?.email || 'অন্য ইমেইল';
      await purgeExpiredRuntimeAuthSession();
      setWrongEmailDetected(true);
      setIsBusy(false);
      setErrorMsg(
        `"${wrongEmail}" অনুমোদিত নয়। শুধুমাত্র "${PRIMARY_OWNER_EMAIL}" দিয়ে লগইন ও স্ক্যান করা যাবে।`
      );
      return;
    }

    const oauthCred = GoogleAuthProvider.credentialFromResult(credResult);
    const idToken = oauthCred?.idToken || '';
    const accessToken = oauthCred?.accessToken || '';

    if (!idToken && !accessToken) {
      await purgeExpiredRuntimeAuthSession();
      setIsBusy(false);
      setErrorMsg(
        'Google OAuth টোকেন পাওয়া যায়নি। নিচের বাটনে আবার ট্যাপ করে লগইন করুন।'
      );
      return;
    }

    try {
      window.sessionStorage.removeItem(BRIDGE_RETURN_TO_STORAGE_KEY);
    } catch {
      // Ignore
    }

    try {
      await signOut(auth);
    } catch {
      // Ignore temporary bridge sign-out errors
    }

    const hashParams = new URLSearchParams();
    if (idToken) hashParams.set('cloud_auth_id_token', idToken);
    if (accessToken) hashParams.set('cloud_auth_access_token', accessToken);

    window.location.replace(`${targetUrl}#${hashParams.toString()}`);
  };

  useEffect(() => {
    let active = true;

    if (!returnTo) {
      setIsBusy(false);
      setErrorMsg('অবৈধ রিটার্ন লিংক। অনুগ্রহ করে আপনার মূল ওয়েবসাইটের Admin Panel থেকে আবার চেষ্টা করুন।');
      return;
    }

    getRedirectResult(auth, browserPopupRedirectResolver)
      .then(async (redirectRes) => {
        if (!active) return;
        if (redirectRes && redirectRes.user) {
          await completeAndRedirectBack(redirectRes, returnTo);
          return;
        }
        setIsBusy(false);
      })
      .catch(async (err) => {
        if (!active) return;
        await purgeExpiredRuntimeAuthSession();
        const formatted = formatMobileAwareAuthError(err);
        setErrorMsg(formatted.message);
        setIsBusy(false);
      });

    return () => {
      active = false;
    };
  }, [returnTo]);

  const handlePopupVerify = async (selectAccount = forceSelect) => {
    if (!returnTo || isBusy) return;

    const provider = createOwnerGoogleProvider(PRIMARY_OWNER_EMAIL, selectAccount);
    setErrorMsg(null);
    setWrongEmailDetected(false);
    setIsBusy(true);

    try {
      const res = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      await completeAndRedirectBack(res, returnTo);
    } catch (err) {
      const formatted = formatMobileAwareAuthError(err);

      // Automatic same-tab redirect fallback on mobile if browser blocked the popup
      if (
        isMobileBrowserDevice() &&
        !isEmbeddedInAppWebView() &&
        (formatted.code.includes('popup-blocked') ||
          formatted.code.includes('operation-not-supported') ||
          formatted.code.includes('web-storage-unsupported'))
      ) {
        try {
          await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
          return;
        } catch (redirectErr) {
          const redirectFormatted = formatMobileAwareAuthError(redirectErr);
          setErrorMsg(redirectFormatted.message);
          setIsBusy(false);
          return;
        }
      }

      setErrorMsg(formatted.message);
      setIsBusy(false);
    }
  };

  const handleSameTabRedirectVerify = async (selectAccount = forceSelect) => {
    if (!returnTo || isBusy) return;
    const provider = createOwnerGoogleProvider(PRIMARY_OWNER_EMAIL, selectAccount);
    setErrorMsg(null);
    setWrongEmailDetected(false);
    setIsBusy(true);
    try {
      await signInWithRedirect(auth, provider, browserPopupRedirectResolver);
    } catch (err) {
      const formatted = formatMobileAwareAuthError(err);
      setErrorMsg(formatted.message);
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#080B11] text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#0E1320] border border-white/15 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Verified Google Cloud Auth Bridge</span>
            </div>
            <h1 className="font-display font-bold text-lg sm:text-xl text-white tracking-tight">
              Confirm Owner Login &amp; Scan
            </h1>
          </div>
        </div>

        {/* Target Domain & Owner Email Summary */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5 text-xs text-slate-200 leading-relaxed">
          <p>
            <strong className="text-emerald-300 font-mono">{returnHostname}</strong> থেকে আপনার প্রজেক্ট ও ব্লগগুলো Google Cloud Database-এ স্ক্যান করতে নিচের বাটনে ট্যাপ করে লগইন নিশ্চিত করুন। লগইন সফল হলে স্বয়ংক্রিয়ভাবে আপনার সাইটে ফিরে গিয়ে স্ক্যান সম্পন্ন হবে।
          </p>
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#090D16] border border-emerald-500/30">
            <span className="inline-flex items-center gap-2 min-w-0">
              <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono font-semibold text-emerald-200 truncate">
                {PRIMARY_OWNER_EMAIL}
              </span>
            </span>
            <span className="text-[11px] text-emerald-400 font-medium shrink-0">Only</span>
          </div>
        </div>

        {/* Error / Feedback */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 space-y-2.5 leading-relaxed">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            {wrongEmailDetected && (
              <button
                type="button"
                onClick={() => handlePopupVerify(true)}
                className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>অন্য Google Account বেছে নিন ({PRIMARY_OWNER_EMAIL})</span>
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {returnTo && (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => handlePopupVerify(forceSelect)}
              disabled={isBusy}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-950/50 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${isBusy ? 'animate-spin' : ''}`} />
              <span className="truncate">
                {isBusy
                  ? 'Verifying & Returning...'
                  : `Continue (${PRIMARY_OWNER_EMAIL}) & Scan`}
              </span>
            </button>

            {!isEmbeddedInAppWebView() && (
              <button
                type="button"
                onClick={() => handleSameTabRedirectVerify(forceSelect)}
                disabled={isBusy}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/35 text-indigo-200 text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate">পপআপ ছাড়া ডাইরেক্ট কানেক্ট (Same-Tab)</span>
              </button>
            )}
          </div>
        )}

        {/* Return to Portfolio */}
        {returnTo && (
          <div className="pt-1 border-t border-white/10 flex justify-start">
            <a
              href={returnTo}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors min-h-[36px]"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>ফিরে যান ({returnHostname})</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
