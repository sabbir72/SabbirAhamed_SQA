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

import { BlogPost, BLOG_POSTS } from '../data/blogs';
import { isAdminAuthenticated } from './adminAuth';

const STORAGE_KEY = 'sabbir_portfolio_blogs_v1';
export const BLOGS_UPDATED_EVENT = 'sabbir_blogs_updated';

/**
 * Initialize and load blog posts from LocalStorage or default dataset
 */
export function getStoredBlogPosts(): BlogPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First time initialization - load default posts with status 'Published'
      const initialPosts = BLOG_POSTS.map(post => ({
        ...post,
        status: post.status || ('Published' as const),
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPosts));
      return initialPosts;
    }
    const parsed: BlogPost[] = JSON.parse(raw);
    // Ensure status field exists for legacy saved posts
    return parsed.map(post => ({
      ...post,
      status: post.status || 'Published',
    }));
  } catch (err) {
    console.error('Error reading blog posts from localStorage:', err);
    return BLOG_POSTS.map(post => ({ ...post, status: 'Published' }));
  }
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
export function upsertBlogPost(postData: Partial<BlogPost> & { title: string; content: string }): BlogPost {
  if (!isAdminAuthenticated()) {
    throw new Error('Unauthorized: Admin authentication required to create or modify blog posts.');
  }

  const posts = getStoredBlogPosts();
  
  // Clean / generate slug
  let cleanSlug = postData.slug ? generateSlug(postData.slug) : generateSlug(postData.title);
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
      const updatedPost: BlogPost = {
        ...existing,
        ...postData,
        id: existing.id,
        title: postData.title,
        slug: finalSlug,
        content: postData.content,
        category: postData.category || existing.category || 'Software Testing',
        description: postData.description || existing.description || '',
        coverImage: postData.coverImage || existing.coverImage || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200',
        publishDate: postData.publishDate || existing.publishDate || formattedDate,
        readingTime: postData.readingTime || calculateReadingTime(postData.content),
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
  const newPost: BlogPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: postData.title,
    slug: finalSlug,
    category: postData.category || 'Software Testing',
    description: postData.description || '',
    content: postData.content,
    coverImage: postData.coverImage || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200',
    publishDate: postData.publishDate || formattedDate,
    readingTime: postData.readingTime || calculateReadingTime(postData.content),
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
  window.dispatchEvent(new Event(BLOGS_UPDATED_EVENT));
  return defaults;
}
