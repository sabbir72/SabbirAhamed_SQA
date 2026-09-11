import type { VercelRequest, VercelResponse } from '@vercel/node';

let totalVisitors = 0;
let totalPageViews = 0;
let todayVisitors = 0;
let todayDate = new Date().toISOString().split('T')[0];
const seenVisitors = new Set<string>();
const todaySeenVisitors = new Set<string>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const currentToday = new Date().toISOString().split('T')[0];
  if (todayDate !== currentToday) {
    todayDate = currentToday;
    todayVisitors = 0;
    todaySeenVisitors.clear();
  }

  totalPageViews += 1;
  const { visitorId, sessionId, isNewSession } = req.body || {};
  const uniqueId = (typeof visitorId === 'string' && visitorId.trim()) || 
                   (typeof sessionId === 'string' && sessionId.trim()) || null;

  if (uniqueId) {
    if (!seenVisitors.has(uniqueId)) {
      seenVisitors.add(uniqueId);
      totalVisitors += 1;
    }
    if (!todaySeenVisitors.has(uniqueId)) {
      todaySeenVisitors.add(uniqueId);
      todayVisitors += 1;
    }
  } else if (isNewSession) {
    totalVisitors += 1;
    todayVisitors += 1;
  }

  return res.status(200).json({
    success: true,
    totalVisitors,
    totalPageViews,
    todayVisitors,
    todayDate,
  });
}
