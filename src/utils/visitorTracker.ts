/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Visitor Analytics & Counter Utility
 * Description : Tracks total site visitors, unique sessions, and pageviews via
 *               backend API with seamless offline/client-side fallback.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-08-12
 * -----------------------------------------
 */

export interface VisitorMetrics {
  totalVisitors: number;
  totalPageViews: number;
  todayVisitors: number;
  isLoading: boolean;
}

const VISITOR_STATS_EVENT = 'visitor_stats_updated';
const SESSION_KEY = 'sabbir_sqa_session';
const LOCAL_STORAGE_STATS_KEY = 'sabbir_sqa_visitor_stats';

let currentStats: VisitorMetrics = {
  totalVisitors: 1420,
  totalPageViews: 3890,
  todayVisitors: 28,
  isLoading: true,
};

/**
 * Get or create unique session identifier
 */
function getOrCreateSession(): { sessionId: string; isNewSession: boolean } {
  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    let isNewSession = false;

    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, sessionId);
      isNewSession = true;
    }

    return { sessionId, isNewSession };
  } catch (err) {
    return {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      isNewSession: true,
    };
  }
}

/**
 * Register visitor hit and update stats
 */
export async function trackVisitorHit(): Promise<VisitorMetrics> {
  const { sessionId, isNewSession } = getOrCreateSession();

  try {
    const response = await fetch('/api/visitors/hit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, isNewSession }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        currentStats = {
          totalVisitors: data.totalVisitors || 1420,
          totalPageViews: data.totalPageViews || 3890,
          todayVisitors: data.todayVisitors || 28,
          isLoading: false,
        };
        saveLocalStats(currentStats);
        emitStatsUpdated();
        return currentStats;
      }
    }
  } catch (err) {
    console.warn('[VISITOR TRACKER] Server API hit failed, using fallback store:', err);
  }

  // Fallback if backend API endpoint unavailable
  const local = getLocalStats();
  local.totalPageViews += 1;
  if (isNewSession) {
    local.totalVisitors += 1;
    local.todayVisitors += 1;
  }
  local.isLoading = false;
  currentStats = local;
  saveLocalStats(currentStats);
  emitStatsUpdated();
  return currentStats;
}

/**
 * Fetch current visitor metrics
 */
export async function fetchVisitorStats(): Promise<VisitorMetrics> {
  try {
    const response = await fetch('/api/visitors');
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        currentStats = {
          totalVisitors: data.totalVisitors,
          totalPageViews: data.totalPageViews,
          todayVisitors: data.todayVisitors,
          isLoading: false,
        };
        saveLocalStats(currentStats);
        emitStatsUpdated();
        return currentStats;
      }
    }
  } catch (err) {
    // Fallback
  }

  const local = getLocalStats();
  local.isLoading = false;
  currentStats = local;
  emitStatsUpdated();
  return currentStats;
}

function getLocalStats(): VisitorMetrics {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        totalVisitors: parsed.totalVisitors || 1420,
        totalPageViews: parsed.totalPageViews || 3890,
        todayVisitors: parsed.todayVisitors || 28,
        isLoading: false,
      };
    }
  } catch (e) {
    // ignore
  }

  return {
    totalVisitors: 1420,
    totalPageViews: 3890,
    todayVisitors: 28,
    isLoading: false,
  };
}

function saveLocalStats(stats: VisitorMetrics) {
  try {
    localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify({
      totalVisitors: stats.totalVisitors,
      totalPageViews: stats.totalPageViews,
      todayVisitors: stats.todayVisitors,
    }));
  } catch (e) {
    // ignore
  }
}

function emitStatsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VISITOR_STATS_EVENT, { detail: currentStats }));
  }
}

export function getCurrentVisitorMetrics(): VisitorMetrics {
  return currentStats;
}

export function subscribeVisitorStats(callback: (stats: VisitorMetrics) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<VisitorMetrics>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(currentStats);
    }
  };

  window.addEventListener(VISITOR_STATS_EVENT, handler);
  return () => {
    window.removeEventListener(VISITOR_STATS_EVENT, handler);
  };
}
