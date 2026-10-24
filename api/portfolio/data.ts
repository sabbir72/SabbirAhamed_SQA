import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

const TMP_PORTFOLIO_FILE = path.join('/tmp', 'portfolio_custom_data.json');
const ROOT_PORTFOLIO_FILE = path.join(process.cwd(), 'portfolio_custom_data.json');

function readJsonSafe(filePath: string): Record<string, any> | null {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function mergeById(primary: any[] | undefined, secondary: any[] | undefined, deletedIds: string[] = []): any[] {
  const deleted = new Set(deletedIds);
  const map = new Map<string, any>();
  const order: string[] = [];

  for (const item of [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(secondary) ? secondary : [])]) {
    if (!item || typeof item.id !== 'string' || deleted.has(item.id)) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
      order.push(item.id);
    }
  }

  return order.map((id) => map.get(id));
}

function loadMergedPortfolioData(): Record<string, any> | null {
  const tmpData = readJsonSafe(TMP_PORTFOLIO_FILE);
  const rootData = readJsonSafe(ROOT_PORTFOLIO_FILE);

  if (tmpData && rootData) {
    const deletedProjectIds = Array.from(
      new Set([...(tmpData.deletedProjectIds || []), ...(rootData.deletedProjectIds || [])])
    );
    const deletedBlogIds = Array.from(
      new Set([...(tmpData.deletedBlogIds || []), ...(rootData.deletedBlogIds || [])])
    );
    return {
      ...rootData,
      ...tmpData,
      projects: mergeById(tmpData.projects, rootData.projects, deletedProjectIds),
      blogs: mergeById(tmpData.blogs, rootData.blogs, deletedBlogIds),
      deletedProjectIds,
      deletedBlogIds,
    };
  }

  return tmpData || rootData;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const data = loadMergedPortfolioData();
    return res.status(200).json({ success: true, data: data || null });
  }

  if (req.method === 'POST') {
    try {
      const token = (req.headers['x-admin-token'] as string) || req.body?.token;
      const isAuthorized = Boolean(token && typeof token === 'string' && token.startsWith('sabbir_sqa_admin_'));

      if (!isAuthorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: Admin token required.' });
      }

      const { data } = req.body || {};
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid portfolio data payload.' });
      }

      const existing = loadMergedPortfolioData() || {};
      const deletedProjectIds = Array.from(
        new Set([...(data.deletedProjectIds || []), ...(existing.deletedProjectIds || [])])
      );
      const deletedBlogIds = Array.from(
        new Set([...(data.deletedBlogIds || []), ...(existing.deletedBlogIds || [])])
      );

      const mergedToSave = {
        ...existing,
        ...data,
        projects: mergeById(data.projects, existing.projects, deletedProjectIds),
        blogs: mergeById(data.blogs, existing.blogs, deletedBlogIds),
        deletedProjectIds,
        deletedBlogIds,
        lastModified: new Date().toISOString(),
      };

      try {
        fs.writeFileSync(TMP_PORTFOLIO_FILE, JSON.stringify(mergedToSave, null, 2), 'utf-8');
      } catch {
        // In case tmp is restricted
      }

      return res.status(200).json({ success: true, message: 'Portfolio data updated successfully.' });
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to process portfolio data.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
