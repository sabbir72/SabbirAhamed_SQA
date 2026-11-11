/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Frontend User Submissions & Defect Database Store
 * Description : Persists visitor/user frontend inputs (Contact Form inquiries and
 *               Bug Tracker defect tickets) directly to PostgreSQL backend endpoints
 *               with local cache fallback and Admin triage support.
 * Author      : Sabbir Ahamed
 * -----------------------------------------
 */

import { getOwnerIdToken } from '../firebase';
import { BUG_REPORTS } from '../data';
import type { BugReport } from '../types';
import { canFirebaseOwnerWrite } from './cloudSync';

export type ContactMessageStatus = 'new' | 'read' | 'resolved';

export interface StoredContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAtIso: string;
  source?: 'cloud' | 'local';
}

export interface StoredBugReport extends BugReport {
  visibility: 'public';
  createdAtIso: string;
  source?: 'cloud' | 'local' | 'default';
}

export const USER_SUBMISSIONS_UPDATED_EVENT = 'sabbir_user_submissions_updated';

const LOCAL_CONTACT_MESSAGES_KEY = 'sabbir_user_contact_messages_v1';
const LOCAL_BUG_REPORTS_KEY = 'sabbir_user_bug_reports_v1';

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function readLocalArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocalArray<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(USER_SUBMISSIONS_UPDATED_EVENT));
  } catch {
    // Ignore storage errors
  }
}

export function getLocalContactMessages(): StoredContactMessage[] {
  return readLocalArray<StoredContactMessage>(LOCAL_CONTACT_MESSAGES_KEY).sort((a, b) =>
    (b.createdAtIso || '').localeCompare(a.createdAtIso || '')
  );
}

export function getMergedLocalBugReports(): StoredBugReport[] {
  const localUserBugs = readLocalArray<StoredBugReport>(LOCAL_BUG_REPORTS_KEY);
  const byId = new Map<string, StoredBugReport>();

  for (const item of BUG_REPORTS) {
    byId.set(item.id, {
      ...item,
      visibility: 'public',
      createdAtIso: '2026-07-29T00:00:00.000Z',
      source: 'default',
    });
  }

  for (const item of localUserBugs) {
    byId.set(item.id, { ...item, visibility: 'public' });
  }

  return Array.from(byId.values()).sort((a, b) =>
    (b.createdAtIso || '').localeCompare(a.createdAtIso || '')
  );
}

export interface SubmitContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function submitContactMessageToDb(
  input: SubmitContactInput
): Promise<StoredContactMessage> {
  const id = makeSafeId('msg');
  const createdAtIso = new Date().toISOString();

  const record: StoredContactMessage = {
    id,
    name: input.name.trim().slice(0, 160),
    email: input.email.trim().slice(0, 240),
    subject: input.subject.trim().slice(0, 300),
    message: input.message.trim().slice(0, 5000),
    status: 'new',
    createdAtIso,
    source: 'cloud',
  };

  const existingLocal = getLocalContactMessages();
  writeLocalArray(LOCAL_CONTACT_MESSAGES_KEY, [
    { ...record, source: 'local' },
    ...existingLocal.filter((m) => m.id !== id),
  ]);

  const res = await fetch('/api/submissions/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errJson.error || 'Failed to save message.');
  }

  return record;
}

export interface SubmitBugReportInput {
  title: string;
  project: string;
  severity: 'Critical' | 'Major' | 'Minor';
  description: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
}

export async function submitBugReportToDb(
  input: SubmitBugReportInput
): Promise<StoredBugReport> {
  const id = makeSafeId('BUG_USER');
  const createdAtIso = new Date().toISOString();
  const normalizedSteps = (
    input.stepsToReproduce.length > 0
      ? input.stepsToReproduce
      : ['Navigate to application URL', 'Trigger standard workflow', 'Observe anomalous outcome']
  )
    .slice(0, 25)
    .map((s) => s.trim().slice(0, 1000))
    .filter((s) => s.length > 0);

  const safeSteps =
    normalizedSteps.length > 0
      ? normalizedSteps
      : ['Navigate to application URL', 'Observe anomalous outcome'];

  const record: StoredBugReport = {
    id,
    visibility: 'public',
    title: input.title.trim().slice(0, 300),
    project: (input.project.trim() || 'SaaS E-Commerce Platform').slice(0, 200),
    severity: input.severity,
    description: input.description.trim().slice(0, 5000),
    stepsToReproduce: safeSteps,
    expectedResult: (
      input.expectedResult.trim() || 'System executes operation smoothly without errors.'
    ).slice(0, 2000),
    actualResult: (
      input.actualResult.trim() || 'System encounters error or unexpected UI degradation.'
    ).slice(0, 2000),
    status: 'Open',
    createdAtIso,
    source: 'cloud',
  };

  const localBugs = readLocalArray<StoredBugReport>(LOCAL_BUG_REPORTS_KEY);
  writeLocalArray(LOCAL_BUG_REPORTS_KEY, [
    { ...record, source: 'local' },
    ...localBugs.filter((b) => b.id !== id),
  ]);

  const res = await fetch('/api/submissions/bugs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errJson.error || 'Failed to submit bug report.');
  }

  return record;
}

export function subscribeBugReportsFromDb(
  onChange: (bugs: StoredBugReport[]) => void
): () => void {
  onChange(getMergedLocalBugReports());

  let disposed = false;

  const fetchBugs = async () => {
    try {
      const res = await fetch('/api/submissions/bugs', { cache: 'no-store' });
      if (!res.ok || disposed) return;
      const json = (await res.json()) as {
        success?: boolean;
        data?: Array<Record<string, unknown>>;
      };
      if (!json.success || !Array.isArray(json.data) || disposed) return;

      const cloudBugs: StoredBugReport[] = json.data
        .filter((d) => d && typeof d.title === 'string')
        .map((d) => ({
          id: String(d.id || ''),
          visibility: 'public',
          title: String(d.title),
          project: typeof d.project === 'string' ? d.project : 'SaaS E-Commerce Platform',
          severity:
            d.severity === 'Critical' || d.severity === 'Major' || d.severity === 'Minor'
              ? d.severity
              : 'Major',
          description: typeof d.description === 'string' ? d.description : '',
          stepsToReproduce: Array.isArray(d.stepsToReproduce)
            ? d.stepsToReproduce.filter((s): s is string => typeof s === 'string')
            : [],
          expectedResult: typeof d.expectedResult === 'string' ? d.expectedResult : '',
          actualResult: typeof d.actualResult === 'string' ? d.actualResult : '',
          status: d.status === 'Resolved' ? 'Resolved' : 'Open',
          createdAtIso:
            typeof d.createdAtIso === 'string' ? d.createdAtIso : new Date().toISOString(),
          source: 'cloud',
        }));

      const localBugs = readLocalArray<StoredBugReport>(LOCAL_BUG_REPORTS_KEY);
      const mergedMap = new Map<string, StoredBugReport>();

      for (const item of BUG_REPORTS) {
        mergedMap.set(item.id, {
          ...item,
          visibility: 'public',
          createdAtIso: '2026-07-29T00:00:00.000Z',
          source: 'default',
        });
      }

      for (const item of localBugs) {
        mergedMap.set(item.id, { ...item, visibility: 'public' });
      }

      for (const item of cloudBugs) {
        mergedMap.set(item.id, item);
      }

      const nonDefault = Array.from(mergedMap.values()).filter((b) => b.source !== 'default');
      writeLocalArray(LOCAL_BUG_REPORTS_KEY, nonDefault);

      const sorted = Array.from(mergedMap.values()).sort((a, b) =>
        (b.createdAtIso || '').localeCompare(a.createdAtIso || '')
      );
      if (!disposed) {
        onChange(sorted);
      }
    } catch {
      // Keep local fallback intact
    }
  };

  void fetchBugs();

  const handleFocus = () => void fetchBugs();
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
  }

  return () => {
    disposed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus);
    }
  };
}

export function subscribeContactMessagesForAdmin(
  onChange: (messages: StoredContactMessage[]) => void
): () => void {
  onChange(getLocalContactMessages());

  if (!canFirebaseOwnerWrite()) {
    return () => {};
  }

  let disposed = false;

  const fetchMessages = async () => {
    try {
      const idToken = await getOwnerIdToken();
      if (!idToken || disposed) return;

      const res = await fetch('/api/submissions/messages', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok || disposed) return;

      const json = (await res.json()) as {
        success?: boolean;
        data?: Array<Record<string, unknown>>;
      };
      if (!json.success || !Array.isArray(json.data) || disposed) return;

      const cloudMessages: StoredContactMessage[] = json.data
        .filter((d) => d && typeof d.name === 'string')
        .map((d) => ({
          id: String(d.id || ''),
          name: String(d.name),
          email: typeof d.email === 'string' ? d.email : '',
          subject: typeof d.subject === 'string' ? d.subject : '',
          message: typeof d.message === 'string' ? d.message : '',
          status:
            d.status === 'read' || d.status === 'resolved' ? d.status : 'new',
          createdAtIso:
            typeof d.createdAtIso === 'string' ? d.createdAtIso : new Date().toISOString(),
          source: 'cloud',
        }));

      const localMessages = getLocalContactMessages();
      const mergedMap = new Map<string, StoredContactMessage>();
      for (const m of localMessages) mergedMap.set(m.id, m);
      for (const m of cloudMessages) mergedMap.set(m.id, m);

      const sorted = Array.from(mergedMap.values()).sort((a, b) =>
        (b.createdAtIso || '').localeCompare(a.createdAtIso || '')
      );
      writeLocalArray(LOCAL_CONTACT_MESSAGES_KEY, sorted);
      if (!disposed) {
        onChange(sorted);
      }
    } catch {
      // Keep cached messages intact
    }
  };

  void fetchMessages();

  return () => {
    disposed = true;
  };
}

export async function updateContactMessageStatusInDb(
  messageId: string,
  status: ContactMessageStatus
): Promise<void> {
  const local = getLocalContactMessages().map((m) =>
    m.id === messageId ? { ...m, status } : m
  );
  writeLocalArray(LOCAL_CONTACT_MESSAGES_KEY, local);

  if (!canFirebaseOwnerWrite()) return;
  const idToken = await getOwnerIdToken();
  if (!idToken) return;

  const res = await fetch(`/api/submissions/messages/${encodeURIComponent(messageId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errJson.error || 'Failed to update message status.');
  }
}

export async function deleteContactMessageFromDb(messageId: string): Promise<void> {
  const local = getLocalContactMessages().filter((m) => m.id !== messageId);
  writeLocalArray(LOCAL_CONTACT_MESSAGES_KEY, local);

  if (!canFirebaseOwnerWrite()) return;
  const idToken = await getOwnerIdToken();
  if (!idToken) return;

  const res = await fetch(`/api/submissions/messages/${encodeURIComponent(messageId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errJson.error || 'Failed to delete message.');
  }
}

export async function updateBugReportStatusInDb(
  bug: StoredBugReport,
  status: 'Open' | 'Resolved'
): Promise<void> {
  const local = readLocalArray<StoredBugReport>(LOCAL_BUG_REPORTS_KEY);
  const existsLocal = local.some((b) => b.id === bug.id);
  const updatedList = existsLocal
    ? local.map((b) => (b.id === bug.id ? { ...b, status } : b))
    : [{ ...bug, status, source: 'local' as const }, ...local];
  writeLocalArray(LOCAL_BUG_REPORTS_KEY, updatedList);

  if (!canFirebaseOwnerWrite()) return;
  const idToken = await getOwnerIdToken();
  if (!idToken) return;

  const res = await fetch(`/api/submissions/bugs/${encodeURIComponent(bug.id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      status,
      fallbackBug: {
        title: bug.title.slice(0, 300),
        project: bug.project.slice(0, 200),
        severity: bug.severity,
        description: bug.description.slice(0, 5000),
        stepsToReproduce: bug.stepsToReproduce.slice(0, 25).map((s) => s.slice(0, 1000)),
        expectedResult: bug.expectedResult.slice(0, 2000),
        actualResult: bug.actualResult.slice(0, 2000),
        createdAtIso: bug.createdAtIso || new Date().toISOString(),
      },
    }),
  });

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errJson.error || 'Failed to update ticket status.');
  }
}

export async function deleteBugReportFromDb(bugId: string): Promise<void> {
  const local = readLocalArray<StoredBugReport>(LOCAL_BUG_REPORTS_KEY).filter(
    (b) => b.id !== bugId
  );
  writeLocalArray(LOCAL_BUG_REPORTS_KEY, local);

  if (!canFirebaseOwnerWrite()) return;
  const idToken = await getOwnerIdToken();
  if (!idToken) return;

  const res = await fetch(`/api/submissions/bugs/${encodeURIComponent(bugId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errJson.error || 'Failed to delete defect ticket.');
  }
}
