/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Virtual Visiting Card State & Power Tools Store
 * Description : Manages Privacy Controls, Multilingual Dictionaries (EN/BN),
 *               Expiring Access Tokens, Digital Wallet Pass configuration,
 *               and Team Cards Management.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-20
 * -----------------------------------------
 */

import type { ProfileData } from './portfolioStore';

export type CardLanguage = 'en' | 'bn';

export interface PrivacySettings {
  showPhone: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showWhatsApp: boolean;
  maskContactInPublic: boolean;
}

export interface TeamMemberCard {
  id: string;
  name: string;
  nameBn: string;
  role: string;
  roleBn: string;
  department: string;
  departmentBn: string;
  phone: string;
  email: string;
  avatar: string;
  verifiedId: string;
}

export interface ExpiringToken {
  token: string;
  expiresAt: number; // Unix timestamp ms
  durationLabel: string;
  createdAt: number;
}

const STORAGE_KEY_PRIVACY = 'sqa_vcard_privacy_v1';
const STORAGE_KEY_TEAM = 'sqa_vcard_team_v1';

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  showPhone: true,
  showEmail: true,
  showLocation: true,
  showWhatsApp: true,
  maskContactInPublic: false,
};

export const DEFAULT_TEAM_MEMBERS: TeamMemberCard[] = [
  {
    id: 'sabbir-lead',
    name: 'Sabbir Ahamed',
    nameBn: 'সাব্বির আহমেদ',
    role: 'Software Quality Assurance Engineer',
    roleBn: 'সফটওয়্যার কোয়ালিটি অ্যাসিউরেন্স ইঞ্জিনিয়ার',
    department: 'Manual & automation Test',
    departmentBn: 'ম্যানুয়াল ও অটোমেশন টেস্ট',
    phone: '+8801681387906',
    email: 'sabbircse72@gmail.com',
    avatar: '/sabbir_avatar.jpeg',
    verifiedId: '',
  },
  {
    id: 'sqa-automation-team',
    name: 'SQA Automation Core',
    nameBn: 'এসকিউএ অটোমেশন কোর টিম',
    role: 'Playwright & Cypress Testing Unit',
    roleBn: 'প্লে-রাইট ও সাইপ্রেস টেস্টিং ইউনিট',
    department: 'Manual & automation Test',
    departmentBn: 'ম্যানুয়াল ও অটোমেশন টেস্ট',
    phone: '+8801681387906',
    email: 'sqa.automation@sabbirahamed.com',
    avatar: '/sabbir_avatar.jpeg',
    verifiedId: '',
  },
  {
    id: 'security-audit-desk',
    name: 'Security & API Audit Desk',
    nameBn: 'সিকিউরিটি ও এপিআই অডিট ডেস্ক',
    role: 'Postman & REST API Verification',
    roleBn: 'পোস্টম্যান ও রেস্ট এপিআই ভেরিফিকেশন',
    department: 'Manual & automation Test',
    departmentBn: 'ম্যানুয়াল ও অটোমেশন টেস্ট',
    phone: '+8801681387906',
    email: 'api.audit@sabbirahamed.com',
    avatar: '/sabbir_avatar.jpeg',
    verifiedId: '',
  },
];

// Multilingual translations
export const VCARD_I18N = {
  en: {
    modalTitle: 'Virtual Visiting Card',
    modalSubtitle: 'Tap contactless, scan QR, or save directly to phone contacts',
    tabSmartCard: '3D Smart Card',
    tabPrivacy: 'Privacy & Access',
    tabTeam: 'Team Directory',
    tabWallet: 'Wallet & Calendar',
    tabNfc: 'NFC Beam',
    tabScan: 'Scan QR',
    tabPrint: 'Print Card',
    flipFront: 'Front View',
    flipBack: 'Back View',
    clickToFlip: 'Click to flip front & back',
    saveToPhone: 'Save to Phone',
    saveVcfNote: '.VCF Contact File',
    whatsAppChat: 'WhatsApp Chat',
    directMsg: 'Direct Message',
    shareCard: 'Share Card',
    webShare: 'Native Share',
    saveQr: 'Save QR Image',
    highResPng: 'High-Res PNG',
    call: 'Call',
    email: 'Email',
    verifiedBadge: 'SQA',
    offlineBadge: 'Offline vCard Ready',
    authSignature: 'Authorized Signature',
    holdNearPhone: 'Hold near phone to beam contact',
    dynamicQrNote: 'Dynamic Cloud QR: Always up-to-date even if contact details change.',
    privacyHeader: 'Privacy & Visibility Controls',
    privacyDesc: 'Control which sensitive contact details are exposed to the public.',
    maskLabel: 'Mask sensitive phone & email in public view',
    showPhoneLabel: 'Show Telephone Number',
    showEmailLabel: 'Show Email Address',
    showLocationLabel: 'Show Physical Location',
    showWhatsAppLabel: 'Allow WhatsApp Quick Chat',
    expiringHeader: 'Expiring Access Links',
    expiringDesc: 'Generate temporary private links for recruiters or clients that expire automatically.',
    generate24h: 'Create 24-Hour Pass',
    generate7d: 'Create 7-Day Pass',
    generate30d: 'Create 30-Day Pass',
    activeToken: 'Active Temporary Pass',
    expiresIn: 'Expires in',
    copyPassLink: 'Copy Pass Link',
    walletHeader: 'Apple & Google Wallet Pass',
    walletDesc: 'Store Sabbir Ahamed’s SQA Visiting Card inside Apple Wallet (iOS) or Google Wallet (Android).',
    addToApple: 'Add to Apple Wallet',
    addToGoogle: 'Add to Google Wallet',
    downloadPassJson: 'Download Pass Data (.json)',
    scheduleHeader: 'Direct Calendar Integration',
    scheduleDesc: 'Directly schedule an interview or technical evaluation meeting.',
    teamHeader: 'Organization & Team Cards',
    teamDesc: 'Manage and switch between individual or department virtual visiting cards.',
    verificationModalTitle: 'Cryptographic Credential Verification',
    verificationDesc: 'All SQA credentials on this digital card are verified and authenticated.',
  },
  bn: {
    modalTitle: 'ভার্চুয়াল ভিজিটিং কার্ড',
    modalSubtitle: 'NFC কন্ট্যাক্টলেস ট্যাপ করুন, QR স্ক্যান করুন অথবা ফোনে সরাসরি সেভ করুন',
    tabSmartCard: '৩ডি স্মার্ট কার্ড',
    tabPrivacy: 'প্রাইভেসি ও মেয়াদ',
    tabTeam: 'টিম ডিরেক্টরি',
    tabWallet: 'ওয়ালেট ও ক্যালেন্ডার',
    tabNfc: 'NFC বিম',
    tabScan: 'QR স্ক্যানার',
    tabPrint: 'প্রিন্ট কার্ড',
    flipFront: 'সামনের ভিউ',
    flipBack: 'পেছনের ভিউ',
    clickToFlip: 'কার্ড উল্টাতে ক্লিক করুন',
    saveToPhone: 'ফোনে সেভ করুন',
    saveVcfNote: '.VCF কন্ট্যাক্ট ফাইল',
    whatsAppChat: 'হোয়াটসঅ্যাপ চ্যাট',
    directMsg: 'সরাসরি মেসেজ',
    shareCard: 'কার্ড শেয়ার',
    webShare: 'নেটিভ শেয়ার',
    saveQr: 'QR ইমেজ সেভ',
    highResPng: 'হাই-রেজোলিউশন PNG',
    call: 'কল করুন',
    email: 'ইমেইল করুন',
    verifiedBadge: 'ভেরিফাইড SQA',
    offlineBadge: 'অফলাইন vCard সক্রিয়',
    authSignature: 'অনুমোদিত স্বাক্ষর',
    holdNearPhone: 'ফোনের পেছনে ধরে কন্ট্যাক্ট বিম করুন',
    dynamicQrNote: 'ডায়নামিক ক্লাউড QR: তথ্য আপডেট হলেও মুদ্রিত কিউআর কোড পরিবর্তন করার প্রয়োজন নেই।',
    privacyHeader: 'প্রাইভেসি ও তথ্য নিয়ন্ত্রণ',
    privacyDesc: 'পাবলিক ভিউতে কোন কোন ব্যক্তিগত তথ্য প্রদর্শন করবেন তা নিয়ন্ত্রণ করুন।',
    maskLabel: 'পাবলিক ভিউতে ফোন ও ইমেইল আংশিক মাস্ক (গোপন) রাখুন',
    showPhoneLabel: 'টেলিফোন নম্বর প্রদর্শন করুন',
    showEmailLabel: 'ইমেইল অ্যাড্রেস প্রদর্শন করুন',
    showLocationLabel: 'বর্তমান ঠিকানা প্রদর্শন করুন',
    showWhatsAppLabel: 'সরাসরি হোয়াটসঅ্যাপ চ্যাট অনুমতি দিন',
    expiringHeader: 'মেয়াদোত্তীর্ণ অ্যাক্সেস লিংক (Expiring Access)',
    expiringDesc: 'রিক্রুটার বা ক্লায়েন্টদের জন্য নির্দিষ্ট মেয়াদের টেম্পোরারি অ্যাক্সেস লিংক তৈরি করুন।',
    generate24h: '২৪ ঘণ্টার পাস তৈরি করুন',
    generate7d: '৭ দিনের পাস তৈরি করুন',
    generate30d: '৩০ দিনের পাস তৈরি করুন',
    activeToken: 'সক্রিয় অস্থায়ী পাস',
    expiresIn: 'বাকি সময়',
    copyPassLink: 'পাস লিংক কপি করুন',
    walletHeader: 'অ্যাপল ও গুগল ওয়ালেট পাস (Digital Wallet)',
    walletDesc: 'অ্যাপল ওয়ালেট (iOS) অথবা গুগল ওয়ালেটে (Android) স্মার্ট ডিজিটাল কার্ড সংরক্ষণ করুন।',
    addToApple: 'Apple Wallet-এ যুক্ত করুন',
    addToGoogle: 'Google Wallet-এ যুক্ত করুন',
    downloadPassJson: 'ওয়ালেট পাস ডাটা ডাউনলোড (.json)',
    scheduleHeader: 'ডিরেক্ট ক্যালেন্ডার মিটিং ইন্টিগ্রেশন',
    scheduleDesc: 'সরাসরি টেকনিক্যাল ইন্টারভিউ বা এসকিউএ প্রজেক্ট ডিসকাশন শিডিউল করুন।',
    teamHeader: 'টিম ও কর্মী কার্ড ব্যবস্থাপনা (Team Dashboard)',
    teamDesc: 'ব্যক্তিগত কার্ড ও প্রতিষ্ঠানের বিভিন্ন শাখার ডিজিটাল কার্ড পরিচালনা ও পরিবর্তন করুন।',
    verificationModalTitle: 'ক্রিপ্টোগ্রাফিক পরিচিতি যাচাইকরণ (Verified Profile)',
    verificationDesc: 'এই ডিজিটাল কার্ডের সকল এসকিউএ টেস্ট ক্রেডেনশিয়াল সুরক্ষিত ও যাচাইকৃত।',
  },
};

/**
 * Load Privacy Settings from LocalStorage
 */
export function loadPrivacySettings(): PrivacySettings {
  if (typeof window === 'undefined') return DEFAULT_PRIVACY_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRIVACY);
    if (raw) return { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load privacy settings', e);
  }
  return DEFAULT_PRIVACY_SETTINGS;
}

/**
 * Save Privacy Settings to LocalStorage
 */
export function savePrivacySettings(settings: PrivacySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PRIVACY, JSON.stringify(settings));
    notifyVCardStoreUpdated(true);
  } catch (e) {
    console.error('Failed to save privacy settings', e);
  }
}

/**
 * Mask string helper (e.g. +8801681387906 -> +880 16***-***06)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 8) return '••••••••';
  const clean = phone.trim();
  const start = clean.slice(0, 6);
  const end = clean.slice(-2);
  return `${start}****${end}`;
}

export function maskEmailAddress(email: string): string {
  if (!email || !email.includes('@')) return '••••@••••.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

/**
 * Generates temporary access token with expiration
 */
export function generateExpiringAccessToken(durationHours: number): ExpiringToken {
  const now = Date.now();
  const expiresAt = now + durationHours * 60 * 60 * 1000;
  const token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  
  let label = `${durationHours} Hours`;
  if (durationHours === 24) label = '24 Hours (Recruiter Pass)';
  if (durationHours === 168) label = '7 Days (Evaluation Pass)';
  if (durationHours === 720) label = '30 Days (Client Pass)';

  return {
    token,
    expiresAt,
    durationLabel: label,
    createdAt: now,
  };
}

/**
 * Checks if a token is still valid
 */
export function isTokenValid(tokenObj: ExpiringToken | null): boolean {
  if (!tokenObj) return false;
  return Date.now() < tokenObj.expiresAt;
}

/**
 * Format remaining time human-readable
 */
export function formatRemainingTime(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Generates Apple Wallet Pass specification payload (.pkpass representation)
 */
export function generateWalletPassJson(profile: ProfileData, cardUrl: string) {
  return {
    formatVersion: 1,
    passTypeIdentifier: 'pass.com.sabbirahamed.sqa.vcard',
    serialNumber: `SQA-PASS-${Date.now()}`,
    teamIdentifier: 'SQA72BANGLADESH',
    organizationName: 'Sabbir Ahamed SQA Solutions',
    description: `${profile.name} - SQA Digital Business Card`,
    logoText: 'Sabbir.SQAE',
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(8, 11, 17)',
    labelColor: 'rgb(0, 210, 255)',
    generic: {
      primaryFields: [
        {
          key: 'member',
          label: 'ENGINEER',
          value: profile.name,
        },
      ],
      secondaryFields: [
        {
          key: 'title',
          label: 'SPECIALIZATION',
          value: profile.title,
        },
        {
          key: 'phone',
          label: 'DIRECT CONTACT',
          value: profile.phone,
        },
      ],
      auxiliaryFields: [
        {
          key: 'status',
          label: 'VERIFICATION',
          value: 'CERTIFIED SDET',
        },
        {
          key: 'email',
          label: 'EMAIL',
          value: profile.email,
        },
      ],
      backFields: [
        {
          key: 'portfolio',
          label: 'ONLINE PORTFOLIO',
          value: cardUrl,
        },
        {
          key: 'skills',
          label: 'CORE EXPERTISE',
          value: 'Playwright, Cypress, Selenium, Postman API, Allure Reporting, CI/CD',
        },
        {
          key: 'location',
          label: 'LOCATION',
          value: profile.location,
        },
      ],
    },
    barcode: {
      format: 'PKBarcodeFormatQR',
      message: cardUrl,
      messageEncoding: 'iso-8859-1',
      altText: 'Scan to view full verified SQA card',
    },
  };
}

// -------------------------------------------------------------
// VISITING CARD GLOBAL CONFIGURATION & CRUD ADMIN MANAGEMENT
// -------------------------------------------------------------

export const VCARD_STORE_UPDATED_EVENT = 'sqa_vcard_store_updated';
const STORAGE_KEY_CONFIG = 'sqa_vcard_global_config_v1';

export interface VisitingCardConfig {
  company: string;
  companyBn: string;
  department: string;
  departmentBn: string;
  verifiedBadge: string;
  permanentUrl: string;
  defaultSkin: string;
  defaultQrMode: 'url' | 'vcard' | 'whatsapp' | 'linkedin';
  headlineEn: string;
  headlineBn: string;
}

export const DEFAULT_VCARD_CONFIG: VisitingCardConfig = {
  company: 'Altersense Ltd',
  companyBn: 'অল্টারসেন্স লিমিটেড',
  department: 'Manual & automation Test',
  departmentBn: 'ম্যানুয়াল ও অটোমেশন টেস্ট',
  verifiedBadge: 'SQA',
  permanentUrl: 'https://sabbir-sqa.vercel.app/?card=1#vcard',
  defaultSkin: 'executive-dark',
  defaultQrMode: 'url',
  headlineEn: 'Software Quality Assurance & Automation Engineering',
  headlineBn: 'সফটওয়্যার কোয়ালিটি অ্যাসিউরেন্স ও অটোমেশন ইঞ্জিনিয়ারিং',
};

/**
 * Ensures QR code and NFC URLs consistently carry the query parameter (?card=1)
 * so that camera scanners on mobile devices reliably open the card modal directly.
 */
export function sanitizePermanentCardUrl(url?: string): string {
  const officialCardUrl = 'https://sabbir-sqa.vercel.app/?card=1#vcard';
  if (!url || typeof url !== 'string') return officialCardUrl;
  
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed.includes('sabbirahamed.com') ||
    trimmed.includes('run.app') ||
    trimmed.includes('localhost') ||
    trimmed.includes('web.app')
  ) {
    return officialCardUrl;
  }

  // If the URL does not contain 'card' anywhere, or is missing ?card= query param
  if (!trimmed.toLowerCase().includes('card') || (!trimmed.includes('?card=') && !trimmed.includes('&card='))) {
    if (trimmed.includes('#')) {
      const [base] = trimmed.split('#');
      return `${base.replace(/\/$/, '')}/?card=1#vcard`;
    }
    return `${trimmed.replace(/\/$/, '')}/?card=1#vcard`;
  }

  return trimmed;
}

export const VCARD_USER_CHANGED_EVENT = 'sqa_vcard_user_changed';

/**
 * Dispatches an event across the window so all components re-render immediately
 */
export function notifyVCardStoreUpdated(fromUserEdit = false): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VCARD_STORE_UPDATED_EVENT));
    if (fromUserEdit) {
      window.dispatchEvent(new CustomEvent(VCARD_USER_CHANGED_EVENT));
    }
  }
}

/**
 * Load global visiting card configuration
 */
export function loadVisitingCardConfig(): VisitingCardConfig {
  if (typeof window === 'undefined') return DEFAULT_VCARD_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Automatically sanitize and migrate any stored or legacy URL
      const currentUrl = parsed.permanentUrl;
      const sanitizedUrl = sanitizePermanentCardUrl(currentUrl);
      
      if (currentUrl !== sanitizedUrl) {
        parsed.permanentUrl = sanitizedUrl;
        try {
          localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ ...DEFAULT_VCARD_CONFIG, ...parsed }));
        } catch (e) {
          // ignore
        }
      }
      return { ...DEFAULT_VCARD_CONFIG, ...parsed, permanentUrl: sanitizedUrl };
    }
  } catch (e) {
    console.error('Failed to load visiting card config', e);
  }
  return DEFAULT_VCARD_CONFIG;
}

/**
 * Save global visiting card configuration
 */
export function saveVisitingCardConfig(updates: Partial<VisitingCardConfig>): VisitingCardConfig {
  const current = loadVisitingCardConfig();
  const merged: VisitingCardConfig = { 
    ...current, 
    ...updates,
    permanentUrl: updates.permanentUrl ? sanitizePermanentCardUrl(updates.permanentUrl) : current.permanentUrl
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
      notifyVCardStoreUpdated(true);
    } catch (e) {
      console.error('Failed to save visiting card config', e);
    }
  }
  return merged;
}

/**
 * Load team members / staff cards from storage (falling back to default)
 */
export function loadTeamMembers(): TeamMemberCard[] {
  if (typeof window === 'undefined') return DEFAULT_TEAM_MEMBERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEAM);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load team members', e);
  }
  return DEFAULT_TEAM_MEMBERS;
}

/**
 * Save full list of team members
 */
export function saveTeamMembers(members: TeamMemberCard[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(members));
    notifyVCardStoreUpdated(true);
  } catch (e) {
    console.error('Failed to save team members', e);
  }
}

/**
 * Hydrates Visiting Card Config, Privacy, and Team Members silently from Cloud Database
 */
export function hydrateVisitingCardFromCloud(payload: {
  vcardConfig?: Partial<VisitingCardConfig>;
  vcardPrivacy?: Partial<PrivacySettings>;
  vcardTeam?: TeamMemberCard[];
}): void {
  if (typeof window === 'undefined') return;
  let changed = false;

  if (payload.vcardConfig && typeof payload.vcardConfig === 'object') {
    const mergedCfg: VisitingCardConfig = {
      ...DEFAULT_VCARD_CONFIG,
      ...payload.vcardConfig,
      permanentUrl: sanitizePermanentCardUrl(payload.vcardConfig.permanentUrl),
    };
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(mergedCfg));
      changed = true;
    } catch {
      // ignore
    }
  }

  if (payload.vcardPrivacy && typeof payload.vcardPrivacy === 'object') {
    const mergedPriv: PrivacySettings = {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...payload.vcardPrivacy,
    };
    try {
      localStorage.setItem(STORAGE_KEY_PRIVACY, JSON.stringify(mergedPriv));
      changed = true;
    } catch {
      // ignore
    }
  }

  if (Array.isArray(payload.vcardTeam) && payload.vcardTeam.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(payload.vcardTeam));
      changed = true;
    } catch {
      // ignore
    }
  }

  if (changed) {
    notifyVCardStoreUpdated(false);
  }
}

/**
 * Add a new team member visiting card
 */
export function addTeamMember(memberData: Omit<TeamMemberCard, 'id'> & { id?: string }): TeamMemberCard {
  const current = loadTeamMembers();
  const newMember: TeamMemberCard = {
    id: memberData.id || `member-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: memberData.name.trim(),
    nameBn: memberData.nameBn?.trim() || memberData.name.trim(),
    role: memberData.role.trim(),
    roleBn: memberData.roleBn?.trim() || memberData.role.trim(),
    department: memberData.department?.trim() || 'Manual & automation Test',
    departmentBn: memberData.departmentBn?.trim() || 'ম্যানুয়াল ও অটোমেশন টেস্ট',
    phone: memberData.phone?.trim() || '+8801681387906',
    email: memberData.email?.trim() || 'sabbircse72@gmail.com',
    avatar: memberData.avatar?.trim() || '/sabbir_avatar.jpeg',
    verifiedId: memberData.verifiedId?.trim() || '',
  };

  const updated = [newMember, ...current];
  saveTeamMembers(updated);
  return newMember;
}

/**
 * Update an existing team member visiting card
 */
export function updateTeamMember(id: string, updates: Partial<TeamMemberCard>): boolean {
  const current = loadTeamMembers();
  const index = current.findIndex(m => m.id === id);
  if (index === -1) return false;

  current[index] = { ...current[index], ...updates };
  saveTeamMembers(current);
  return true;
}

/**
 * Delete a team member visiting card
 */
export function deleteTeamMember(id: string): boolean {
  const current = loadTeamMembers();
  if (current.length <= 1) {
    // Keep at least one card
    return false;
  }
  const filtered = current.filter(m => m.id !== id);
  if (filtered.length === current.length) return false;

  saveTeamMembers(filtered);
  return true;
}

/**
 * Duplicate an existing team member card
 */
export function duplicateTeamMember(id: string): TeamMemberCard | null {
  const current = loadTeamMembers();
  const target = current.find(m => m.id === id);
  if (!target) return null;

  const clone: TeamMemberCard = {
    ...target,
    id: `copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: `${target.name} (Copy)`,
    nameBn: `${target.nameBn} (কপি)`,
  };

  const updated = [...current, clone];
  saveTeamMembers(updated);
  return clone;
}

/**
 * Reset team members to original default cards
 */
export function resetTeamMembers(): void {
  saveTeamMembers(DEFAULT_TEAM_MEMBERS);
}

