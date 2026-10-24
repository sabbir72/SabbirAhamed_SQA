/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Blog Store & Non-Destructive Persistent Sync Manager
 * Description : Handles persistent storage, non-destructive default + custom merging,
 *               server/cloud synchronization, CRUD operations, slug generation,
 *               and reactive state events for blog articles.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-24
 * -----------------------------------------
 */

import { BlogPost, BLOG_POSTS, BLOG_CATEGORIES } from '../data/blogs';
import { isAdminAuthenticated } from './adminAuth';
import {
  getStoredProfile,
  getStoredPortfolioData,
  syncBlogStateToPortfolioServer,
  SERVER_BLOGS_SYNCED_EVENT,
} from './portfolioStore';
import {
  deleteBlogFromCloud,
  pushAllBlogsToCloud,
  pushBlogToCloud,
} from './cloudSync';
import { PERSONAL_INFO } from '../data';

const STORAGE_KEY = 'sabbir_portfolio_blogs_v1';
const CATEGORIES_STORAGE_KEY = 'sabbir_portfolio_blog_categories_v1';
const DELETED_BLOGS_STORAGE_KEY = 'sabbir_portfolio_deleted_blogs_v1';
export const BLOGS_UPDATED_EVENT = 'sabbir_blogs_updated';

const DEFAULT_CUSTOM_CATEGORIES = BLOG_CATEGORIES.filter((c) => c !== 'All');

const CANDIDATE_BLOG_KEYS = [
  STORAGE_KEY,
  'sabbir_portfolio_blogs',
  'sabbir_blog_posts',
];

function getDeletedBlogIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_BLOGS_STORAGE_KEY);
    const localIds: string[] = raw ? JSON.parse(raw) : [];
    const portfolioIds = getStoredPortfolioData().deletedBlogIds || [];
    return Array.from(
      new Set(
        [...(Array.isArray(localIds) ? localIds : []), ...portfolioIds].filter(
          (id): id is string => typeof id === 'string' && id.trim().length > 0
        )
      )
    );
  } catch {
    return [];
  }
}

function saveDeletedBlogIds(ids: string[]): void {
  const clean = Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)));
  try {
    localStorage.setItem(DELETED_BLOGS_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // ignore
  }
}

/**
 * Normalizes author avatar to always reflect the main profile avatar from PERSONAL_INFO
 */
function normalizeAuthorAvatar(post: BlogPost): BlogPost {
  const liveProfile = getStoredProfile();
  const currentAvatar = post.author?.avatar || '';
  const isSabbir =
    !post.author?.name ||
    post.author.name === PERSONAL_INFO.name ||
    post.author.name === liveProfile.name;
  const isInternalAvatar =
    currentAvatar.includes('sabbir_avatar') ||
    currentAvatar.includes('./assets') ||
    !currentAvatar;

  if (isSabbir || isInternalAvatar) {
    return {
      ...post,
      author: {
        ...post.author,
        name: post.author?.name || liveProfile.name || PERSONAL_INFO.name,
        role: post.author?.role || liveProfile.title || PERSONAL_INFO.title,
        avatar: liveProfile.avatar || PERSONAL_INFO.avatar || '/sabbir_avatar.jpeg',
        bio:
          post.author?.bio ||
          'SQA Engineer specializing in Manual & Automated Testing, API Validation, ERPNext QA, and CI/CD Quality Gates.',
      },
    };
  }
  return post;
}

/**
 * Non-destructively merges saved/custom blog posts with secondary and default posts by id & slug,
 * honoring explicit deletions (`deletedIds`) so custom live articles and newly seeded articles coexist.
 */
function mergeBlogPostsNonDestructive(
  primaryList: BlogPost[],
  secondaryList: BlogPost[],
  defaultList: BlogPost[],
  deletedIds: string[]
): BlogPost[] {
  const deletedSet = new Set(deletedIds);
  const byId = new Map<string, BlogPost>();
  const slugToId = new Map<string, string>();
  const orderedIds: string[] = [];

  const upsert = (rawPost: BlogPost | undefined, isDefaultSeed = false) => {
    if (!rawPost || typeof rawPost.id !== 'string' || !rawPost.id.trim()) return;
    if (deletedSet.has(rawPost.id)) return;

    const normalized = normalizeAuthorAvatar({
      ...rawPost,
      status: rawPost.status || 'Published',
    });
    const cleanSlug = (normalized.slug || '').trim().toLowerCase();

    // Avoid duplicate slugs if same post was stored under a different id unless it's an edit
    const existingIdForSlug = cleanSlug ? slugToId.get(cleanSlug) : undefined;
    const targetId = byId.has(normalized.id) ? normalized.id : existingIdForSlug || normalized.id;

    if (deletedSet.has(targetId)) return;

    const existing = byId.get(targetId);
    if (!existing) {
      byId.set(targetId, normalized);
      if (cleanSlug) slugToId.set(cleanSlug, targetId);
      orderedIds.push(targetId);
    } else if (!isDefaultSeed) {
      const t1 = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
      const t2 = normalized.updatedAt ? Date.parse(normalized.updatedAt) : 0;
      if (!Number.isNaN(t2) && !Number.isNaN(t1) && t2 > t1) {
        byId.set(targetId, normalized);
      }
    }
  };

  const defaultIds = new Set(defaultList.map((d) => d.id));
  const defaultSlugs = new Set(defaultList.map((d) => d.slug.toLowerCase()));

  // 1. Custom live-created posts come first so user's custom blogs never get buried or lost
  for (const post of primaryList) {
    if (!defaultIds.has(post.id) && !defaultSlugs.has((post.slug || '').toLowerCase())) {
      upsert(post);
    }
  }
  for (const post of secondaryList) {
    if (!defaultIds.has(post.id) && !defaultSlugs.has((post.slug || '').toLowerCase())) {
      upsert(post);
    }
  }

  // 2. Newly seeded codebase articles that were not yet present in primary/secondary
  const knownIds = new Set([...primaryList.map((p) => p.id), ...secondaryList.map((p) => p.id)]);
  const knownSlugs = new Set([
    ...primaryList.map((p) => (p.slug || '').toLowerCase()),
    ...secondaryList.map((p) => (p.slug || '').toLowerCase()),
  ]);
  for (const defPost of defaultList) {
    if (!knownIds.has(defPost.id) && !knownSlugs.has(defPost.slug.toLowerCase())) {
      upsert(defPost, true);
    }
  }

  // 3. Remaining saved & default posts in order
  for (const post of primaryList) upsert(post);
  for (const post of secondaryList) upsert(post);
  for (const defPost of defaultList) upsert(defPost, true);

  return orderedIds.map((id) => byId.get(id)!).filter(Boolean);
}

/**
 * Retrieve all available blog categories (excluding 'All'), combining stored custom categories
 * and any categories used by existing blog posts.
 */
export function getStoredBlogCategories(): string[] {
  let savedCategories: string[] = [];
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        savedCategories = parsed.filter(
          (c): c is string => typeof c === 'string' && c.trim().length > 0 && c.trim().toLowerCase() !== 'all'
        );
      }
    }
  } catch (err) {
    console.error('Error reading blog categories from localStorage:', err);
  }

  const portfolioCategories = getStoredPortfolioData().blogCategories || [];
  for (const cat of portfolioCategories) {
    const trimmed = typeof cat === 'string' ? cat.trim() : '';
    if (
      trimmed &&
      trimmed.toLowerCase() !== 'all' &&
      !savedCategories.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())
    ) {
      savedCategories.push(trimmed);
    }
  }

  if (savedCategories.length === 0) {
    savedCategories = [...DEFAULT_CUSTOM_CATEGORIES];
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(savedCategories));
    } catch {
      // ignore
    }
  }

  const posts = getStoredBlogPosts();
  const merged = [...savedCategories];
  for (const post of posts) {
    const cat = post.category?.trim();
    if (
      cat &&
      cat.toLowerCase() !== 'all' &&
      !merged.some((existing) => existing.toLowerCase() === cat.toLowerCase())
    ) {
      merged.push(cat);
    }
  }

  return merged;
}

/**
 * Retrieve all categories prefixed with 'All' for filter bars
 */
export function getAllBlogFilterCategories(): string[] {
  return ['All', ...getStoredBlogCategories()];
}

/**
 * Create and persist a new blog category
 */
export function addBlogCategory(categoryName: string): string[] {
  const trimmed = categoryName.trim();
  const current = getStoredBlogCategories();
  if (!trimmed || trimmed.toLowerCase() === 'all') {
    return current;
  }

  const exists = current.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  const updated = exists ? current : [...current, trimmed];

  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
    syncBlogStateToPortfolioServer(getStoredBlogPosts(), updated, getDeletedBlogIds());
    window.dispatchEvent(new Event(BLOGS_UPDATED_EVENT));
  } catch (err) {
    console.error('Error saving blog categories:', err);
  }

  return updated;
}

/**
 * Remove a category from the stored categories list
 */
export function deleteBlogCategory(categoryName: string): string[] {
  const trimmed = categoryName.trim().toLowerCase();
  const current = getStoredBlogCategories();
  const updated = current.filter((c) => c.toLowerCase() !== trimmed);
  const finalCategories = updated.length > 0 ? updated : ['Software Testing'];

  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(finalCategories));
    syncBlogStateToPortfolioServer(getStoredBlogPosts(), finalCategories, getDeletedBlogIds());
    window.dispatchEvent(new Event(BLOGS_UPDATED_EVENT));
  } catch (err) {
    console.error('Error deleting blog category:', err);
  }

  return finalCategories;
}

/**
 * Initialize and load blog posts from LocalStorage + Portfolio Server mirror + Default dataset non-destructively
 */
export function getStoredBlogPosts(): BlogPost[] {
  const deletedIds = getDeletedBlogIds();
  let collectedLocal: BlogPost[] = [];

  try {
    for (const key of CANDIDATE_BLOG_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: BlogPost[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          collectedLocal = mergeBlogPostsNonDestructive(collectedLocal, parsed, [], deletedIds);
        }
      }
    }
  } catch (err) {
    console.error('Error reading blog posts from localStorage:', err);
  }

  const portfolioMirrorBlogs = getStoredPortfolioData().blogs || [];
  const mergedPosts = mergeBlogPostsNonDestructive(
    collectedLocal,
    portfolioMirrorBlogs,
    BLOG_POSTS,
    deletedIds
  );

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedPosts));
    localStorage.setItem('sabbir_portfolio_blogs', JSON.stringify(mergedPosts));
  } catch {
    // ignore
  }

  return mergedPosts;
}

/**
 * Save full blog posts array to LocalStorage, sync to backend/cloud, and trigger event listener
 */
export function saveStoredBlogPosts(posts: BlogPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    localStorage.setItem('sabbir_portfolio_blogs', JSON.stringify(posts));
    syncBlogStateToPortfolioServer(posts, getStoredBlogCategories(), getDeletedBlogIds());
    window.dispatchEvent(new Event(BLOGS_UPDATED_EVENT));
  } catch (err) {
    console.error('Error saving blog posts to localStorage:', err);
  }
}

// Listen for server blog hydration events emitted by portfolioStore on startup or import
if (typeof window !== 'undefined') {
  window.addEventListener(SERVER_BLOGS_SYNCED_EVENT, ((event: CustomEvent) => {
    const detail = event.detail || {};
    const serverBlogs: BlogPost[] = Array.isArray(detail.blogs) ? detail.blogs : [];
    const serverCategories: string[] = Array.isArray(detail.blogCategories) ? detail.blogCategories : [];
    const serverDeletedIds: string[] = Array.isArray(detail.deletedBlogIds) ? detail.deletedBlogIds : [];

    const combinedDeleted = Array.from(new Set([...getDeletedBlogIds(), ...serverDeletedIds]));
    saveDeletedBlogIds(combinedDeleted);

    if (serverBlogs.length > 0) {
      const localPosts = getStoredBlogPosts();
      const merged = mergeBlogPostsNonDestructive(serverBlogs, localPosts, BLOG_POSTS, combinedDeleted);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        localStorage.setItem('sabbir_portfolio_blogs', JSON.stringify(merged));
      } catch {
        // ignore
      }
    }

    if (serverCategories.length > 0) {
      const currentCats = getStoredBlogCategories();
      const mergedCats = [...currentCats];
      for (const c of serverCategories) {
        const trimmed = typeof c === 'string' ? c.trim() : '';
        if (
          trimmed &&
          trimmed.toLowerCase() !== 'all' &&
          !mergedCats.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())
        ) {
          mergedCats.push(trimmed);
        }
      }
      try {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(mergedCats));
      } catch {
        // ignore
      }
    }

    window.dispatchEvent(new Event(BLOGS_UPDATED_EVENT));
  }) as EventListener);
}

/**
 * Find single blog post by slug
 */
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  const posts = getStoredBlogPosts();
  return posts.find((p) => p.slug === slug);
}

/**
 * Helper to auto-generate a clean URL slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Helper to calculate reading time from markdown content
 */
export function calculateReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * Create or Update a Blog Post (Restricted strictly to authenticated Admin)
 */
export function upsertBlogPost(postData: Partial<BlogPost> & { title?: string; content?: string }): BlogPost {
  if (!isAdminAuthenticated()) {
    throw new Error('Unauthorized: Admin authentication required to create or modify blog posts.');
  }

  const posts = getStoredBlogPosts();
  const postTitle = postData.title?.trim() || 'Untitled Article';
  const postContent = postData.content ?? '';

  let cleanSlug = postData.slug?.trim() ? generateSlug(postData.slug) : generateSlug(postTitle);
  if (!cleanSlug) {
    cleanSlug = `blog-${Date.now()}`;
  }

  let finalSlug = cleanSlug;
  let counter = 1;
  while (posts.some((p) => p.slug === finalSlug && p.id !== postData.id)) {
    finalSlug = `${cleanSlug}-${counter}`;
    counter++;
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const formattedDate = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (postData.id) {
    const index = posts.findIndex((p) => p.id === postData.id);
    if (index !== -1) {
      const existing = posts[index];
      const resolvedCategory = postData.category?.trim() || existing.category || 'Software Testing';
      addBlogCategory(resolvedCategory);

      const updatedPost: BlogPost = {
        ...existing,
        ...postData,
        id: existing.id,
        title: postTitle,
        slug: finalSlug,
        content: postContent,
        category: resolvedCategory,
        description: postData.description !== undefined ? postData.description : existing.description || '',
        coverImage:
          postData.coverImage ||
          existing.coverImage ||
          'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200',
        publishDate: postData.publishDate || existing.publishDate || formattedDate,
        readingTime: postData.readingTime || calculateReadingTime(postContent),
        tags: postData.tags || existing.tags || ['QA'],
        featured: postData.featured ?? existing.featured ?? false,
        status: postData.status || existing.status || 'Published',
        updatedAt: nowIso,
        author: {
          name: postData.author?.name || existing.author?.name || 'Sabbir Ahamed',
          role: postData.author?.role || existing.author?.role || 'Software Quality Assurance Engineer',
          avatar: postData.author?.avatar || existing.author?.avatar || '/sabbir_avatar.jpeg',
          bio:
            postData.author?.bio ||
            existing.author?.bio ||
            'SQA Engineer specializing in Manual & Automated Testing.',
        },
      };

      posts[index] = updatedPost;
      saveStoredBlogPosts(posts);
      void pushBlogToCloud(updatedPost, index).catch((err) =>
        console.error('Cloud blog update sync error:', err)
      );
      return updatedPost;
    }
  }

  const resolvedNewCategory = postData.category?.trim() || 'Software Testing';
  addBlogCategory(resolvedNewCategory);

  const newPost: BlogPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: postTitle,
    slug: finalSlug,
    category: resolvedNewCategory,
    description: postData.description || '',
    content: postContent,
    coverImage:
      postData.coverImage ||
      'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200',
    publishDate: postData.publishDate || formattedDate,
    readingTime: postData.readingTime || calculateReadingTime(postContent),
    tags: postData.tags && postData.tags.length > 0 ? postData.tags : ['Software Testing', 'SQA'],
    featured: postData.featured || false,
    status: postData.status || 'Published',
    updatedAt: nowIso,
    author: {
      name: postData.author?.name || 'Sabbir Ahamed',
      role: postData.author?.role || 'Software Quality Assurance Engineer',
      avatar: postData.author?.avatar || '/sabbir_avatar.jpeg',
      bio:
        postData.author?.bio ||
        'SQA Engineer specializing in Manual & Automated Testing, API Validation, ERPNext QA, and CI/CD Quality Gates.',
    },
  };

  const updatedList = [newPost, ...posts];
  saveStoredBlogPosts(updatedList);
  void pushAllBlogsToCloud(updatedList).catch((err) =>
    console.error('Cloud blog create sync error:', err)
  );
  return newPost;
}

/**
 * Delete a Blog Post by ID (Restricted strictly to authenticated Admin)
 */
export function deleteBlogPost(id: string): boolean {
  if (!isAdminAuthenticated()) {
    console.warn('Unauthorized attempt to delete blog post.');
    return false;
  }

  const posts = getStoredBlogPosts();
  const filtered = posts.filter((p) => p.id !== id);
  if (filtered.length !== posts.length) {
    const deletedIds = [...getDeletedBlogIds(), id];
    saveDeletedBlogIds(deletedIds);
    saveStoredBlogPosts(filtered);
    void deleteBlogFromCloud(id).catch((err) =>
      console.error('Cloud blog delete sync error:', err)
    );
    return true;
  }
  return false;
}

/**
 * Reset posts to default sample dataset (Restricted strictly to authenticated Admin)
 */
export function resetStoredBlogPosts(): BlogPost[] {
  if (!isAdminAuthenticated()) {
    console.warn('Unauthorized attempt to reset blog posts.');
    return getStoredBlogPosts();
  }

  saveDeletedBlogIds([]);
  const defaults = BLOG_POSTS.map((post) =>
    normalizeAuthorAvatar({
      ...post,
      status: 'Published' as const,
    })
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  localStorage.setItem('sabbir_portfolio_blogs', JSON.stringify(defaults));
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(DEFAULT_CUSTOM_CATEGORIES));
  syncBlogStateToPortfolioServer(defaults, DEFAULT_CUSTOM_CATEGORIES, []);
  void pushAllBlogsToCloud(defaults).catch((err) =>
    console.error('Cloud blog reset sync error:', err)
  );
  window.dispatchEvent(new Event(BLOGS_UPDATED_EVENT));
  return defaults;
}
