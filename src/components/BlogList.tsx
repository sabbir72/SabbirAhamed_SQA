/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Blog List Main Page (Reader Index)
 * Description : Clean, visitor-facing Blog Index view with Hero header, category filters,
 *               instant search, sorting, and responsive technical post cards.
 *               Administrative creation, editing, and locking are strictly housed
 *               inside the Portfolio Admin Management System.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-14
 * -----------------------------------------
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Clock, 
  Calendar, 
  ArrowRight, 
  BookOpen, 
  X,
  Filter,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { BlogPost, BLOG_CATEGORIES } from '../data/blogs';
import { getStoredBlogPosts, BLOGS_UPDATED_EVENT } from '../utils/blogStore';
import { PERSONAL_INFO } from '../data';

const getAuthorAvatar = (author?: { name?: string; avatar?: string }) => {
  if (!author || !author.avatar || author.avatar.includes('sabbir_avatar') || author.name === PERSONAL_INFO.name) {
    return PERSONAL_INFO.avatar || '/sabbir_avatar.jpeg';
  }
  return author.avatar;
};

interface BlogListProps {
  onSelectPost: (slug: string) => void;
}

export default function BlogList({ onSelectPost }: BlogListProps) {
  const [posts, setPosts] = useState<BlogPost[]>(() => getStoredBlogPosts());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  // Subscribe to blog store updates
  useEffect(() => {
    const refreshPosts = () => {
      setPosts(getStoredBlogPosts());
    };

    window.addEventListener(BLOGS_UPDATED_EVENT, refreshPosts);
    return () => {
      window.removeEventListener(BLOGS_UPDATED_EVENT, refreshPosts);
    };
  }, []);

  // Set page document title
  useEffect(() => {
    document.title = 'Blog & SQA Insights | Sabbir Ahamed - SQA Engineer';
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  // Public visitors only see published posts
  const publishedPosts = useMemo(() => {
    return posts.filter((p) => p.status !== 'Draft');
  }, [posts]);

  // Filter & Sort blog posts dynamically
  const filteredPosts = useMemo(() => {
    const list = publishedPosts.filter((post) => {
      // Category Filter
      const matchesCategory =
        selectedCategory === 'All' || post.category === selectedCategory;

      // Search Filter
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.description.toLowerCase().includes(query) ||
        post.category.toLowerCase().includes(query) ||
        (post.tags && post.tags.some((tag) => tag.toLowerCase().includes(query))) ||
        (post.author && post.author.name.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });

    // Sorting logic
    return list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime();
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [publishedPosts, searchQuery, selectedCategory, sortBy]);

  // Featured article banner (find published featured post or fallback)
  const featuredArticle = useMemo(() => {
    return publishedPosts.find((p) => p.featured) || publishedPosts[0];
  }, [publishedPosts]);

  // Display grid posts (excludes featured banner post if on All category with no search)
  const displayGridPosts = useMemo(() => {
    if (selectedCategory === 'All' && !searchQuery && featuredArticle) {
      return filteredPosts.filter((p) => p.id !== featuredArticle.id);
    }
    return filteredPosts;
  }, [filteredPosts, selectedCategory, searchQuery, featuredArticle]);

  const totalPublishedCount = publishedPosts.length;

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#0B0D12] text-[#F3F4F6] relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-[var(--color-accent)]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-96 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        
        {/* ==================== HERO SECTION & TOP SUMMARY ==================== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SQA Engineering Insights & Knowledge Base</span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
              My <span className="text-[var(--color-accent)]">Blog</span>
            </h1>

            <p className="text-[#9CA3AF] text-xs sm:text-sm font-light leading-relaxed">
              Technical articles on Software Testing, Playwright automation, API validation, ERPNext quality assurance, AI testing, and QA engineering best practices.
            </p>
          </div>

          {/* Published Articles Metric Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#D1D5DB] shadow-sm">
              <BookOpen className="w-4 h-4 text-[var(--color-accent)]" />
              <span><strong>{totalPublishedCount}</strong> Technical Articles</span>
            </div>
          </div>
        </div>

        {/* ==================== SEARCH & CATEGORY CONTROLS ==================== */}
        <div className="space-y-6 bg-[#12151C]/90 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl">
          
          {/* Row 1: Instant Search & Sort Options */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9CA3AF]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles by title, topic, Playwright, ERPNext, API, or tags..."
                className="w-full pl-10 pr-10 py-3 rounded-full bg-white/[0.05] border border-white/15 text-xs text-white placeholder:text-white/40 focus:border-[var(--color-accent)] focus:bg-white/[0.08] focus:outline-none transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
                  title="Clear Search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-3 w-full sm:w-auto shrink-0">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#D1D5DB]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-[#181C26] text-white">Newest First</option>
                  <option value="oldest" className="bg-[#181C26] text-white">Oldest First</option>
                  <option value="title" className="bg-[#181C26] text-white">Title (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <span className="text-xs font-mono text-[#9CA3AF] uppercase mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Category:
            </span>
            {BLOG_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 cursor-pointer flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/25 font-bold scale-105'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-[#D1D5DB] border border-white/10 hover:border-white/25'
                  }`}
                >
                  {isActive && <CheckCircle2 className="w-3 h-3" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* ==================== FEATURED ARTICLE BANNER ==================== */}
        {selectedCategory === 'All' && !searchQuery && featuredArticle && (
          <div className="group relative bg-[#12151C] border border-white/15 rounded-3xl overflow-hidden shadow-2xl hover:border-[var(--color-accent)]/50 transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Featured Cover Image */}
              <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-full min-h-[280px] overflow-hidden bg-black/40">
                <img
                  src={featuredArticle.coverImage}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12151C] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#12151C]" />
                
                <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full bg-[var(--color-accent)] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Featured Article</span>
                  </span>
                </div>
              </div>

              {/* Featured Content Body */}
              <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#9CA3AF]">
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[var(--color-accent)] font-bold">
                      {featuredArticle.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      {featuredArticle.publishDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      {featuredArticle.readingTime}
                    </span>
                  </div>

                  <h2 
                    onClick={() => onSelectPost(featuredArticle.slug)}
                    className="font-display font-extrabold text-xl sm:text-2xl text-white group-hover:text-[var(--color-accent)] transition-colors leading-snug cursor-pointer"
                  >
                    {featuredArticle.title}
                  </h2>

                  <p className="text-[#9CA3AF] text-xs sm:text-sm leading-relaxed font-light line-clamp-3">
                    {featuredArticle.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {featuredArticle.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-white/5 text-[#D1D5DB] border border-white/10">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  {/* Author Profile */}
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={getAuthorAvatar(featuredArticle.author)}
                      alt={featuredArticle.author.name}
                      className="w-8 h-8 rounded-full border border-[var(--color-accent)] object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PERSONAL_INFO.avatar || '/sabbir_avatar.jpeg';
                      }}
                    />
                    <span className="text-xs font-mono text-white font-medium">{featuredArticle.author.name}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelectPost(featuredArticle.slug)}
                      className="inline-flex items-center space-x-2 shimmer bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono font-bold text-xs px-5 py-2.5 rounded-full shadow-lg shadow-[var(--color-accent)]/20 transition-all hover:scale-105 cursor-pointer"
                    >
                      <span>Read Article</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== BLOG POSTS CATALOG ==================== */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-display font-extrabold text-xl text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-[var(--color-accent)]" />
              <span>
                {selectedCategory === 'All' ? 'Articles Catalog' : `${selectedCategory} Articles`}
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-[var(--color-accent)] font-bold ml-2">
                {displayGridPosts.length}
              </span>
            </h3>

            {(searchQuery || selectedCategory !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="text-xs font-mono text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          {displayGridPosts.length === 0 ? (
            <div className="text-center py-16 bg-[#12151C] rounded-3xl border border-white/10 p-8 space-y-4">
              <BookOpen className="w-12 h-12 text-[#9CA3AF] mx-auto stroke-1" />
              <h4 className="font-display font-bold text-lg text-white">No articles found</h4>
              <p className="text-xs font-mono text-[#9CA3AF] max-w-md mx-auto">
                No published articles matched your search (Category: "{selectedCategory}", Query: "{searchQuery}").
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-5 py-2.5 rounded-full bg-white/10 text-white font-mono text-xs hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {displayGridPosts.map((post) => (
                <article
                  key={post.id}
                  className="group bg-[#12151C] border border-white/10 hover:border-[var(--color-accent)]/50 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[var(--color-accent)]/10 cursor-pointer relative"
                  onClick={() => onSelectPost(post.slug)}
                >
                  {/* Card Image */}
                  <div className="relative h-48 overflow-hidden bg-black/40">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[var(--color-accent)] font-mono text-[10px] font-bold uppercase tracking-wider">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center space-x-3 text-[11px] font-mono text-[#9CA3AF]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[var(--color-accent)]" />
                          {post.publishDate}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[var(--color-accent)]" />
                          {post.readingTime}
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-lg text-white group-hover:text-[var(--color-accent)] transition-colors leading-snug line-clamp-2">
                        {post.title}
                      </h4>

                      <p className="text-[#9CA3AF] text-xs font-light leading-relaxed line-clamp-3">
                        {post.description}
                      </p>
                    </div>

                    <div className="space-y-4 pt-3 border-t border-white/10">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {post.tags && post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#D1D5DB] border border-white/5">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Read More Footer */}
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-[var(--color-accent)]">
                        <span className="group-hover:underline flex items-center gap-1">
                          Read Article
                        </span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
