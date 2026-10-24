/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Single Blog Post View
 * Description : Clean, distraction-free reader view for published technical articles.
 *               Separates public reading from CMS administration:
 *               - No standalone passcode modals or lock prompts inside articles.
 *               - Draft articles remain strictly hidden from public visitors and
 *                 public prev/next navigation, while authenticated CMS admins can
 *                 preview, edit, or publish drafts seamlessly under the unified
 *                 CMS Admin Panel session.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-24
 * -----------------------------------------
 */

import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  Linkedin,
  Twitter,
  Copy,
  Check,
  List,
  ArrowRight,
  Code,
  Edit2,
  EyeOff,
  Globe,
  LayoutGrid,
} from 'lucide-react';
import { BlogPost as BlogPostType } from '../data/blogs';
import { getStoredBlogPosts, upsertBlogPost, BLOGS_UPDATED_EVENT } from '../utils/blogStore';
import { isAdminAuthenticated } from '../utils/adminAuth';
import { navigateTo } from '../utils/router';
import { getStoredProfile } from '../utils/portfolioStore';
import { PERSONAL_INFO } from '../data';
import CreateBlogModal from './CreateBlogModal';

const getAuthorAvatar = (author?: { name?: string; avatar?: string }) => {
  const liveAvatar = getStoredProfile().avatar || PERSONAL_INFO.avatar || '/sabbir_avatar.jpeg';
  if (!author || !author.avatar || author.avatar.includes('sabbir_avatar') || author.name === PERSONAL_INFO.name) {
    return liveAvatar;
  }
  return author.avatar;
};

interface BlogPostProps {
  slug: string;
  onBackToBlog: () => void;
  onSelectPost: (slug: string) => void;
  onOpenContact?: () => void;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function BlogPost({ slug, onBackToBlog, onSelectPost }: BlogPostProps) {
  const [posts, setPosts] = useState<BlogPostType[]>(() => getStoredBlogPosts());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());

  // Subscribe to storage updates & unified CMS admin session
  useEffect(() => {
    const refreshPosts = () => {
      setPosts(getStoredBlogPosts());
    };
    const syncAdmin = () => {
      const authenticated = isAdminAuthenticated();
      setIsAdmin(authenticated);
      if (!authenticated) {
        setIsEditModalOpen(false);
      }
    };
    window.addEventListener(BLOGS_UPDATED_EVENT, refreshPosts);
    window.addEventListener('admin_auth_changed', syncAdmin);
    return () => {
      window.removeEventListener(BLOGS_UPDATED_EVENT, refreshPosts);
      window.removeEventListener('admin_auth_changed', syncAdmin);
    };
  }, []);

  // Public visitors strictly see Published articles; CMS Admin can preview Drafts as well
  const accessiblePosts = useMemo(() => {
    return isAdmin ? posts : posts.filter((p) => p.status !== 'Draft');
  }, [posts, isAdmin]);

  // Match requested article slug within accessible posts
  const post = useMemo(() => {
    return accessiblePosts.find((p) => p.slug === slug) || null;
  }, [accessiblePosts, slug]);

  // Previous / Next navigation across accessible articles
  const { prevPost, nextPost } = useMemo(() => {
    if (!post) return { prevPost: null, nextPost: null };
    const currentIndex = accessiblePosts.findIndex((p) => p.slug === post.slug);
    const prev = currentIndex > 0 ? accessiblePosts[currentIndex - 1] : null;
    const next = currentIndex >= 0 && currentIndex < accessiblePosts.length - 1 ? accessiblePosts[currentIndex + 1] : null;
    return { prevPost: prev, nextPost: next };
  }, [accessiblePosts, post]);

  // Extract Table of Contents from markdown headings
  const toc: TocItem[] = useMemo(() => {
    if (!post?.content) return [];
    const lines = post.content.split('\n');
    const items: TocItem[] = [];

    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim().replace(/\*/g, '');
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        items.push({ id, text, level });
      }
    });

    return items;
  }, [post?.content]);

  // Set document title & reset scroll position
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Sabbir Ahamed Blog`;
    } else {
      document.title = 'Article Not Found | Sabbir Ahamed Blog';
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [post]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = (codeText: string, codeId: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(codeId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handlePublishDraftDirectly = () => {
    if (!post || !isAdminAuthenticated()) return;
    upsertBlogPost({
      ...post,
      status: 'Published',
    });
    setPosts(getStoredBlogPosts());
  };

  if (!post) {
    return (
      <div className="pt-28 pb-20 min-h-screen bg-[#0B0D12] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#12151C] border border-white/10 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <h2 className="font-display text-2xl font-bold text-white">Article Not Available</h2>
          <p className="text-xs font-mono text-[#9CA3AF] leading-relaxed">
            This article may have been moved, unpublished as a private draft, or the URL slug has changed.
          </p>
          <button
            onClick={onBackToBlog}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--color-accent)] text-black font-mono text-xs font-bold cursor-pointer transition-transform hover:scale-105"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Articles</span>
          </button>
        </div>
      </div>
    );
  }

  const isDraft = post.status === 'Draft';

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#0B0D12] text-[#F3F4F6] relative">
      {/* Background Orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-[var(--color-accent)]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-96 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        
        {/* ==================== ADMIN-ONLY DRAFT PREVIEW BAR ==================== */}
        {isAdmin && isDraft && (
          <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/35 text-amber-200 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center space-x-2.5">
              <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Draft Preview:</strong> Hidden from public visitors until published from your CMS session.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePublishDraftDirectly}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Publish Live</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit Draft</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== BREADCRUMB & BACK BUTTON ==================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={onBackToBlog}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono text-[#D1D5DB] hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Back to All Articles</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/15 border border-white/15 text-xs font-mono text-white transition-all cursor-pointer"
                  title="Edit Article"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  <span>Edit Article</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('/admin?tab=blogs')}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-xs font-mono text-indigo-200 transition-all cursor-pointer"
                  title="Open Blogs & Articles in CMS Admin Portal"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
                  <span>CMS Articles</span>
                </button>
              </>
            )}

            <span className="px-3 py-1 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-xs font-mono font-bold uppercase tracking-wider">
              {post.category}
            </span>
          </div>
        </div>

        {/* ==================== ARTICLE HEADER ==================== */}
        <div className="space-y-6">
          <h1 className="font-display font-black text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight">
            {post.title}
          </h1>

          {/* Meta Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#12151C] border border-white/10 text-xs font-mono text-[#9CA3AF]">
            {/* Author */}
            <div className="flex items-center space-x-3">
              <img
                src={getAuthorAvatar(post.author)}
                alt={post.author.name}
                className="w-10 h-10 rounded-full border border-[var(--color-accent)] object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PERSONAL_INFO.avatar || '/sabbir_avatar.jpeg';
                }}
              />
              <div>
                <p className="text-white font-bold">{post.author.name}</p>
                <p className="text-[11px] text-[#9CA3AF]">{post.author.role}</p>
              </div>
            </div>

            {/* Date & Reading Time */}
            <div className="flex items-center space-x-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                {post.publishDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                {post.readingTime}
              </span>
            </div>
          </div>
        </div>

        {/* ==================== COVER IMAGE ==================== */}
        <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-black/50 max-h-[460px]">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* ==================== TABLE OF CONTENTS ==================== */}
        {toc.length > 0 && (
          <div className="p-6 rounded-2xl bg-[#12151C] border border-white/10 space-y-3">
            <div className="flex items-center space-x-2 text-white font-display font-bold text-sm">
              <List className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Table of Contents</span>
            </div>
            <ul className="space-y-1.5 text-xs font-mono text-[#9CA3AF]">
              {toc.map((item) => (
                <li
                  key={item.id}
                  className={item.level === 2 ? 'pl-3' : item.level >= 3 ? 'pl-6' : ''}
                >
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const targetEl = document.getElementById(item.id);
                      if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="hover:text-[var(--color-accent)] transition-colors inline-block py-0.5"
                  >
                    • {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ==================== MAIN RICH CONTENT ==================== */}
        <div className="prose prose-invert max-w-none space-y-6 text-[#D1D5DB] text-sm sm:text-base leading-relaxed font-light">
          <ReactMarkdown
            components={{
              h1: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                return (
                  <h2 id={id} className="font-display font-extrabold text-2xl sm:text-3xl text-white pt-6 pb-2 border-b border-white/10 text-[var(--color-accent)] flex items-center space-x-2">
                    <span>{children}</span>
                  </h2>
                );
              },
              h2: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                return (
                  <h3 id={id} className="font-display font-bold text-xl sm:text-2xl text-white pt-5 pb-1 text-amber-400">
                    {children}
                  </h3>
                );
              },
              h3: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                return (
                  <h4 id={id} className="font-display font-bold text-lg text-white pt-4 text-emerald-400">
                    {children}
                  </h4>
                );
              },
              p: ({ children }) => (
                <p className="text-[#D1D5DB] leading-relaxed my-3 font-light">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 my-4 pl-2 text-[#D1D5DB]">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-2 my-4 pl-2 text-[#D1D5DB]">{children}</ol>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-6 p-4 rounded-xl bg-white/[0.03] border-l-4 border-[var(--color-accent)] text-[#E5E7EB] italic font-serif">
                  {children}
                </blockquote>
              ),
              code: ({ className, children }) => {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                const codeId = `${match ? match[1] : 'snippet'}-${codeString.length}`;
                const isInline = !className;

                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-accent)] font-mono text-xs">
                      {children}
                    </code>
                  );
                }

                return (
                  <div className="my-6 rounded-2xl bg-[#090A0E] border border-white/15 overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#12151C] border-b border-white/10 text-xs font-mono text-[#9CA3AF]">
                      <div className="flex items-center space-x-2">
                        <Code className="w-4 h-4 text-[var(--color-accent)]" />
                        <span className="uppercase text-[var(--color-accent)] font-bold">{match ? match[1] : 'Code'}</span>
                      </div>
                      <button
                        onClick={() => handleCopyCode(codeString, codeId)}
                        className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      >
                        {copiedCodeId === codeId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-emerald-300 leading-relaxed">
                      <code>{codeString}</code>
                    </pre>
                  </div>
                );
              },
              table: ({ children }) => (
                <div className="my-6 overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left text-xs font-mono">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-[#12151C] text-[var(--color-accent)] border-b border-white/10 font-bold uppercase">{children}</thead>
              ),
              tr: ({ children }) => (
                <tr className="border-b border-white/5 hover:bg-white/[0.02]">{children}</tr>
              ),
              th: ({ children }) => <th className="p-3">{children}</th>,
              td: ({ children }) => <td className="p-3 text-[#D1D5DB]">{children}</td>,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* ==================== TAGS & SOCIAL SHARE ==================== */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {post.tags && post.tags.map((tag) => (
              <span key={tag} className="text-xs font-mono px-2.5 py-1 rounded-md bg-white/5 text-[#D1D5DB] border border-white/10">
                #{tag}
              </span>
            ))}
          </div>

          {/* Social Share */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-[#9CA3AF] mr-1 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Share:
            </span>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-[#12151C] hover:bg-[var(--color-accent)] text-white border border-white/10 transition-colors cursor-pointer"
              title="Share on LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-[#12151C] hover:bg-[var(--color-accent)] text-white border border-white/10 transition-colors cursor-pointer"
              title="Share on Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <button
              onClick={handleCopyLink}
              className="p-2.5 rounded-full bg-[#12151C] hover:bg-[var(--color-accent)] text-white border border-white/10 transition-colors cursor-pointer"
              title="Copy Article Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ==================== AUTHOR BIO CARD ==================== */}
        <div className="p-6 rounded-3xl bg-[#12151C] border border-white/10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <img
            src={getAuthorAvatar(post.author)}
            alt={post.author.name}
            className="w-20 h-20 rounded-2xl border-2 border-[var(--color-accent)] object-cover shrink-0 shadow-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PERSONAL_INFO.avatar || '/sabbir_avatar.jpeg';
            }}
          />
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <h4 className="font-display font-bold text-lg text-white">{post.author.name}</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-bold">SQA Author</span>
            </div>
            <p className="text-xs text-[#9CA3AF] leading-relaxed font-light">{post.author.bio}</p>
          </div>
        </div>

        {/* ==================== PREVIOUS / NEXT ARTICLE NAV ==================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
          {prevPost ? (
            <button
              onClick={() => onSelectPost(prevPost.slug)}
              className="group p-5 rounded-2xl bg-[#12151C] border border-white/10 hover:border-[var(--color-accent)]/50 text-left space-y-2 transition-all cursor-pointer"
            >
              <span className="text-[10px] font-mono uppercase text-[#9CA3AF] flex items-center gap-1">
                <ArrowLeft className="w-3 h-3 text-[var(--color-accent)]" /> Previous Article
              </span>
              <p className="font-display font-bold text-sm text-white group-hover:text-[var(--color-accent)] line-clamp-1">
                {prevPost.title}
              </p>
            </button>
          ) : <div />}

          {nextPost && (
            <button
              onClick={() => onSelectPost(nextPost.slug)}
              className="group p-5 rounded-2xl bg-[#12151C] border border-white/10 hover:border-[var(--color-accent)]/50 text-right space-y-2 transition-all cursor-pointer ml-auto w-full"
            >
              <span className="text-[10px] font-mono uppercase text-[#9CA3AF] flex items-center justify-end gap-1">
                Next Article <ArrowRight className="w-3 h-3 text-[var(--color-accent)]" />
              </span>
              <p className="font-display font-bold text-sm text-white group-hover:text-[var(--color-accent)] line-clamp-1">
                {nextPost.title}
              </p>
            </button>
          )}
        </div>

      </article>

      {/* Admin Article Editor Modal (active only during authenticated CMS session — no separate lock popup) */}
      {isAdmin && isEditModalOpen && (
        <CreateBlogModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          postToEdit={post}
          onSaved={(updated) => {
            if (updated.slug !== slug) {
              navigateTo(`/blog/${updated.slug}`);
            }
          }}
        />
      )}
    </div>
  );
}
