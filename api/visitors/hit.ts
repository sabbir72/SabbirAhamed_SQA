import type { VercelRequest, VercelResponse } from '@vercel/node';

let totalVisitors = 1421;
let totalPageViews = 3892;
let todayVisitors = 29;
let todayDate = new Date().toISOString().split('T')[0];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const currentToday = new Date().toISOString().split('T')[0];
  if (todayDate !== currentToday) {
    todayDate = currentToday;
    todayVisitors = 0;
  }

  totalPageViews += 1;
  const { isNewSession } = req.body || {};
  if (isNewSession || req.method === 'POST') {
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
