import type { VercelRequest, VercelResponse } from '@vercel/node';

let visitorCount = 0;
let pageViews = 0;
let todayCount = 0;
let todayDate = new Date().toISOString().split('T')[0];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const currentToday = new Date().toISOString().split('T')[0];
  if (todayDate !== currentToday) {
    todayDate = currentToday;
    todayCount = 0;
  }

  if (req.method === 'POST') {
    pageViews += 1;
    visitorCount += 1;
    todayCount += 1;
    return res.status(200).json({
      success: true,
      totalVisitors: visitorCount,
      totalPageViews: pageViews,
      todayVisitors: todayCount,
      todayDate,
    });
  }

  return res.status(200).json({
    success: true,
    totalVisitors: visitorCount,
    totalPageViews: pageViews,
    todayVisitors: todayCount,
    todayDate,
  });
}
