/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Blog Store & Persistent LocalStorage Manager
 * Description : Handles persistent storage, CRUD operations, slug generation,
 *               and reactive state events for blog articles.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-08-04
 * -----------------------------------------
 */

import { BlogPost, BLOG_POSTS, BLOG_CATEGORIES } from '../data/blogs';
import { isAdminAuthenticated } from './adminAuth';
import { getStoredProfile } from './portfolioStore';
import { PERSONAL_INFO } from '../data';

const STORAGE_KEY = 'sabbir_portfolio_blogs_v1';
const CATEGORIES_STORAGE_KEY = 'sabbir_portfolio_blog_categories_v1';
export const BLOGS_UPDATED_EVENT = 'sabbir_blogs_updated';

const DEFAULT_CUSTOM_CATEGORIES = BLOG_CATEGORIES.filter((c) => c !== 'All');

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
        savedCategories = parsed.filter((c): c is string => typeof c === 'string' && c.trim().length > 0 && c.trim().toLowerCase() !== 'all');
      }
    }
  } catch (err) {
    console.error('Error reading blog categories from localStorage:', err);
  }

  if (savedCategories.length === 0) {
    savedCategories = [...DEFAULT_CUSTOM_CATEGORIES];
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(savedCategories));
    } catch (e) {
      // ignore
    }
  }

  // Merge in any categories already used on existing posts without case-insensitive duplicates
  const posts = getStoredBlogPosts();
  const merged = [...savedCategories];
  for (const post of posts) {
    const cat = post.category?.trim();
    if (cat && cat.toLowerCase() !== 'all' && !merged.some((existing) => existing.toLowerCase() === cat.toLowerCase())) {
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
    window.dispatchEvent(new Event(BLOGS_UPDATED_EVENT));
  } catch (err) {
    console.error('Error deleting blog category:', err);
  }

  return finalCategories;
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

const CANDIDATE_BLOG_KEYS = [
  STORAGE_KEY,
  'sabbir_portfolio_blogs',
  'sabbir_blog_posts'
];

/**
 * Initialize and load blog posts from LocalStorage or default dataset non-destructively
 */
export function getStoredBlogPosts(): BlogPost[] {
  try {
    for (const key of CANDIDATE_BLOG_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: BlogPost[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure status field exists and sync author profile avatar from main profile
          const synchronizedPosts = parsed.map(post => normalizeAuthorAvatar({
            ...post,
            status: post.status || 'Published',
          }));

          // Synchronize to primary key if loaded from fallback
          if (key !== STORAGE_KEY) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(synchronizedPosts));
            } catch (e) {
              // ignore
            }
          }

          return synchronizedPosts;
        }
      }
    }
  } catch (err) {
    console.error('Error reading blog posts from localStorage:', err);
  }

  // First time initialization fallback - load default posts with status 'Published'
  const initialPosts = BLOG_POSTS.map(post => normalizeAuthorAvatar({
    ...post,
    status: post.status || ('Published' as const),
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPosts));
    localStorage.setItem('sabbir_portfolio_blogs', JSON.stringify(initialPosts));
  } catch (e) {
    // ignore
  }
  return initialPosts;
}

/**
 * Save full blog posts array to LocalStorage and trigger event listener
 */
export function saveStoredBlogPosts(posts: BlogPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    window.dispatchEvent(new Event(BLOGS_UPDATED_EVENT));
  } catch (err) {
    console.error('Error saving blog posts to localStorage:', err);
  }
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

  // Clean / generate slug
  let cleanSlug = postData.slug?.trim() ? generateSlug(postData.slug) : generateSlug(postTitle);
  if (!cleanSlug) {
    cleanSlug = `blog-${Date.now()}`;
  }

  // Ensure unique slug if new post or changing slug
  let finalSlug = cleanSlug;
  let counter = 1;
  while (posts.some(p => p.slug === finalSlug && p.id !== postData.id)) {
    finalSlug = `${cleanSlug}-${counter}`;
    counter++;
  }

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (postData.id) {
    // UPDATE existing post
    const index = posts.findIndex(p => p.id === postData.id);
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
        description: postData.description !== undefined ? postData.description : (existing.description || ''),
        coverImage: postData.coverImage || existing.coverImage || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200',
        publishDate: postData.publishDate || existing.publishDate || formattedDate,
        readingTime: postData.readingTime || calculateReadingTime(postContent),
        tags: postData.tags || existing.tags || ['QA'],
        featured: postData.featured ?? existing.featured ?? false,
        status: postData.status || existing.status || 'Published',
        author: {
          name: postData.author?.name || existing.author?.name || 'Sabbir Ahamed',
          role: postData.author?.role || existing.author?.role || 'Software Quality Assurance Engineer',
          avatar: postData.author?.avatar || existing.author?.avatar || '/sabbir_avatar.jpeg',
          bio: postData.author?.bio || existing.author?.bio || 'SQA Engineer specializing in Manual & Automated Testing.',
        },
      };

      posts[index] = updatedPost;
      saveStoredBlogPosts(posts);
      return updatedPost;
    }
  }

  // CREATE new post
  const resolvedNewCategory = postData.category?.trim() || 'Software Testing';
  addBlogCategory(resolvedNewCategory);

  const newPost: BlogPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: postTitle,
    slug: finalSlug,
    category: resolvedNewCategory,
    description: postData.description || '',
    content: postContent,
    coverImage: postData.coverImage || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200',
    publishDate: postData.publishDate || formattedDate,
    readingTime: postData.readingTime || calculateReadingTime(postContent),
    tags: postData.tags && postData.tags.length > 0 ? postData.tags : ['Software Testing', 'SQA'],
    featured: postData.featured || false,
    status: postData.status || 'Published',
    author: {
      name: postData.author?.name || 'Sabbir Ahamed',
      role: postData.author?.role || 'Software Quality Assurance Engineer',
      avatar: postData.author?.avatar || '/sabbir_avatar.jpeg',
      bio: postData.author?.bio || 'SQA Engineer specializing in Manual & Automated Testing, API Validation, ERPNext QA, and CI/CD Quality Gates.',
    },
  };

  // Add to beginning of array
  const updatedList = [newPost, ...posts];
  saveStoredBlogPosts(updatedList);
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
  const filtered = posts.filter(p => p.id !== id);
  if (filtered.length !== posts.length) {
    saveStoredBlogPosts(filtered);
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

  const defaults = BLOG_POSTS.map(post => ({
    ...post,
    status: 'Published' as const,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(DEFAULT_CUSTOM_CATEGORIES));
  window.dispatchEvent(new Event(BLOGS_UPDATED_EVENT));
  return defaults;
}
