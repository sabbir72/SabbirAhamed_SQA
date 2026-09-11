/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Blog List Main Page & Management Console
 * Description : Renders the main Blog Index view with Hero header, category filters,
 *               status filters (Published / Draft), instant search, sorting,
 *               Create/Edit/Delete CRUD actions, and responsive post cards grid.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-08-04
 * -----------------------------------------
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Clock, 
  Calendar, 
  ArrowRight, 
  Tag, 
  BookOpen, 
  X,
  Filter,
  CheckCircle2,
  PlusCircle,
  Edit2,
  Trash2,
  Eye,
  SlidersHorizontal,
  FileText,
  AlertTriangle,
  RefreshCw,
  Check,
  Lock,
  Unlock
} from 'lucide-react';
import { BlogPost, BLOG_CATEGORIES } from '../data/blogs';
import { 
  getStoredBlogPosts, 
  deleteBlogPost, 
  BLOGS_UPDATED_EVENT, 
  resetStoredBlogPosts 
} from '../utils/blogStore';
import { isAdminAuthenticated, logoutAdmin } from '../utils/adminAuth';
import CreateBlogModal from './CreateBlogModal';
import AdminPasscodeModal from './AdminPasscodeModal';

interface BlogListProps {
  onSelectPost: (slug: string) => void;
}

export default function BlogList({ onSelectPost }: BlogListProps) {
  const [posts, setPosts] = useState<BlogPost[]>(() => getStoredBlogPosts());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Published' | 'Draft'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  // Admin Auth State
  const [isAdmin, setIsAdmin] = useState(() => isAdminAuthenticated());
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<BlogPost | null>(null);

  // Delete Confirmation State
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscribe to blog store and admin auth updates
  useEffect(() => {
    const refreshPosts = () => {
      setPosts(getStoredBlogPosts());
    };
    const syncAdmin = () => {
      setIsAdmin(isAdminAuthenticated());
    };

    window.addEventListener(BLOGS_UPDATED_EVENT, refreshPosts);
    window.addEventListener('admin_auth_changed', syncAdmin);
    return () => {
      window.removeEventListener(BLOGS_UPDATED_EVENT, refreshPosts);
      window.removeEventListener('admin_auth_changed', syncAdmin);
    };
  }, []);

  // Helper to ensure admin authentication before proceeding with management action
  const requireAdmin = (action: () => void) => {
    if (isAdminAuthenticated()) {
      action();
    } else {
      setPendingAction(() => action);
      setIsPasscodeModalOpen(true);
    }
  };

  // Set page document title
  useEffect(() => {
    document.title = 'Blog & SQA Insights | Sabbir Ahamed - SQA Engineer';
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  // Show temporary feedback toast
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter & Sort blog posts dynamically
  const filteredPosts = useMemo(() => {
    let list = posts.filter((post) => {
      // Category Filter
      const matchesCategory =
        selectedCategory === 'All' || post.category === selectedCategory;

      // Status Filter
      const postStatus = post.status || 'Published';
      const matchesStatus =
        selectedStatus === 'All' || postStatus === selectedStatus;

      // Search Filter
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        post.title.toLowerCase().includes(query) ||
        post.description.toLowerCase().includes(query) ||
        post.category.toLowerCase().includes(query) ||
        (post.tags && post.tags.some((tag) => tag.toLowerCase().includes(query))) ||
        (post.author && post.author.name.toLowerCase().includes(query));

      return matchesCategory && matchesStatus && matchesSearch;
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
  }, [posts, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Featured article banner (find published featured post or fallback)
  const featuredArticle = useMemo(() => {
    return posts.find((p) => p.featured && (p.status || 'Published') === 'Published') || posts[0];
  }, [posts]);

  // Display grid posts
  const displayGridPosts = useMemo(() => {
    if (selectedCategory === 'All' && selectedStatus === 'All' && !searchQuery && featuredArticle) {
      return filteredPosts.filter((p) => p.id !== featuredArticle.id);
    }
    return filteredPosts;
  }, [filteredPosts, selectedCategory, selectedStatus, searchQuery, featuredArticle]);

  // Count metrics
  const totalPosts = posts.length;
  const publishedCount = posts.filter((p) => (p.status || 'Published') === 'Published').length;
  const draftCount = posts.filter((p) => p.status === 'Draft').length;

  // Handle Edit click
  const handleOpenEdit = (e: React.MouseEvent, post: BlogPost) => {
    e.stopPropagation();
    requireAdmin(() => {
      setPostToEdit(post);
      setIsCreateModalOpen(true);
    });
  };

  // Handle Delete click
  const handleDeleteClick = (e: React.MouseEvent, post: BlogPost) => {
    e.stopPropagation();
    requireAdmin(() => {
      setPostToDelete(post);
    });
  };

  // Handle Delete confirmation
  const handleConfirmDelete = () => {
    if (!postToDelete) return;
    const deleted = deleteBlogPost(postToDelete.id);
    if (deleted) {
      showNotification('success', `Deleted article "${postToDelete.title}"`);
    } else {
      showNotification('error', 'Failed to delete article.');
    }
    setPostToDelete(null);
  };

  // Handle Create New click
  const handleOpenCreateNew = () => {
    requireAdmin(() => {
      setPostToEdit(null);
      setIsCreateModalOpen(true);
    });
  };

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#0B0D12] text-[#F3F4F6] relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#FF6B35]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-96 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Feedback Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-xs font-mono flex items-center space-x-2 animate-bounce ${
          notification.type === 'success'
            ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
            : 'bg-red-950 border-red-500/50 text-red-300'
        }`}>
          {notification.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        
        {/* ==================== HERO SECTION & TOP ACTIONS ==================== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35] text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SQA Engineering Insights & Management</span>
            </div>

            <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
              My <span className="text-[#FF6B35]">Blog</span>
            </h1>

            <p className="text-[#9CA3AF] text-xs sm:text-sm font-light leading-relaxed">
              Technical articles on Software Testing, Playwright, API Automation, ERPNext, AI, and QA career insights.
            </p>
          </div>

          {/* Action Buttons: Admin Toggle, New Blog & Reset */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Admin Lock / Unlock Status Toggle */}
            <button
              onClick={() => {
                if (isAdmin) {
                  logoutAdmin();
                  showNotification('success', 'Admin session locked.');
                } else {
                  setIsPasscodeModalOpen(true);
                }
              }}
              className={`inline-flex items-center space-x-2 text-xs font-mono font-bold px-4 py-3 rounded-full border transition-all cursor-pointer ${
                isAdmin
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 shadow-lg shadow-emerald-950/50'
                  : 'bg-white/5 border-white/15 text-[#D1D5DB] hover:text-white hover:bg-white/10'
              }`}
              title={isAdmin ? 'Admin Mode Active (Click to Lock)' : 'Admin Mode Locked (Click to Enter Passcode)'}
            >
              {isAdmin ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-[#FF6B35]" />}
              <span>{isAdmin ? 'Admin Active' : 'Admin Lock'}</span>
            </button>

            {isAdmin ? (
              <>
                <button
                  onClick={handleOpenCreateNew}
                  className="shimmer inline-flex items-center space-x-2 bg-[#FF6B35] hover:bg-[#FF814F] text-white font-mono font-bold text-xs px-6 py-3.5 rounded-full shadow-xl shadow-[#FF6B35]/25 transition-all hover:scale-105 cursor-pointer"
                  title="Create new engineering blog post (Admin)"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Blog (Admin)</span>
                </button>

                <button
                  onClick={() => requireAdmin(() => resetStoredBlogPosts())}
                  title="Reset to default sample blogs (Admin Only)"
                  className="p-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsPasscodeModalOpen(true)}
                className="inline-flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white font-mono font-bold text-xs px-5 py-3 rounded-full border border-white/15 transition-all cursor-pointer shadow-sm hover:border-[#FF6B35]/40"
                title="Only verified Administrator (Sabbir Ahamed) can create or modify blog posts"
              >
                <Lock className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>Admin Login (To Create Posts)</span>
              </button>
            )}
          </div>
        </div>

        {/* ==================== SEARCH, CATEGORY & STATUS CONTROLS ==================== */}
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
                className="w-full pl-10 pr-10 py-3 rounded-full bg-white/[0.05] border border-white/15 text-xs text-white placeholder:text-white/40 focus:border-[#FF6B35] focus:bg-white/[0.08] focus:outline-none transition-all font-mono"
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

            {/* Sort & Status Quick Filter */}
            <div className="flex items-center space-x-3 w-full sm:w-auto shrink-0">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#D1D5DB]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-[#181C26] text-white">Newest First</option>
                  <option value="oldest" className="bg-[#181C26] text-white">Oldest First</option>
                  <option value="title" className="bg-[#181C26] text-white">Title (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Status Pills Filter (All / Published / Draft) */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-[#9CA3AF] uppercase mr-1">Status:</span>
              <button
                onClick={() => setSelectedStatus('All')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                  selectedStatus === 'All'
                    ? 'bg-[#FF6B35] text-white font-bold shadow-md shadow-[#FF6B35]/20'
                    : 'bg-white/5 hover:bg-white/10 text-[#D1D5DB] border border-white/10'
                }`}
              >
                All Posts ({totalPosts})
              </button>
              <button
                onClick={() => setSelectedStatus('Published')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                  selectedStatus === 'Published'
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                    : 'bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/10'
                }`}
              >
                Published ({publishedCount})
              </button>
              <button
                onClick={() => setSelectedStatus('Draft')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                  selectedStatus === 'Draft'
                    ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/20'
                    : 'bg-white/5 hover:bg-white/10 text-amber-400 border border-white/10'
                }`}
              >
                Drafts ({draftCount})
              </button>
            </div>
          </div>

          {/* Row 3: Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <span className="text-xs font-mono text-[#9CA3AF] uppercase mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#FF6B35]" /> Category:
            </span>
            {BLOG_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all duration-200 cursor-pointer flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/25 font-bold scale-105'
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
        {selectedCategory === 'All' && selectedStatus === 'All' && !searchQuery && featuredArticle && (
          <div className="group relative bg-[#12151C] border border-white/15 rounded-3xl overflow-hidden shadow-2xl hover:border-[#FF6B35]/50 transition-all duration-300">
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
                  <span className="px-3 py-1 rounded-full bg-[#FF6B35] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Featured Article</span>
                  </span>
                  {featuredArticle.status === 'Draft' && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500 text-black font-mono text-[10px] font-bold uppercase">
                      Draft
                    </span>
                  )}
                </div>
              </div>

              {/* Featured Content Body */}
              <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#9CA3AF]">
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#FF6B35] font-bold">
                      {featuredArticle.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#FF6B35]" />
                      {featuredArticle.publishDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#FF6B35]" />
                      {featuredArticle.readingTime}
                    </span>
                  </div>

                  <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white group-hover:text-[#FF6B35] transition-colors leading-snug">
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
                      src={featuredArticle.author.avatar}
                      alt={featuredArticle.author.name}
                      className="w-8 h-8 rounded-full border border-[#FF6B35] object-cover"
                    />
                    <span className="text-xs font-mono text-white font-medium">{featuredArticle.author.name}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {isAdmin && (
                      <button
                        onClick={(e) => handleOpenEdit(e, featuredArticle)}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/20 text-[#D1D5DB] border border-white/10 transition-colors cursor-pointer"
                        title="Edit Article (Admin Only)"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => onSelectPost(featuredArticle.slug)}
                      className="inline-flex items-center space-x-2 shimmer bg-[#FF6B35] hover:bg-[#FF814F] text-white font-mono font-bold text-xs px-5 py-2.5 rounded-full shadow-lg shadow-[#FF6B35]/20 transition-all hover:scale-105 cursor-pointer"
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

        {/* ==================== BLOG POSTS GRID ==================== */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-display font-extrabold text-xl text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-[#FF6B35]" />
              <span>
                {selectedCategory === 'All' ? 'Articles Catalog' : `${selectedCategory} Articles`}
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-[#FF6B35] font-bold ml-2">
                {displayGridPosts.length}
              </span>
            </h3>

            {(searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedStatus('All');
                }}
                className="text-xs font-mono text-[#FF6B35] hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {displayGridPosts.length === 0 ? (
            <div className="text-center py-16 bg-[#12151C] rounded-3xl border border-white/10 p-8 space-y-4">
              <BookOpen className="w-12 h-12 text-[#9CA3AF] mx-auto stroke-1" />
              <h4 className="font-display font-bold text-lg text-white">No articles found</h4>
              <p className="text-xs font-mono text-[#9CA3AF] max-w-md mx-auto">
                No articles matched your criteria (Category: "{selectedCategory}", Status: "{selectedStatus}", Query: "{searchQuery}").
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleOpenCreateNew}
                  className="px-5 py-2.5 rounded-full bg-[#FF6B35] text-white font-mono text-xs font-bold hover:bg-[#FF814F] transition-colors cursor-pointer"
                >
                  + Create New Blog
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSelectedStatus('All');
                  }}
                  className="px-5 py-2.5 rounded-full bg-white/10 text-white font-mono text-xs hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {displayGridPosts.map((post) => {
                const isDraft = post.status === 'Draft';
                return (
                  <article
                    key={post.id}
                    className="group bg-[#12151C] border border-white/10 hover:border-[#FF6B35]/50 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#FF6B35]/10 cursor-pointer relative"
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
                        <span className="px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[#FF6B35] font-mono text-[10px] font-bold uppercase tracking-wider">
                          {post.category}
                        </span>
                        {isDraft && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-mono text-[10px] font-extrabold uppercase">
                            Draft
                          </span>
                        )}
                      </div>

                      {/* Card Edit & Delete Floating Quick Controls (Admin Only) */}
                      {isAdmin && (
                        <div className="absolute top-3 right-3 flex items-center space-x-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(e, post)}
                            className="p-2 rounded-full bg-black/80 hover:bg-[#FF6B35] text-white border border-white/20 backdrop-blur-md transition-colors cursor-pointer shadow-lg"
                            title="Edit Post"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, post)}
                            className="p-2 rounded-full bg-black/80 hover:bg-red-600 text-white border border-white/20 backdrop-blur-md transition-colors cursor-pointer shadow-lg"
                            title="Delete Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Card Content Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center space-x-3 text-[11px] font-mono text-[#9CA3AF]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#FF6B35]" />
                            {post.publishDate}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#FF6B35]" />
                            {post.readingTime}
                          </span>
                        </div>

                        <h4 className="font-display font-bold text-lg text-white group-hover:text-[#FF6B35] transition-colors leading-snug line-clamp-2">
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
                        <div className="flex items-center justify-between text-xs font-mono font-bold text-[#FF6B35]">
                          <span className="group-hover:underline flex items-center gap-1">
                            Read Article
                          </span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ==================== CREATE / EDIT BLOG MODAL ==================== */}
      <CreateBlogModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPostToEdit(null);
        }}
        postToEdit={postToEdit}
        onSaved={(savedPost) => {
          showNotification('success', `Blog "${savedPost.title}" saved successfully!`);
        }}
      />

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#12151C] border border-red-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-white">Delete Blog Post?</h3>
            </div>

            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{postToDelete.title}"</strong>? This action will permanently remove it from LocalStorage.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[#D1D5DB] text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADMIN PASSCODE MODAL ==================== */}
      <AdminPasscodeModal
        isOpen={isPasscodeModalOpen}
        onClose={() => {
          setIsPasscodeModalOpen(false);
          setPendingAction(null);
        }}
        onSuccess={() => {
          showNotification('success', 'Admin access unlocked!');
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />

    </div>
  );
}
