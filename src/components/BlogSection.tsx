/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Blog Section Component (Home Page)
 * Description : Showcases featured engineering blog posts on the main portfolio page.
 *               Includes article previews, tags, read times, and 1-click transition
 *               to full blog archive and management console.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-09-10
 * -----------------------------------------
 */

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  Clock, 
  Lock, 
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { BlogPost } from '../data/blogs';
import { getStoredBlogPosts, BLOGS_UPDATED_EVENT } from '../utils/blogStore';
import { isAdminAuthenticated } from '../utils/adminAuth';
import { PERSONAL_INFO } from '../data';

const getAuthorAvatar = (author?: { name?: string; avatar?: string }) => {
  if (!author || !author.avatar || author.avatar.includes('sabbir_avatar') || author.name === PERSONAL_INFO.name) {
    return PERSONAL_INFO.avatar || '/sabbir_avatar.jpeg';
  }
  return author.avatar;
};

interface BlogSectionProps {
  onSelectPost: (slug: string) => void;
  onViewAllBlog: () => void;
}

export default function BlogSection({ onSelectPost, onViewAllBlog }: BlogSectionProps) {
  const [posts, setPosts] = useState<BlogPost[]>(() => getStoredBlogPosts());
  const [isAdmin, setIsAdmin] = useState(() => isAdminAuthenticated());

  useEffect(() => {
    const handleUpdate = () => {
      setPosts(getStoredBlogPosts());
      setIsAdmin(isAdminAuthenticated());
    };
    window.addEventListener(BLOGS_UPDATED_EVENT, handleUpdate);
    window.addEventListener('admin_auth_changed', handleUpdate);
    return () => {
      window.removeEventListener(BLOGS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('admin_auth_changed', handleUpdate);
    };
  }, []);

  // Filter published posts and grab top 3-4
  const publishedPosts = posts.filter(p => p.status !== 'Draft');
  const featuredPost = publishedPosts.find(p => p.featured) || publishedPosts[0];
  const secondaryPosts = publishedPosts.filter(p => p.id !== featuredPost?.id).slice(0, 3);

  return (
    <section id="blog" className="py-20 relative bg-[#0B0D12] border-t border-white/10 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-[#FF6B35]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35] text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Technical Publications & QA Insights</span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              Featured <span className="text-[#FF6B35]">Blog & Articles</span>
            </h2>
            <p className="text-[#9CA3AF] text-sm font-light leading-relaxed">
              In-depth engineering articles on Playwright automation, API testing, ERPNext quality assurance, and CI/CD testing frameworks written by Sabbir Ahamed.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View Full Blog Action */}
            <button
              id="view-all-blogs-btn"
              onClick={onViewAllBlog}
              className="inline-flex items-center space-x-2 shimmer bg-[#FF6B35] hover:bg-[#FF814F] text-white font-mono font-bold text-xs px-6 py-3 rounded-full shadow-lg shadow-[#FF6B35]/25 transition-all hover:scale-105 cursor-pointer"
            >
              <span>Explore All Articles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Security & Author Badge */}
        <div className="p-3.5 rounded-2xl bg-[#12151C] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2 text-[#9CA3AF]">
            <Lock className="w-4 h-4 text-[#FF6B35] shrink-0" />
            <span>
              <strong className="text-white">Admin Protected:</strong> Blog creation & publishing are strictly restricted to the verified portfolio owner.
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
              isAdmin 
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border border-white/10 text-[#9CA3AF]'
            }`}>
              <ShieldCheck className={`w-3.5 h-3.5 ${isAdmin ? 'text-emerald-400' : 'text-[#FF6B35]'}`} />
              <span>{isAdmin ? 'Admin Mode Active' : 'Visitor Mode'}</span>
            </span>
            <button
              onClick={onViewAllBlog}
              className="text-[#FF6B35] hover:underline font-bold text-xs cursor-pointer flex items-center gap-1"
            >
              <span>Manage / Read</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Blog Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Featured Post */}
          {featuredPost && (
            <div 
              onClick={() => onSelectPost(featuredPost.slug)}
              className="lg:col-span-7 group cursor-pointer bg-[#12151C] border border-white/10 hover:border-[#FF6B35]/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[#FF6B35]/10 flex flex-col"
            >
              <div className="relative aspect-video overflow-hidden bg-black/40">
                <img
                  src={featuredPost.coverImage}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#FF6B35] text-white shadow-md">
                    Featured
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center space-x-3 text-xs font-mono text-white/90 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full w-fit">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#FF6B35]" />
                    {featuredPost.publishDate}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#FF6B35]" />
                    {featuredPost.readingTime}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-[#FF6B35] font-bold uppercase tracking-wider">
                    {featuredPost.category}
                  </span>
                  <h3 className="font-display font-black text-xl sm:text-2xl text-white group-hover:text-[#FF6B35] transition-colors leading-snug">
                    {featuredPost.title}
                  </h3>
                  <p className="text-[#9CA3AF] text-sm font-light leading-relaxed line-clamp-3">
                    {featuredPost.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={getAuthorAvatar(featuredPost.author)}
                      alt={featuredPost.author.name}
                      className="w-7 h-7 rounded-full border border-[#FF6B35] object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PERSONAL_INFO.avatar || '/sabbir_avatar.jpeg';
                      }}
                    />
                    <span className="text-xs font-mono text-[#D1D5DB]">{featuredPost.author.name}</span>
                  </div>
                  <div className="inline-flex items-center space-x-1 text-xs font-mono font-bold text-[#FF6B35] group-hover:translate-x-1 transition-transform">
                    <span>Read Full Article</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Secondary Posts List */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {secondaryPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => onSelectPost(post.slug)}
                className="group cursor-pointer bg-[#12151C] border border-white/10 hover:border-[#FF6B35]/40 rounded-2xl p-5 transition-all duration-200 hover:bg-[#181C26] flex items-start gap-4"
              >
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-24 h-24 rounded-xl object-cover shrink-0 border border-white/10 group-hover:border-[#FF6B35]/30 transition-colors"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-[#9CA3AF]">
                    <span className="text-[#FF6B35] font-bold">{post.category}</span>
                    <span>•</span>
                    <span>{post.readingTime}</span>
                  </div>
                  <h4 className="font-display font-bold text-sm sm:text-base text-white group-hover:text-[#FF6B35] transition-colors leading-snug line-clamp-2">
                    {post.title}
                  </h4>
                  <p className="text-[#9CA3AF] text-xs font-light line-clamp-2 leading-relaxed">
                    {post.description}
                  </p>
                </div>
              </div>
            ))}

            {/* Bottom Explore Card */}
            <div 
              onClick={onViewAllBlog}
              className="p-6 rounded-2xl bg-gradient-to-r from-[#FF6B35]/10 to-transparent border border-[#FF6B35]/20 flex items-center justify-between group cursor-pointer hover:border-[#FF6B35]/50 transition-all"
            >
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#FF6B35]" />
                  Want to explore more articles?
                </span>
                <p className="text-xs text-[#9CA3AF] font-light">
                  Browse topics across Manual Testing, Automation, CI/CD, and ERPNext QA.
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#FF6B35] text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-[#FF6B35]/20">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
