/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Create / Edit Blog Post Modal
 * Description : Full-featured modal form to create, edit, draft, and publish blog articles
 *               with rich Markdown editor, slug auto-generation, and cover image picker.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-08-04
 * -----------------------------------------
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Save, 
  Eye, 
  Edit3, 
  Image as ImageIcon, 
  Tag as TagIcon, 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  Check, 
  AlertCircle,
  Heading,
  Bold,
  Italic,
  List,
  Code,
  Quote,
  Table,
  Link as LinkIcon,
  HelpCircle,
  Folder,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { BlogPost, BLOG_CATEGORIES } from '../data/blogs';
import { upsertBlogPost, generateSlug, calculateReadingTime } from '../utils/blogStore';
import { isAdminAuthenticated } from '../utils/adminAuth';
import ReactMarkdown from 'react-markdown';

interface CreateBlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  postToEdit?: BlogPost | null;
  onSaved?: (post: BlogPost) => void;
}

// Preset cover images for quick selection
const PRESET_COVER_IMAGES = [
  { label: 'Automation & Playwright', url: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200' },
  { label: 'Finance & ERPNext', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1200' },
  { label: 'AI & Machine Learning', url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&q=80&w=1200' },
  { label: 'QA Career & Team', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200' },
  { label: 'Software Testing & Code', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1200' },
  { label: 'API Testing & Tech', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1200' },
];

export default function CreateBlogModal({ isOpen, onClose, postToEdit, onSaved }: CreateBlogModalProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [category, setCategory] = useState<BlogPost['category']>('Software Testing');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState(PRESET_COVER_IMAGES[0].url);
  const [status, setStatus] = useState<'Published' | 'Draft'>('Published');
  const [featured, setFeatured] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [readingTime, setReadingTime] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Author details
  const [authorName, setAuthorName] = useState('Sabbir Ahamed');
  const [authorRole, setAuthorRole] = useState('Software Quality Assurance Engineer');
  const [authorAvatar, setAuthorAvatar] = useState('/sabbir_avatar.jpeg');
  const [authorBio, setAuthorBio] = useState('SQA Engineer specializing in Manual & Automated Testing, API Validation, ERPNext QA, and CI/CD Quality Gates.');

  // UI state
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form fields when opening or changing postToEdit
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setActiveTab('write');

      if (postToEdit) {
        setTitle(postToEdit.title);
        setSlug(postToEdit.slug);
        setIsSlugManuallyEdited(true);
        setCategory(postToEdit.category);
        setDescription(postToEdit.description);
        setContent(postToEdit.content);
        setCoverImage(postToEdit.coverImage);
        setStatus(postToEdit.status || 'Published');
        setFeatured(postToEdit.featured || false);
        setPublishDate(postToEdit.publishDate);
        setReadingTime(postToEdit.readingTime);
        setTagsInput(postToEdit.tags ? postToEdit.tags.join(', ') : '');
        setAuthorName(postToEdit.author?.name || 'Sabbir Ahamed');
        setAuthorRole(postToEdit.author?.role || 'Software Quality Assurance Engineer');
        setAuthorAvatar(postToEdit.author?.avatar || '/sabbir_avatar.jpeg');
        setAuthorBio(postToEdit.author?.bio || 'SQA Engineer specializing in Manual & Automated Testing.');
      } else {
        // Defaults for new blog
        const todayFormatted = new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        setTitle('');
        setSlug('');
        setIsSlugManuallyEdited(false);
        setCategory('Software Testing');
        setDescription('');
        setContent('');
        setCoverImage(PRESET_COVER_IMAGES[0].url);
        setStatus('Published');
        setFeatured(false);
        setPublishDate(todayFormatted);
        setReadingTime('');
        setTagsInput('Software Testing, SQA, Automation');
        setAuthorName('Sabbir Ahamed');
        setAuthorRole('Software Quality Assurance Engineer');
        setAuthorAvatar('/sabbir_avatar.jpeg');
        setAuthorBio('SQA Engineer specializing in Manual & Automated Testing, API Validation, ERPNext QA, and CI/CD Quality Gates.');
      }
    }
  }, [isOpen, postToEdit]);

  // Handle title change and auto-slug generation
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isSlugManuallyEdited) {
      setSlug(generateSlug(val));
    }
  };

  // Auto calculate reading time when content changes
  useEffect(() => {
    if (content) {
      setReadingTime(calculateReadingTime(content));
    }
  }, [content]);

  // Formatting helper insertions into markdown content
  const insertFormatting = (prefix: string, suffix: string = '') => {
    setContent((prev) => prev + `\n${prefix} ${suffix}\n`);
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isAdminAuthenticated()) {
      setErrorMsg('Access Denied: Only authenticated Admin (Sabbir Ahamed) can create or update blog posts.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please enter a Blog Title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a Short Description.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Please enter the Full Article Content in Markdown.');
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const saved = upsertBlogPost({
        id: postToEdit ? postToEdit.id : undefined,
        title: title.trim(),
        slug: slug.trim() ? generateSlug(slug) : generateSlug(title),
        category,
        description: description.trim(),
        content: content.trim(),
        coverImage,
        status,
        featured,
        publishDate: publishDate.trim() || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        readingTime: readingTime || calculateReadingTime(content),
        tags: parsedTags.length > 0 ? parsedTags : ['SQA'],
        author: {
          name: authorName.trim() || 'Sabbir Ahamed',
          role: authorRole.trim() || 'SQA Engineer',
          avatar: authorAvatar.trim() || '/sabbir_avatar.jpeg',
          bio: authorBio.trim() || 'SQA Engineer.',
        },
      });

      setSuccessMsg(`Blog "${saved.title}" saved successfully!`);
      setIsSubmitting(false);

      if (onSaved) {
        onSaved(saved);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred while saving the blog post.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (!isAdminAuthenticated()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
        <div className="relative w-full max-w-md bg-[#12151C] border border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6 text-center">
          <div className="inline-flex p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display font-extrabold text-xl text-white">
              Admin Authentication Required
            </h3>
            <p className="text-xs font-mono text-[#9CA3AF] leading-relaxed">
              Only the portfolio administrator (Sabbir Ahamed) has permission to create, edit, or publish articles.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const validCategories = BLOG_CATEGORIES.filter((c) => c !== 'All') as BlogPost['category'][];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#12151C] border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#181C26] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35]">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                {postToEdit ? 'Edit Blog Post' : 'Create New Blog Post'}
              </h2>
              <p className="text-xs font-mono text-[#9CA3AF]">
                {postToEdit ? `Updating ID: ${postToEdit.id}` : 'Draft, format, and publish your SQA technical article'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Row 1: Title & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#FF6B35]" />
                Blog Title <span className="text-[#FF6B35]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Master Playwright API Automation & JWT Authentication"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm text-white placeholder:text-white/30 focus:border-[#FF6B35] focus:outline-none transition-colors"
              />
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#FF6B35]" />
                URL Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setIsSlugManuallyEdited(true);
                }}
                placeholder="master-playwright-api-automation"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-amber-300 placeholder:text-white/30 focus:border-[#FF6B35] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Category, Status, Featured, Publish Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/10">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#FF6B35]" />
                Category <span className="text-[#FF6B35]">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BlogPost['category'])}
                className="w-full px-3 py-2 rounded-xl bg-[#181C26] border border-white/15 text-xs text-white focus:border-[#FF6B35] focus:outline-none"
              >
                {validCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF6B35]" />
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Published' | 'Draft')}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none ${
                  status === 'Published'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                }`}
              >
                <option value="Published" className="bg-[#181C26] text-emerald-400">Published (Public)</option>
                <option value="Draft" className="bg-[#181C26] text-amber-400">Draft (Private)</option>
              </select>
            </div>

            {/* Publish Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#FF6B35]" />
                Publish Date
              </label>
              <input
                type="text"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                placeholder="August 4, 2026"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white placeholder:text-white/30 focus:border-[#FF6B35] focus:outline-none"
              />
            </div>

            {/* Featured Checkbox */}
            <div className="space-y-1.5 flex flex-col justify-center">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5 mb-1">
                Featured Article
              </label>
              <label className="inline-flex items-center space-x-2 cursor-pointer text-xs font-mono text-[#D1D5DB]">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#FF6B35] cursor-pointer"
                />
                <span>Show in Hero Banner</span>
              </label>
            </div>
          </div>

          {/* Row 3: Short Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FF6B35]" />
              Short Description / Summary <span className="text-[#FF6B35]">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief summary of the article for blog grid cards and search preview..."
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white placeholder:text-white/30 focus:border-[#FF6B35] focus:outline-none transition-colors"
            />
          </div>

          {/* Row 4: Cover Image Selection */}
          <div className="space-y-2 bg-white/[0.02] p-4 rounded-2xl border border-white/10">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#FF6B35]" />
              Featured Cover Image URL
            </label>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-1 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white placeholder:text-white/30 focus:border-[#FF6B35] focus:outline-none"
              />
              {coverImage && (
                <div className="w-20 h-10 rounded-xl overflow-hidden border border-white/20 shrink-0 bg-black">
                  <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Quick Pick Presets */}
            <div className="pt-2">
              <p className="text-[11px] font-mono text-[#9CA3AF] mb-1.5">Or choose a preset image:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COVER_IMAGES.map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => setCoverImage(preset.url)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer border ${
                      coverImage === preset.url
                        ? 'bg-[#FF6B35] text-white border-[#FF6B35] font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-[#D1D5DB] border-white/10'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 5: Tags Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-[#FF6B35]" />
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Playwright, API Testing, TypeScript, SQA, Automation"
              className="w-full px-4 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white placeholder:text-white/30 focus:border-[#FF6B35] focus:outline-none"
            />
          </div>

          {/* Row 6: Markdown Content Editor & Live Preview */}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#FF6B35]" />
                Article Content (Markdown Supported) <span className="text-[#FF6B35]">*</span>
              </label>

              {/* Editor View Toggle Tabs */}
              <div className="flex items-center space-x-1 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`px-3 py-1 rounded-lg flex items-center space-x-1 transition-colors cursor-pointer ${
                    activeTab === 'write' ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-lg flex items-center space-x-1 transition-colors cursor-pointer ${
                    activeTab === 'preview' ? 'bg-[#FF6B35] text-white font-bold' : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Preview</span>
                </button>
              </div>
            </div>

            {/* Formatting Toolbar */}
            {activeTab === 'write' && (
              <div className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-[#181C26] border border-white/10 text-xs text-[#D1D5DB]">
                <button
                  type="button"
                  onClick={() => insertFormatting('## ', 'Section Heading')}
                  className="p-1.5 rounded hover:bg-white/10 hover:text-white"
                  title="Heading 2"
                >
                  <Heading className="w-3.5 h-3.5 text-[#FF6B35]" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('**', 'Bold Text**')}
                  className="p-1.5 rounded hover:bg-white/10 hover:text-white font-bold"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', 'Italic Text*')}
                  className="p-1.5 rounded hover:bg-white/10 hover:text-white italic"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('- ', 'List item')}
                  className="p-1.5 rounded hover:bg-white/10 hover:text-white"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('```typescript\n// Code snippet here\n```')}
                  className="p-1.5 rounded hover:bg-white/10 hover:text-white"
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('> ', 'Quote message')}
                  className="p-1.5 rounded hover:bg-white/10 hover:text-white"
                  title="Blockquote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |')}
                  className="p-1.5 rounded hover:bg-white/10 hover:text-white"
                  title="Insert Table"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
                <span className="ml-auto text-[10px] font-mono text-[#9CA3AF]">
                  Auto-calculated reading time: <strong className="text-[#FF6B35]">{readingTime || '1 min read'}</strong>
                </span>
              </div>
            )}

            {/* Editor Area */}
            {activeTab === 'write' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                placeholder="# Article Title&#10;&#10;Write your technical blog post here in Markdown format..."
                required
                className="w-full p-4 rounded-xl bg-black/40 border border-white/15 text-xs sm:text-sm font-mono text-[#E5E7EB] placeholder:text-white/20 focus:border-[#FF6B35] focus:outline-none leading-relaxed"
              />
            ) : (
              /* Live Preview Area */
              <div className="p-6 rounded-xl bg-[#090A0E] border border-white/15 min-h-[300px] max-h-[500px] overflow-y-auto space-y-4">
                <div className="border-b border-white/10 pb-3 mb-4">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FF6B35]/20 text-[#FF6B35] font-bold uppercase">
                    Preview Mode
                  </span>
                  <h2 className="font-display font-extrabold text-xl text-white mt-2">{title || 'Untitled Article'}</h2>
                </div>
                <div className="prose prose-invert max-w-none text-xs sm:text-sm text-[#D1D5DB] leading-relaxed">
                  <ReactMarkdown>{content || '*No content written yet...*'}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Row 7: Author Profile Customization (Collapsible / Compact) */}
          <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/10">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FF6B35]" />
              Author Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author Name"
                className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white placeholder:text-white/30 focus:border-[#FF6B35] focus:outline-none"
              />
              <input
                type="text"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="Author Role"
                className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white placeholder:text-white/30 focus:border-[#FF6B35] focus:outline-none"
              />
            </div>
          </div>

        </form>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-[#181C26] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-[#D1D5DB] font-mono text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={(e) => {
                setStatus('Draft');
                handleSubmit(e as any);
              }}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="shimmer inline-flex items-center space-x-2 bg-[#FF6B35] hover:bg-[#FF814F] text-white font-mono text-xs font-bold px-6 py-2.5 rounded-full shadow-lg shadow-[#FF6B35]/25 transition-all hover:scale-105 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : postToEdit ? 'Update Post' : 'Publish Blog'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
