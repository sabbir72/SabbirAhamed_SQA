/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Unified Admin Management System (CMS)
 * Description : Centralized, complete CRUD administration panel for the entire website:
 *               Projects, Work Experience, Technical Skills, Blog Posts & Articles,
 *               Personal Profile & Headline Metrics, and System Security.
 *               Protected by the Common Portfolio Passcode.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-07
 * -----------------------------------------
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, Lock, ArrowLeft, Plus, Edit2, Trash2, Copy, 
  ArrowUp, ArrowDown, ExternalLink, Check, X, RefreshCw, 
  Download, Upload, Search, Layers, Briefcase, Zap, 
  CheckCircle2, ChevronRight, Eye, FileText, Sparkles,
  BookOpen, User,
  Globe, Mail, Phone, MapPin, Linkedin, Github, Sliders,
  CheckSquare, Building2, Send, Award, Target, EyeOff, Palette, Nfc,
  LayoutGrid, Menu, TrendingUp, Settings, Save, Cloud
} from 'lucide-react';
import ThemeSelectorModal from './ThemeSelectorModal';
import { VisitingCardModal } from './VisitingCardModal';
import ImageUploadField from './ImageUploadField';
import { SecurityModalMode } from './AdminPasscodeModal';
import { COLOR_THEMES, getSavedThemeId, setAndApplyTheme } from '../utils/themeStore';
import { getCurrentVisitorMetrics, subscribeVisitorStats, VisitorMetrics } from '../utils/visitorTracker';
import { Project, Experience, Skill, TestLog, Reference, CareerRoadmapItem } from '../types';
import { 
  getStoredProjects, addStoredProject, updateStoredProject, deleteStoredProject, reorderStoredProjects,
  getStoredExperiences, addStoredExperience, updateStoredExperience, deleteStoredExperience, reorderStoredExperiences,
  getStoredSkills, addStoredSkillCategory, updateStoredSkillCategory, deleteStoredSkillCategory,
  addSkillItemToCategory, removeSkillItemFromCategory,
  getStoredProfile, updateStoredProfile, ProfileData,
  getStoredReferences, addStoredReference, updateStoredReference, deleteStoredReference,
  getStoredCareerRoadmap, addStoredCareerRoadmapItem, updateStoredCareerRoadmapItem, deleteStoredCareerRoadmapItem,
  resetPortfolioToDefault, exportPortfolioDataJson, importPortfolioDataJson,
  PORTFOLIO_UPDATED_EVENT
} from '../utils/portfolioStore';
import { 
  getStoredBlogPosts, upsertBlogPost, deleteBlogPost, resetStoredBlogPosts, 
  getStoredBlogCategories, addBlogCategory, deleteBlogCategory,
  generateSlug, calculateReadingTime, BLOGS_UPDATED_EVENT 
} from '../utils/blogStore';
import { BlogPost } from '../data/blogs';
import { navigateTo } from '../utils/router';
import { 
  isAdminAuthenticated, 
  recordAdminActivity,
  getAdminSessionRemainingSeconds,
  ADMIN_SESSION_EXPIRED_EVENT
} from '../utils/adminAuth';
import {
  CLOUD_SYNC_STATUS_EVENT,
  CloudSyncStatus,
  getCloudSyncStatus,
  signInOwnerWithGoogle,
  signOutOwnerFromGoogle,
  syncAllLocalDataToCloud,
} from '../utils/cloudSync';
import { PERSONAL_INFO } from '../data';
import { 
  DEFAULT_CAREER_OBJECTIVE, 
  ROLE_CAREER_OBJECTIVES, 
  TargetRoleType, 
  TemplateType, 
  AtsFontFamily 
} from './ResumeBuilderModal';
import { CoverLetterTone, CoverLetterTemplate } from './CoverLetterGeneratorModal';
import {
  loadTeamMembers,
  addTeamMember,
  updateTeamMember,
  deleteTeamMember,
  duplicateTeamMember,
  resetTeamMembers,
  loadVisitingCardConfig,
  saveVisitingCardConfig,
  VisitingCardConfig,
  TeamMemberCard,
  PrivacySettings,
  loadPrivacySettings,
  savePrivacySettings,
  VCARD_STORE_UPDATED_EVENT,
} from '../utils/visitingCardStore';

export type AdminTab = 'overview' | 'projects' | 'experience' | 'references' | 'roadmap' | 'skills' | 'blogs' | 'resume' | 'cover-letter' | 'profile' | 'vcard' | 'security';

interface AdminPortalProps {
  onBack: () => void;
  initialTab?: AdminTab;
  onOpenResumeBuilder?: () => void;
  onOpenCoverLetter?: () => void;
  onOpenMainSecurity?: (mode?: SecurityModalMode) => void;
}

export default function AdminPortal({ 
  onBack, 
  initialTab = 'overview',
  onOpenResumeBuilder,
  onOpenCoverLetter,
  onOpenMainSecurity,
}: AdminPortalProps) {
  // Authentication State (controlled exclusively by the external Main Security System)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [, setSessionRemaining] = useState<number>(() => getAdminSessionRemainingSeconds());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isVisitingCardModalOpen, setIsVisitingCardModalOpen] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => getSavedThemeId());
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [visitorStats, setVisitorStats] = useState<VisitorMetrics>(() => getCurrentVisitorMetrics());
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(() => getCloudSyncStatus());

  useEffect(() => {
    if (!isAdmin && onOpenMainSecurity) {
      onOpenMainSecurity('unlock');
    }
  }, [isAdmin, onOpenMainSecurity]);

  // Active Tab (synced when route query ?tab=... updates)
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Blog Editorial Status Filter ('All' | 'Published' | 'Draft')
  const [blogStatusFilter, setBlogStatusFilter] = useState<'All' | 'Published' | 'Draft'>('All');

  // Portfolio Datasets
  const [projects, setProjects] = useState<Project[]>(() => getStoredProjects());
  const [experiences, setExperiences] = useState<Experience[]>(() => getStoredExperiences());
  const [skills, setSkills] = useState<Skill[]>(() => getStoredSkills());
  const [references, setReferences] = useState<Reference[]>(() => getStoredReferences());
  const [careerRoadmap, setCareerRoadmap] = useState<CareerRoadmapItem[]>(() => getStoredCareerRoadmap());
  const [blogs, setBlogs] = useState<BlogPost[]>(() => getStoredBlogPosts());
  const [profile, setProfile] = useState<ProfileData>(() => getStoredProfile());

  // Resume Settings State
  const [resumeRole, setResumeRole] = useState<TargetRoleType>('all-rounder');
  const [resumeObjective, setResumeObjective] = useState<string>(() => PERSONAL_INFO.objective || DEFAULT_CAREER_OBJECTIVE);
  const [resumeTemplate, setResumeTemplate] = useState<TemplateType>('classic-ats');
  const [resumeFont, setResumeFont] = useState<AtsFontFamily>('modern');
  const [resumeSelectedProjectIds, setResumeSelectedProjectIds] = useState<string[]>(() => 
    getStoredProjects().map(p => p.id)
  );

  // Cover Letter Settings State
  const [clCompany, setClCompany] = useState<string>('Tech Solutions Inc.');
  const [clJobTitle, setClJobTitle] = useState<string>('Software Quality Assurance Engineer');
  const [clHiringManager, setClHiringManager] = useState<string>('Hiring Manager');
  const [clLocation, setClLocation] = useState<string>('Remote / Dhaka');
  const [clTone, setClTone] = useState<CoverLetterTone>('professional');
  const [clTemplate, setClTemplate] = useState<CoverLetterTemplate>('modern-executive');
  const [clCustomContent, setClCustomContent] = useState<string>('');

  // Visiting Card Admin State (Full CRUD, Global Config & Privacy)
  const [vcardConfig, setVcardConfig] = useState<VisitingCardConfig>(() => loadVisitingCardConfig());
  const [teamCards, setTeamCards] = useState<TeamMemberCard[]>(() => loadTeamMembers());
  const [vcardPrivacy, setVcardPrivacy] = useState<PrivacySettings>(() => loadPrivacySettings());
  const [editingCard, setEditingCard] = useState<TeamMemberCard | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState<boolean>(false);
  const [cardSearchQuery, setCardSearchQuery] = useState<string>('');
  const [cardForm, setCardForm] = useState<Omit<TeamMemberCard, 'id'>>({
    name: '',
    nameBn: '',
    role: '',
    roleBn: '',
    department: 'Manual & automation Test',
    departmentBn: 'ম্যানুয়াল ও অটোমেশন টেস্ট',
    phone: '+8801681387906',
    email: 'sabbircse72@gmail.com',
    avatar: '/sabbir_avatar.jpeg',
    verifiedId: '',
  });

  // Search & Filter
  const [projectSearch, setProjectSearch] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('All');
  const [blogSearch, setBlogSearch] = useState('');
  const [blogCategoryFilter, setBlogCategoryFilter] = useState<string>('All');
  const [blogCategories, setBlogCategories] = useState<string[]>(() => getStoredBlogCategories());
  const [isCreatingBlogCategory, setIsCreatingBlogCategory] = useState(false);
  const [newBlogCategoryName, setNewBlogCategoryName] = useState('');

  // Modals & Forms State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);

  const [referenceFormOpen, setReferenceFormOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<Reference | null>(null);
  const [referenceForm, setReferenceForm] = useState<Omit<Reference, 'id'>>({
    name: '', role: '', company: '', email: '', phone: '', endorsement: '',
  });
  const [roadmapFormOpen, setRoadmapFormOpen] = useState(false);
  const [editingRoadmapItem, setEditingRoadmapItem] = useState<CareerRoadmapItem | null>(null);
  const [roadmapForm, setRoadmapForm] = useState<Omit<CareerRoadmapItem, 'id'>>({
    title: '', status: 'future', badge: '',
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryItemsInput, setCategoryItemsInput] = useState('');

  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);

  // Quick skill input per category
  const [quickSkillInput, setQuickSkillInput] = useState<{ [categoryIndex: number]: string }>({});

  // Confirmation Modals
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'project' | 'experience' | 'reference' | 'roadmap' | 'skillCategory' | 'blog' | 'reset';
    id?: string;
    index?: number;
    title: string;
  } | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync state on external or internal update events
  useEffect(() => {
    const handlePortfolioUpdated = () => {
      setProjects(getStoredProjects());
      setExperiences(getStoredExperiences());
      setSkills(getStoredSkills());
      setReferences(getStoredReferences());
      setCareerRoadmap(getStoredCareerRoadmap());
      setProfile(getStoredProfile());
    };

    const handleBlogsUpdated = () => {
      setBlogs(getStoredBlogPosts());
      setBlogCategories(getStoredBlogCategories());
    };

    const handleAuthUpdated = () => {
      setIsAdmin(isAdminAuthenticated());
    };

    const unsubscribeVisitors = subscribeVisitorStats((updatedStats) => {
      setVisitorStats(updatedStats);
    });

    const handleCloudStatus = (e: Event) => {
      const custom = e as CustomEvent<CloudSyncStatus>;
      setCloudStatus(custom.detail || getCloudSyncStatus());
    };

    window.addEventListener(PORTFOLIO_UPDATED_EVENT, handlePortfolioUpdated);
    window.addEventListener(BLOGS_UPDATED_EVENT, handleBlogsUpdated);
    window.addEventListener('admin_auth_changed', handleAuthUpdated);
    window.addEventListener(CLOUD_SYNC_STATUS_EVENT, handleCloudStatus);

    return () => {
      unsubscribeVisitors();
      window.removeEventListener(PORTFOLIO_UPDATED_EVENT, handlePortfolioUpdated);
      window.removeEventListener(BLOGS_UPDATED_EVENT, handleBlogsUpdated);
      window.removeEventListener('admin_auth_changed', handleAuthUpdated);
      window.removeEventListener(CLOUD_SYNC_STATUS_EVENT, handleCloudStatus);
    };
  }, []);

  // Strict 2-Minute Inactivity Auto-Logout Timer & Interaction Tracker
  useEffect(() => {
    if (!isAdmin) return;

    // Reset countdown immediately on login
    setSessionRemaining(getAdminSessionRemainingSeconds());

    // Tick every 1 second
    const timerInterval = setInterval(() => {
      const remaining = getAdminSessionRemainingSeconds();
      setSessionRemaining(remaining);
      if (remaining <= 0 || !isAdminAuthenticated()) {
        setIsAdmin(false);
        showToast('Admin session expired after 2 minutes of inactivity.');
      }
    }, 1000);

    // Track user activity to refresh session during active usage
    let lastRecorded = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 2000) {
        lastRecorded = now;
        recordAdminActivity();
        setSessionRemaining(getAdminSessionRemainingSeconds());
      }
    };

    const handleSessionExpired = () => {
      setIsAdmin(false);
      showToast('Admin session expired after 2 minutes. Logged out.');
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      clearInterval(timerInterval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [isAdmin]);


  // Export dataset backup
  const handleExportBackup = () => {
    const jsonStr = exportPortfolioDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sabbir_portfolio_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Portfolio JSON backup downloaded.');
  };

  // Import dataset backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importPortfolioDataJson(content);
        if (success) {
          showToast('Portfolio dataset restored successfully!');
        } else {
          showToast('Invalid portfolio JSON format.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --------------------------------------------------------------------------
  // PROJECT CRUD ACTIONS
  // --------------------------------------------------------------------------
  const handleOpenAddProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (p: Project) => {
    setEditingProject(p);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (projectData: Omit<Project, 'id'>) => {
    if (editingProject) {
      updateStoredProject(editingProject.id, projectData);
      showToast(`Project "${projectData.title}" updated.`);
    } else {
      addStoredProject(projectData);
      showToast(`New project "${projectData.title}" created.`);
    }
    setIsProjectModalOpen(false);
    setEditingProject(null);
  };

  const handleDuplicateProject = (p: Project) => {
    const duplicated: Omit<Project, 'id'> = {
      ...p,
      title: `${p.title} (Copy)`,
    };
    addStoredProject(duplicated);
    showToast(`Project "${p.title}" duplicated.`);
  };

  const handleMoveProject = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= projects.length) return;
    reorderStoredProjects(index, targetIndex);
    showToast('Project reordered.');
  };

  // --------------------------------------------------------------------------
  // EXPERIENCE CRUD ACTIONS
  // --------------------------------------------------------------------------
  const handleOpenAddExperience = () => {
    setEditingExperience(null);
    setIsExperienceModalOpen(true);
  };

  const handleOpenEditExperience = (exp: Experience) => {
    setEditingExperience(exp);
    setIsExperienceModalOpen(true);
  };

  const handleSaveExperience = (expData: Omit<Experience, 'id'>) => {
    if (editingExperience) {
      updateStoredExperience(editingExperience.id, expData);
      showToast(`Experience at "${expData.company}" updated.`);
    } else {
      addStoredExperience(expData);
      showToast(`Experience at "${expData.company}" created.`);
    }
    setIsExperienceModalOpen(false);
    setEditingExperience(null);
  };

  const handleMoveExperience = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= experiences.length) return;
    reorderStoredExperiences(index, targetIndex);
    showToast('Experience milestone reordered.');
  };

  const handleSaveReference = (e: React.FormEvent) => {
    e.preventDefault();
    const referenceData = {
      ...referenceForm,
      name: referenceForm.name.trim(),
      role: referenceForm.role.trim(),
      company: referenceForm.company.trim(),
      email: referenceForm.email.trim(),
      phone: referenceForm.phone.trim(),
      endorsement: referenceForm.endorsement.trim(),
    };
    if (editingReference) {
      updateStoredReference(editingReference.id, referenceData);
      showToast(`Reference for "${referenceData.name}" updated.`);
    } else {
      addStoredReference(referenceData);
      showToast(`Reference for "${referenceData.name}" added.`);
    }
    setReferenceFormOpen(false);
    setEditingReference(null);
  };

  const handleEditReference = (reference: Reference) => {
    setEditingReference(reference);
    setReferenceForm({
      name: reference.name,
      role: reference.role,
      company: reference.company,
      email: reference.email,
      phone: reference.phone,
      endorsement: reference.endorsement,
    });
    setReferenceFormOpen(true);
  };

  const handleSaveRoadmapItem = (e: React.FormEvent) => {
    e.preventDefault();
    const itemData = {
      ...roadmapForm,
      title: roadmapForm.title.trim(),
      badge: roadmapForm.badge?.trim() || undefined,
    };
    if (editingRoadmapItem) {
      updateStoredCareerRoadmapItem(editingRoadmapItem.id, itemData);
      showToast(`Roadmap step "${itemData.title}" updated.`);
    } else {
      addStoredCareerRoadmapItem(itemData);
      showToast(`Roadmap step "${itemData.title}" added.`);
    }
    setRoadmapFormOpen(false);
    setEditingRoadmapItem(null);
  };

  const handleEditRoadmapItem = (item: CareerRoadmapItem) => {
    setEditingRoadmapItem(item);
    setRoadmapForm({ title: item.title, status: item.status, badge: item.badge || '' });
    setRoadmapFormOpen(true);
  };

  // --------------------------------------------------------------------------
  // SKILL CRUD ACTIONS
  // --------------------------------------------------------------------------
  const handleOpenAddCategory = () => {
    setEditingCategoryIndex(null);
    setCategoryNameInput('');
    setCategoryItemsInput('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (index: number) => {
    const cat = skills[index];
    setEditingCategoryIndex(index);
    setCategoryNameInput(cat.category);
    setCategoryItemsInput(cat.items.join(', '));
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = categoryNameInput.trim();
    if (!name) return;

    const items = categoryItemsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (editingCategoryIndex !== null) {
      updateStoredSkillCategory(editingCategoryIndex, { category: name, items });
      showToast(`Skill category "${name}" updated.`);
    } else {
      addStoredSkillCategory(name, items);
      showToast(`Skill category "${name}" added.`);
    }

    setIsCategoryModalOpen(false);
  };

  const handleAddQuickSkill = (categoryIndex: number) => {
    const val = quickSkillInput[categoryIndex]?.trim();
    if (!val) return;
    addSkillItemToCategory(categoryIndex, val);
    setQuickSkillInput(prev => ({ ...prev, [categoryIndex]: '' }));
    showToast(`Added "${val}" to skills.`);
  };

  const handleRemoveSkillItem = (categoryIndex: number, itemIndex: number, itemName: string) => {
    removeSkillItemFromCategory(categoryIndex, itemIndex);
    showToast(`Removed "${itemName}".`);
  };

  // --------------------------------------------------------------------------
  // BLOG CRUD ACTIONS
  // --------------------------------------------------------------------------
  const handleOpenAddBlog = () => {
    setEditingBlog(null);
    setIsBlogModalOpen(true);
  };

  const handleOpenEditBlog = (post: BlogPost) => {
    setEditingBlog(post);
    setIsBlogModalOpen(true);
  };

  const handleSaveBlog = (blogData: Partial<BlogPost> & { title?: string; content?: string }) => {
    upsertBlogPost(blogData);
    setBlogCategories(getStoredBlogCategories());
    showToast(`Article "${blogData.title || 'Untitled'}" saved.`);
    setIsBlogModalOpen(false);
    setEditingBlog(null);
  };

  const handleAddCustomBlogCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newBlogCategoryName.trim();
    if (!trimmed) return;
    const updated = addBlogCategory(trimmed);
    setBlogCategories(updated);
    setBlogCategoryFilter(updated.find((c) => c.toLowerCase() === trimmed.toLowerCase()) || trimmed);
    setNewBlogCategoryName('');
    setIsCreatingBlogCategory(false);
    showToast(`Blog category "${trimmed}" created.`);
  };

  const handleDeleteCustomBlogCategory = (catName: string) => {
    const updated = deleteBlogCategory(catName);
    setBlogCategories(updated);
    if (blogCategoryFilter === catName) {
      setBlogCategoryFilter('All');
    }
    showToast(`Removed category "${catName}".`);
  };

  // --------------------------------------------------------------------------
  // BLOG EDITORIAL STATUS & FEATURED HANDLERS (NO SEPARATE BLOG/ARTICLE LOCKS)
  // --------------------------------------------------------------------------
  const handleToggleBlogStatus = (id: string) => {
    const post = blogs.find(b => b.id === id);
    if (!post) return;
    const newStatus = post.status === 'Draft' ? 'Published' : 'Draft';
    upsertBlogPost({
      ...post,
      status: newStatus,
    });
    setBlogs(getStoredBlogPosts());
    showToast(
      newStatus === 'Published'
        ? `"${post.title.slice(0, 28)}..." published live for readers.`
        : `"${post.title.slice(0, 28)}..." moved to private CMS drafts.`
    );
  };

  const handleToggleBlogFeatured = (id: string) => {
    const post = blogs.find(b => b.id === id);
    if (!post) return;
    const nextFeatured = !post.featured;
    upsertBlogPost({
      ...post,
      featured: nextFeatured,
    });
    setBlogs(getStoredBlogPosts());
    showToast(
      nextFeatured
        ? `"${post.title.slice(0, 28)}..." highlighted as Featured.`
        : `"${post.title.slice(0, 28)}..." removed from Featured.`
    );
  };

  const handlePublishAllDrafts = () => {
    const draftItems = blogs.filter(p => p.status === 'Draft');
    if (draftItems.length === 0) {
      showToast('All articles are already published live.');
      return;
    }
    draftItems.forEach(post => {
      upsertBlogPost({ ...post, status: 'Published' });
    });
    setBlogs(getStoredBlogPosts());
    showToast(`Published ${draftItems.length} draft article${draftItems.length > 1 ? 's' : ''} live.`);
  };

  // --------------------------------------------------------------------------
  // RESUME & COVER LETTER ACTIONS
  // --------------------------------------------------------------------------
  const handleRolePresetSelect = (role: TargetRoleType) => {
    setResumeRole(role);
    setResumeObjective(ROLE_CAREER_OBJECTIVES[role] || DEFAULT_CAREER_OBJECTIVE);
    showToast(`Applied preset for ${role.toUpperCase()}`);
  };

  const toggleResumeProject = (id: string) => {
    setResumeSelectedProjectIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const generateAdminCoverLetter = (
    cName: string,
    jTitle: string,
    hMgr: string,
    loc: string,
    tne: CoverLetterTone
  ) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    let greeting = `Dear ${hMgr || 'Hiring Manager'},`;
    let intro = `I am writing to express my strong interest in the ${jTitle} position at ${cName}. With over 2 years of hands-on experience in Software Quality Assurance, automated framework engineering (Playwright Python/TypeScript), REST API testing (Postman/Newman), and rigorous STLC workflows, I am eager to contribute to ${cName}'s product excellence.`;
    if (tne === 'formal') {
      intro = `Please accept this letter and the attached curriculum vitae as my formal application for the ${jTitle} role at ${cName}. Having specialized in full-cycle software testing, robust automation suites, and regression testing across enterprise systems, I offer a disciplined and meticulous approach to software reliability.`;
    } else if (tne === 'enthusiastic') {
      intro = `I am thrilled to submit my application for the ${jTitle} role at ${cName}! Having tracked ${cName}'s commitment to quality software, I am genuinely excited about the prospect of bringing my Playwright automation, API testing, and defect prevention skills to your engineering team.`;
    }

    const techFocus = `Throughout my engineering journey, I have built complete end-to-end testing pipelines using Playwright, pytest, and GitHub Actions CI/CD, authored over 150+ comprehensive test scenarios, and executed exploratory testing that prevented critical production vulnerabilities. In my recent role at Altersense Limited, I spearheaded ERPNext quality audits, verified complex backend payloads, and worked in close collaboration with developers to slash regression cycle times by 40%.`;

    const projectHighlight = `In my live SQA Portfolio (https://github.com/sabbir72), I maintain documented testing repositories with source code available on GitHub. Key showcases include an automated eCommerce E2E Playwright Python Suite, comprehensive REST API collections with automated assertions, and a live bug reporting system.`;

    let closing = `I would welcome the opportunity to discuss how my quality assurance rigor and automation skills can support ${cName}'s testing goals. Thank you for your time and consideration.`;

    return `${profile.name || PERSONAL_INFO.name}
${profile.location || PERSONAL_INFO.location}
${profile.email || PERSONAL_INFO.email} | ${profile.phone || PERSONAL_INFO.phone}
${profile.linkedin || PERSONAL_INFO.linkedin} | ${profile.github || PERSONAL_INFO.github}

${today}

${hMgr}
${cName}
${loc}

Subject: Application for ${jTitle} Position

${greeting}

${intro}

${techFocus}

${projectHighlight}

${closing}

Sincerely,

${profile.name || PERSONAL_INFO.name}
${profile.title || PERSONAL_INFO.title}`;
  };
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoredProfile(profile);
    showToast('Personal Profile & Portfolio Metrics updated successfully!');
  };

  // --------------------------------------------------------------------------
  // DELETE CONFIRMATION HANDLER
  // --------------------------------------------------------------------------
  const handleConfirmDelete = () => {
    if (!confirmDelete) return;

    if (confirmDelete.type === 'project' && confirmDelete.id) {
      deleteStoredProject(confirmDelete.id);
      showToast(`Project "${confirmDelete.title}" deleted.`);
    } else if (confirmDelete.type === 'experience' && confirmDelete.id) {
      deleteStoredExperience(confirmDelete.id);
      showToast(`Experience milestone deleted.`);
    } else if (confirmDelete.type === 'reference' && confirmDelete.id) {
      deleteStoredReference(confirmDelete.id);
      showToast('Professional reference deleted.');
    } else if (confirmDelete.type === 'roadmap' && confirmDelete.id) {
      deleteStoredCareerRoadmapItem(confirmDelete.id);
      showToast('Career roadmap step deleted.');
    } else if (confirmDelete.type === 'skillCategory' && confirmDelete.index !== undefined) {
      deleteStoredSkillCategory(confirmDelete.index);
      showToast(`Skill category "${confirmDelete.title}" deleted.`);
    } else if (confirmDelete.type === 'blog' && confirmDelete.id) {
      deleteBlogPost(confirmDelete.id);
      showToast(`Article "${confirmDelete.title}" deleted.`);
    } else if (confirmDelete.type === 'reset') {
      resetPortfolioToDefault();
      resetStoredBlogPosts();
      showToast('All portfolio data reset to default template.');
    }

    setConfirmDelete(null);
  };

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = projectSearch === '' || 
        p.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(projectSearch.toLowerCase()));
      
      const matchType = projectTypeFilter === 'All' || p.type === projectTypeFilter;
      return matchSearch && matchType;
    });
  }, [projects, projectSearch, projectTypeFilter]);

  // Filtered Blogs (by search, category, and editorial status)
  const filteredBlogs = useMemo(() => {
    return blogs.filter(b => {
      const matchSearch = blogSearch === '' ||
        b.title.toLowerCase().includes(blogSearch.toLowerCase()) ||
        b.description.toLowerCase().includes(blogSearch.toLowerCase()) ||
        b.tags.some(t => t.toLowerCase().includes(blogSearch.toLowerCase()));
      
      const matchCategory = blogCategoryFilter === 'All' || b.category === blogCategoryFilter;
      const normalizedStatus = b.status === 'Draft' ? 'Draft' : 'Published';
      const matchStatus = blogStatusFilter === 'All' || normalizedStatus === blogStatusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [blogs, blogSearch, blogCategoryFilter, blogStatusFilter]);

  const totalSkillItems = useMemo(() => {
    return skills.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [skills]);

  // --------------------------------------------------------------------------
  // VISITING CARD MANAGEMENT ACTIONS (CRUD & BRAND IDENTITY)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleVcardSync = () => {
      setVcardConfig(loadVisitingCardConfig());
      setTeamCards(loadTeamMembers());
      setVcardPrivacy(loadPrivacySettings());
    };
    window.addEventListener(VCARD_STORE_UPDATED_EVENT, handleVcardSync);
    return () => window.removeEventListener(VCARD_STORE_UPDATED_EVENT, handleVcardSync);
  }, []);

  const handleOpenAddCard = () => {
    setEditingCard(null);
    setCardForm({
      name: '',
      nameBn: '',
      role: '',
      roleBn: '',
      department: vcardConfig.department || 'Manual & automation Test',
      departmentBn: vcardConfig.departmentBn || 'ম্যানুয়াল ও অটোমেশন টেস্ট',
      phone: '+8801681387906',
      email: 'sabbircse72@gmail.com',
      avatar: '/sabbir_avatar.jpeg',
      verifiedId: '',
    });
    setIsCardModalOpen(true);
  };

  const handleEditCard = (card: TeamMemberCard) => {
    setEditingCard(card);
    setCardForm({
      name: card.name,
      nameBn: card.nameBn || card.name,
      role: card.role,
      roleBn: card.roleBn || card.role,
      department: card.department || 'Manual & automation Test',
      departmentBn: card.departmentBn || 'ম্যানুয়াল ও অটোমেশন টেস্ট',
      phone: card.phone || '',
      email: card.email || '',
      avatar: card.avatar || '/sabbir_avatar.jpeg',
      verifiedId: card.verifiedId || '',
    });
    setIsCardModalOpen(true);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.name.trim() || !cardForm.role.trim()) {
      showToast('Please enter full Name and Role.');
      return;
    }
    if (editingCard) {
      updateTeamMember(editingCard.id, cardForm);
      showToast(`Visiting card for "${cardForm.name}" updated.`);
    } else {
      addTeamMember(cardForm);
      showToast(`New visiting card for "${cardForm.name}" created.`);
    }
    setTeamCards(loadTeamMembers());
    setIsCardModalOpen(false);
    setEditingCard(null);
  };

  const handleDeleteCard = (card: TeamMemberCard) => {
    if (teamCards.length <= 1) {
      showToast('At least one visiting card profile must be maintained.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete the visiting card profile for "${card.name}"?`)) {
      deleteTeamMember(card.id);
      setTeamCards(loadTeamMembers());
      showToast(`Visiting card for "${card.name}" deleted.`);
    }
  };

  const handleDuplicateCard = (card: TeamMemberCard) => {
    const clone = duplicateTeamMember(card.id);
    if (clone) {
      setTeamCards(loadTeamMembers());
      showToast(`Duplicated card for "${clone.name}".`);
    }
  };

  const handleResetCards = () => {
    if (window.confirm('Reset all visiting card profiles to default official cards?')) {
      resetTeamMembers();
      setTeamCards(loadTeamMembers());
      showToast('Visiting cards reset to defaults.');
    }
  };

  const handleSaveVcardConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveVisitingCardConfig(vcardConfig);
    setVcardConfig(updated);
    showToast('Visiting card global brand identity & settings saved.');
  };

  const handleTogglePrivacySetting = (key: keyof PrivacySettings) => {
    const updated = { ...vcardPrivacy, [key]: !vcardPrivacy[key] };
    setVcardPrivacy(updated);
    savePrivacySettings(updated);
    showToast(`Privacy rule "${key}" updated.`);
  };

  const filteredTeamCards = useMemo(() => {
    if (!cardSearchQuery.trim()) return teamCards;
    const q = cardSearchQuery.toLowerCase();
    return teamCards.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }, [teamCards, cardSearchQuery]);

  const publishedBlogsCount = useMemo(
    () => blogs.filter((b) => b.status === 'Published').length,
    [blogs]
  );
  const draftBlogsCount = useMemo(
    () => blogs.filter((b) => b.status === 'Draft').length,
    [blogs]
  );

  const handleSelectSidebarTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefreshWorkspace = () => {
    setProjects(getStoredProjects());
    setExperiences(getStoredExperiences());
    setSkills(getStoredSkills());
    setReferences(getStoredReferences());
    setCareerRoadmap(getStoredCareerRoadmap());
    setBlogs(getStoredBlogPosts());
    setBlogCategories(getStoredBlogCategories());
    setProfile(getStoredProfile());
    setVcardConfig(loadVisitingCardConfig());
    setTeamCards(loadTeamMembers());
    setVisitorStats(getCurrentVisitorMetrics());
    recordAdminActivity();
    setSessionRemaining(getAdminSessionRemainingSeconds());
    showToast('Dashboard datasets synced successfully.');
  };

  const TAB_META: Record<AdminTab, { title: string; subtitle: string; label: string }> = {
    overview: {
      label: 'Overview',
      title: 'Dashboard Overview',
      subtitle: 'Unified CMS Dashboard for Projects, Work Experience, Skills, Blogs, Visiting Cards, and Theme & Backup.',
    },
    projects: {
      label: 'Projects',
      title: 'Projects Management',
      subtitle: 'Create, reorder, duplicate, and update SQA automation, API, performance, and manual test showcases.',
    },
    experience: {
      label: 'Experience',
      title: 'Work Experience Timeline',
      subtitle: 'Manage companies, roles, dates, locations, and engineering accomplishment highlights.',
    },
    skills: {
      label: 'Skills & Data',
      title: 'Technical Skills Matrix',
      subtitle: 'Organize testing frameworks, languages, CI/CD pipelines, and domain skill categories.',
    },
    roadmap: {
      label: 'Career Roadmap',
      title: 'Career Vision & Roadmap',
      subtitle: 'Track completed milestones, current engineering focus, and upcoming SQA leadership goals.',
    },
    blogs: {
      label: 'Blogs & Articles',
      title: 'SQA Articles & Publications',
      subtitle: 'Compose articles, manage custom categories, upload cover photos from files, and toggle public visibility.',
    },
    references: {
      label: 'References',
      title: 'Professional References',
      subtitle: 'Maintain verified industry endorsements, mentor contacts, and executive recommendations.',
    },
    vcard: {
      label: 'Visiting Card',
      title: 'Smart Visiting Card & NFC',
      subtitle: 'Manage 3D digital business card profiles, QR identity settings, vCard contact rules, and brand details.',
    },
    resume: {
      label: 'Resume & ATS',
      title: 'ATS Resume Studio',
      subtitle: 'Configure role-targeted career objectives, linked portfolio projects, and print-ready ATS CV templates.',
    },
    'cover-letter': {
      label: 'Cover Letter',
      title: 'Cover Letter Studio',
      subtitle: 'Draft, customize, and export tailored SQA cover letters for engineering applications.',
    },
    profile: {
      label: 'Profile & Bio',
      title: 'Personal Profile & Identity',
      subtitle: 'Upload your profile photo from file and update hero headline, experience tenure, contact links, and bio.',
    },
    security: {
      label: 'Theme & Backup',
      title: 'Appearance & Data Backup',
      subtitle: 'Customize global portfolio color palettes, export JSON backups, restore data, or reset baseline defaults.',
    },
  };

  const mainNavItems: {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number | string;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'projects', label: 'Projects', icon: Layers, count: projects.length },
    { id: 'experience', label: 'Experience', icon: Briefcase, count: experiences.length },
    { id: 'skills', label: 'Skills & Data', icon: Zap, count: totalSkillItems },
    { id: 'roadmap', label: 'Career Roadmap', icon: Target, count: careerRoadmap.length },
    { id: 'blogs', label: 'Blogs & Articles', icon: BookOpen, count: blogs.length },
    { id: 'references', label: 'References', icon: Award, count: references.length },
    { id: 'vcard', label: 'Visiting Card', icon: Nfc, count: teamCards.length },
    { id: 'resume', label: 'Resume & ATS', icon: FileText },
    { id: 'cover-letter', label: 'Cover Letter', icon: Send },
  ];

  const otherNavItems: {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number | string;
  }[] = [
    { id: 'profile', label: 'Profile & Bio', icon: User },
    { id: 'security', label: 'Theme & Backup', icon: Settings },
  ];

  const activeMeta = TAB_META[activeTab];

  // Portfolio Content Completeness Score (grounded in real populated modules)
  const populatedModulesCount = [
    projects.length > 0,
    experiences.length > 0,
    totalSkillItems > 0,
    blogs.length > 0,
    teamCards.length > 0,
    references.length > 0,
    careerRoadmap.length > 0,
    Boolean(profile.name && profile.email),
  ].filter(Boolean).length;
  const completenessPercent = Math.round((populatedModulesCount / 8) * 100);

  // ============================================================================
  // UNLOCKED VIEW OR PASSCODE GATE
  // ============================================================================

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#080B12] text-white flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#0E1320] border border-white/[0.09] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="inline-flex p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-display font-bold text-xl text-white">
              Main Security System Locked
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use the Main System Security dialog to unlock full portfolio management or update your password.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Back to Portfolio
            </button>
            {onOpenMainSecurity && (
              <button
                type="button"
                onClick={() => onOpenMainSecurity('unlock')}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold shadow-lg shadow-indigo-600/25 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Open Main Security</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // AUTHENTICATED SAAS ADMIN DASHBOARD
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#080B12] text-[#F3F4F6] flex font-sans selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#111726] border border-indigo-500/40 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for JSON Restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportBackup}
        accept=".json"
        className="hidden"
      />

      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ==================================================================== */}
      {/* LEFT SIDEBAR NAVIGATION */}
      {/* ==================================================================== */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[264px] shrink-0 bg-[#0B0F1A] border-r border-white/[0.08] flex flex-col transition-transform duration-200 ease-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Row */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/[0.07] shrink-0">
          <button
            onClick={() => handleSelectSidebarTab('overview')}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 shrink-0">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-[15px] text-white tracking-tight group-hover:text-indigo-300 transition-colors">
              Portfolio Admin
            </span>
          </button>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workspace Identity Block */}
        <div className="px-4 py-3.5 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <img
                src={profile.avatar || '/sabbir_avatar.jpeg'}
                alt="Sabbir Ahamed"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {profile.name || 'Sabbir Ahamed'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Administrator
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* MAIN Group */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Main
            </div>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSidebarTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-500/75 text-white shadow-md shadow-indigo-950/50 border border-indigo-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>

                  <span className="flex items-center gap-1.5 shrink-0">
                    {item.count !== undefined && (
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          isActive ? 'text-indigo-100 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* OTHER Group */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Other
            </div>
            {otherNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectSidebarTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-500/75 text-white shadow-md shadow-indigo-950/50 border border-indigo-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>

                  <span className="flex items-center gap-1.5 shrink-0">
                    {item.count !== undefined && (
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          isActive ? 'text-indigo-100 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sticky Bottom Profile Footer */}
        <div className="p-3.5 border-t border-white/[0.07] bg-[#090D16] shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-2.5 px-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-600/25 border border-indigo-400/30 flex items-center justify-center text-[11px] font-bold text-indigo-300 shrink-0 overflow-hidden">
                <img
                  src={profile.avatar || '/sabbir_avatar.jpeg'}
                  alt="SA"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {profile.name || 'Sabbir Ahamed'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {profile.email || 'sabbircse72@gmail.com'}
                </div>
              </div>
            </div>

            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer shrink-0"
              title="Return to Public Portfolio"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* MAIN WORKSPACE VIEWPORT */}
      {/* ==================================================================== */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
          
          {/* Top Workspace Header Card */}
          <header className="bg-[#0E1320] border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-1.5 -ml-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] cursor-pointer"
                  aria-label="Open Navigation"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSelectSidebarTab('overview')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Portfolio Admin
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="text-indigo-400 font-medium truncate">
                  {activeMeta.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display font-bold text-2xl sm:text-[26px] text-white tracking-tight">
                  {activeMeta.title}
                </h1>
                {activeTab !== 'overview' && (
                  <button
                    onClick={() => handleSelectSidebarTab('overview')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] text-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Overview</span>
                  </button>
                )}
              </div>

              <p className="text-xs sm:text-[13px] text-slate-400 max-w-2xl leading-relaxed">
                {activeMeta.subtitle}
              </p>
            </div>

            {/* Right Action Toolbar (2-Row Structured SaaS Controls) */}
            <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
              {/* Row 1: Primary Workspace Utilities */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleRefreshWorkspace}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer shrink-0"
                  title="Sync Data & Refresh Timer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>View Portfolio</span>
                </button>

                <button
                  onClick={handleExportBackup}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Download full JSON backup"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Export JSON</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Restore JSON backup"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Import JSON</span>
                </button>

                <button
                  onClick={() => setIsVisitingCardModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Preview Smart 3D Visiting Card"
                >
                  <Nfc className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Visiting Card</span>
                </button>
              </div>

              {/* Row 2: Theme & Factory Reset */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsThemeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Switch Portfolio Color Theme"
                >
                  <Palette className="w-3.5 h-3.5 text-violet-400" />
                  <span>Color Theme</span>
                </button>

                <button
                  onClick={() => setConfirmDelete({ type: 'reset', title: 'Default Portfolio & Blog Dataset' })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-amber-500/15 text-slate-400 hover:text-amber-300 border border-white/[0.08] hover:border-amber-500/30 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Restore baseline dataset"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </header>

          {/* ==================================================================== */}
          {/* TAB 0: EXECUTIVE DASHBOARD OVERVIEW */}
          {/* ==================================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* 10-Card Executive KPI Grid (Modeled on Reference Dashboard) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Projects */}
                <button
                  type="button"
                  onClick={() => handleSelectSidebarTab('projects')}
                  className="group text-left bg-[#0E1320] hover:bg-[#12192B] border border-white/[0.08] hover:border-indigo-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[164px] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-300">Projects</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="text-3xl font-display font-extrabold text-white tabular-nums tracking-tight">
                      {projects.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      {projects.filter((p) => p.type === 'Automation').length} Automation • {projects.filter((p) => p.type === 'API').length} API
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-indigo-300 transition-colors pt-2 border-t border-white/[0.05]">
                    <span>Manage Projects</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 2. Experience */}
                <button
                  type="button"
                  onClick={() => handleSelectSidebarTab('experience')}
                  className="group text-left bg-[#0E1320] hover:bg-[#12192B] border border-white/[0.08] hover:border-sky-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[164px] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-300">Experience</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="text-3xl font-display font-extrabold text-white tabular-nums tracking-tight">
                      {experiences.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {experiences[0]?.company ? `Latest: ${experiences[0].company}` : 'Career Roles'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-sky-300 transition-colors pt-2 border-t border-white/[0.05]">
                    <span>View Timeline</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 3. Skills */}
                <button
                  type="button"
                  onClick={() => handleSelectSidebarTab('skills')}
                  className="group text-left bg-[#0E1320] hover:bg-[#12192B] border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[164px] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-300">Skills</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="text-3xl font-display font-extrabold text-white tabular-nums tracking-tight">
                      {totalSkillItems}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      Across {skills.length} Categories
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-emerald-300 transition-colors pt-2 border-t border-white/[0.05]">
                    <span>Manage Skills</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 4. Blogs */}
                <button
                  type="button"
                  onClick={() => handleSelectSidebarTab('blogs')}
                  className="group text-left bg-[#0E1320] hover:bg-[#12192B] border border-white/[0.08] hover:border-purple-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[164px] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-300">Blogs</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="text-3xl font-display font-extrabold text-white tabular-nums tracking-tight">
                      {blogs.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      {publishedBlogsCount} Published • {draftBlogsCount} Draft
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-purple-300 transition-colors pt-2 border-t border-white/[0.05]">
                    <span>Manage Blogs</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 5. ATS Score & Resume */}
                <button
                  type="button"
                  onClick={() => handleSelectSidebarTab('resume')}
                  className="group text-left bg-[#0E1320] hover:bg-[#12192B] border border-white/[0.08] hover:border-rose-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[164px] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-300">ATS Resume</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="text-3xl font-display font-extrabold text-white tabular-nums tracking-tight">
                      96%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      {resumeSelectedProjectIds.length}/{projects.length} Showcases Linked
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-rose-300 transition-colors pt-2 border-t border-white/[0.05]">
                    <span>Resume Studio</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 6. Career Roadmap */}
                <button
                  type="button"
                  onClick={() => handleSelectSidebarTab('roadmap')}
                  className="group text-left bg-[#0E1320] hover:bg-[#12192B] border border-white/[0.08] hover:border-violet-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[164px] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0">
                        <Target className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-300">Career Roadmap</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="text-3xl font-display font-extrabold text-white tabular-nums tracking-tight">
                      {careerRoadmap.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      {careerRoadmap.filter((r) => r.status === 'completed').length} Done • {careerRoadmap.filter((r) => r.status === 'active').length} Active
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-violet-300 transition-colors pt-2 border-t border-white/[0.05]">
                    <span>Edit Roadmap</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 7. Profile Level & References */}
                <button
                  type="button"
                  onClick={() => handleSelectSidebarTab('profile')}
                  className="group text-left bg-[#0E1320] hover:bg-[#12192B] border border-white/[0.08] hover:border-cyan-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[164px] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-300">Profile Level</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="text-2xl sm:text-[26px] font-display font-extrabold text-white tabular-nums tracking-tight truncate">
                      {profile.experienceYears || '2+ Years'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      {references.length} Verified References
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-cyan-300 transition-colors pt-2 border-t border-white/[0.05]">
                    <span>Edit Profile</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 8. Visiting Cards */}
                <button
                  type="button"
                  onClick={() => handleSelectSidebarTab('vcard')}
                  className="group text-left bg-[#0E1320] hover:bg-[#12192B] border border-white/[0.08] hover:border-teal-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[164px] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-teal-400 shrink-0">
                        <Nfc className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-300">Visiting Cards</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="text-3xl font-display font-extrabold text-white tabular-nums tracking-tight">
                      {teamCards.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      3D Card, QR &amp; vCard Suite
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-teal-300 transition-colors pt-2 border-t border-white/[0.05]">
                    <span>Manage Cards</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 9. Website Visits (Real Live Visitor Tracker) */}
                <button
                  type="button"
                  onClick={() => {
                    const latest = getCurrentVisitorMetrics();
                    setVisitorStats(latest);
                    showToast(`Traffic synced: ${latest.totalVisitors.toLocaleString()} visitors • ${latest.totalPageViews.toLocaleString()} views.`);
                  }}
                  className="group text-left bg-[#0E1320] hover:bg-[#12192B] border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[164px] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-300">Website Visits</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="text-3xl font-display font-extrabold text-white tabular-nums tracking-tight">
                      {(visitorStats.totalVisitors || 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      {(visitorStats.totalPageViews || 0).toLocaleString()} Views • +{(visitorStats.todayVisitors || 0).toLocaleString()} Today
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-emerald-300 transition-colors pt-2 border-t border-white/[0.05]">
                    <span>Refresh Analytics</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                {/* 10. Theme & Backup */}
                <button
                  type="button"
                  onClick={() => handleSelectSidebarTab('security')}
                  className="group text-left bg-[#0E1320] hover:bg-[#12192B] border border-white/[0.08] hover:border-amber-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between min-h-[164px] cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                        <Palette className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-300">Theme &amp; Backup</span>
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight truncate">
                      {COLOR_THEMES[currentThemeId]?.name || 'Cyber Cyan'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Color Palette &amp; JSON Backup
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 group-hover:text-amber-300 transition-colors pt-2 border-t border-white/[0.05]">
                    <span>Appearance &amp; Backup</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Quick Create & Studio Actions Bar */}
              <div className="bg-[#0E1320] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold text-white">Quick Create &amp; Executive Studios</h2>
                  <p className="text-xs text-slate-400">
                    Launch editors or document builders directly from the overview console.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAddProject}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Project</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddBlog}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                    <span>Write Article</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddExperience}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Add Experience</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddCategory}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Skill Category</span>
                  </button>

                  {onOpenResumeBuilder && (
                    <button
                      type="button"
                      onClick={onOpenResumeBuilder}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>ATS Resume Modal</span>
                    </button>
                  )}

                  {onOpenCoverLetter && (
                    <button
                      type="button"
                      onClick={onOpenCoverLetter}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-slate-200 border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Cover Letter Modal</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dual Insights Row: Recent Content Feed + Quick System Lock Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left: Recent Projects & Blog Posts Table */}
                <div className="lg:col-span-7 bg-[#0E1320] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Recent Showcases &amp; Articles</h3>
                      <p className="text-xs text-slate-400">Direct one-click edit access to your latest portfolio items</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => handleSelectSidebarTab('projects')}
                        className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer whitespace-nowrap"
                      >
                        All Projects
                      </button>
                      <span className="text-slate-700">•</span>
                      <button
                        type="button"
                        onClick={() => handleSelectSidebarTab('blogs')}
                        className="text-purple-400 hover:text-purple-300 font-medium cursor-pointer whitespace-nowrap"
                      >
                        All Blogs
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-white/[0.06] flex-1">
                    {projects.slice(0, 3).map((proj) => (
                      <div
                        key={proj.id}
                        className="px-5 py-3 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {proj.title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              Project • {proj.type} • {proj.tags.slice(0, 3).join(', ')}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenEditProject(proj)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 hover:text-white border border-white/[0.08] text-xs transition-colors cursor-pointer shrink-0"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    ))}

                    {blogs.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        className="px-5 py-3 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {post.title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-2">
                              <span>Article • {post.category}</span>
                              <span
                                className={
                                  post.status === 'Published'
                                    ? 'text-emerald-400 font-medium'
                                    : 'text-amber-400 font-medium'
                                }
                              >
                                • {post.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenEditBlog(post)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 hover:text-white border border-white/[0.08] text-xs transition-colors cursor-pointer shrink-0"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Editorial Publishing & Executive Studios */}
                <div className="lg:col-span-5 bg-[#0E1320] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Publishing &amp; Studios</h3>
                        <p className="text-xs text-slate-400">Live portfolio modules &amp; media status</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectSidebarTab('profile')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer whitespace-nowrap"
                      >
                        Profile &amp; Photo
                      </button>
                    </div>

                    <div className="divide-y divide-white/[0.06]">
                      {/* Row 1: Profile & Media Identity */}
                      <div className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">Profile Photo &amp; Bio</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Direct local image upload enabled
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectSidebarTab('profile')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold border bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <User className="w-3 h-3" />
                          <span>Update</span>
                        </button>
                      </div>

                      {/* Row 2: Blog & Articles Editorial Status */}
                      <div className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">Blogs &amp; Articles Publishing</div>
                          <div className="text-[11px] text-slate-500 truncate tabular-nums">
                            {publishedBlogsCount} Published Live • {draftBlogsCount} Private Drafts
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectSidebarTab('blogs')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold border bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Articles</span>
                        </button>
                      </div>

                      {/* Row 3: Resume & Cover Letter Direct Access */}
                      <div className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">ATS Resume &amp; Cover Letter</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            Role-tailored CV &amp; application templates
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectSidebarTab('resume')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Studio</span>
                        </button>
                      </div>

                      {/* Row 4: Smart Visiting Card & NFC */}
                      <div className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">Smart Visiting Card &amp; NFC</div>
                          <div className="text-[11px] text-slate-500 truncate tabular-nums">
                            {teamCards.length} Digital Card Profile{teamCards.length !== 1 ? 's' : ''} • QR &amp; vCard
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsVisitingCardModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold border bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-white/[0.02] border-t border-white/[0.07] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {populatedModulesCount}/8 Modules Populated
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportBackup}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-slate-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Export JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectSidebarTab('security')}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-[11px] text-amber-300 border border-amber-500/30 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Theme &amp; Backup
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Module Pipeline Summary Strip with Gradient Progress Bar */}
              <div className="bg-[#0E1320] border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <button
                    type="button"
                    onClick={() => handleSelectSidebarTab('projects')}
                    className="flex items-center gap-3 text-left hover:opacity-90 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">Projects</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">{projects.length} Showcases</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSidebarTab('experience')}
                    className="flex items-center gap-3 text-left hover:opacity-90 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">Experience</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">{experiences.length} Roles • {references.length} Refs</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSidebarTab('skills')}
                    className="flex items-center gap-3 text-left hover:opacity-90 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">Skills &amp; Stack</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">{totalSkillItems} Items ({skills.length} Cats)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSidebarTab('roadmap')}
                    className="flex items-center gap-3 text-left hover:opacity-90 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">Roadmap</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">{careerRoadmap.length} Milestones</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSidebarTab('blogs')}
                    className="flex items-center gap-3 text-left hover:opacity-90 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">Articles</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">{blogs.length} Posts ({blogCategories.length} Cats)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSidebarTab('vcard')}
                    className="flex items-center gap-3 text-left hover:opacity-90 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                      <Nfc className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">Smart Identity</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">{completenessPercent}% Ready</div>
                    </div>
                  </button>
                </div>

                {/* Signature Gradient Progress Accent Bar */}
                <div className="h-1.5 w-full bg-white/[0.04]">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-500"
                    style={{ width: `${completenessPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

        {/* ==================================================================== */}
        {/* TAB 1: PROJECTS MANAGEMENT (CRUD) */}
        {/* ==================================================================== */}
        {activeTab === 'projects' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-grow">
                {/* Search Bar */}
                <div className="relative min-w-[240px] max-w-xs flex-grow">
                  <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#12151C] border border-white/10 text-xs font-mono text-white placeholder:text-white/30 focus:border-[var(--color-accent)] focus:outline-none"
                  />
                  {projectSearch && (
                    <button
                      onClick={() => setProjectSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Type */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {['All', 'Automation', 'API', 'Performance', 'Manual'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setProjectTypeFilter(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                        projectTypeFilter === type
                          ? 'bg-white/15 text-white font-bold border border-white/20'
                          : 'bg-white/5 text-[#9CA3AF] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Project CTA */}
              <button
                onClick={handleOpenAddProject}
                className="shimmer inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono text-xs font-bold shadow-lg shadow-[var(--color-accent)]/20 transition-all hover:scale-105 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Project</span>
              </button>
            </div>

            {/* Projects List */}
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[#12151C] border border-white/10 space-y-3">
                <Layers className="w-8 h-8 text-[#9CA3AF] mx-auto" />
                <h3 className="font-display font-bold text-lg text-white">No projects found</h3>
                <p className="text-xs font-mono text-[#9CA3AF] max-w-sm mx-auto">
                  Try adjusting your search criteria or create your first custom project using the button above.
                </p>
                <button
                  onClick={handleOpenAddProject}
                  className="inline-flex items-center space-x-1.5 text-xs font-mono text-[var(--color-accent)] hover:underline pt-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Project</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredProjects.map((project, idx) => {
                  const originalIndex = projects.findIndex(p => p.id === project.id);
                  return (
                    <div
                      key={project.id}
                      className="group bg-[#12151C] border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all shadow-md hover:shadow-xl space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-4 flex-grow">
                          {project.image && (
                            <img
                              src={project.image}
                              alt={project.title}
                              className="w-24 h-16 rounded-xl object-cover border border-white/15 shrink-0 hidden sm:block bg-[#080B12]"
                            />
                          )}
                          <div className="space-y-1.5 flex-grow">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold tracking-wider ${
                                project.type === 'Automation'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : project.type === 'API'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                  : project.type === 'Performance'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}>
                                {project.type}
                              </span>
                              <h3 className="font-display font-bold text-lg text-white group-hover:text-[var(--color-accent)] transition-colors">
                                {project.title}
                              </h3>
                            </div>
                            <p className="text-xs text-[#D1D5DB] font-light leading-relaxed max-w-3xl">
                              {project.description}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          {/* Reorder Buttons */}
                          <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5 mr-1">
                            <button
                              onClick={() => handleMoveProject(originalIndex, 'up')}
                              disabled={originalIndex === 0}
                              className="p-1.5 text-[#9CA3AF] hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveProject(originalIndex, 'down')}
                              disabled={originalIndex === projects.length - 1}
                              className="p-1.5 text-[#9CA3AF] hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleDuplicateProject(project)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white transition-colors cursor-pointer border border-white/10"
                            title="Duplicate Project"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditProject(project)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors cursor-pointer border border-blue-500/20"
                            title="Edit Project"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setConfirmDelete({ type: 'project', id: project.id, title: project.title })}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer border border-red-500/20"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {project.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-[#9CA3AF]"
                          >
                            {tag}
                          </span>
                        ))}
                        {project.link && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] font-mono text-[var(--color-accent)] hover:underline ml-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Repository</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: EXPERIENCE MANAGEMENT (CRUD) */}
        {/* ==================================================================== */}
        {activeTab === 'experience' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Professional Work Milestones ({experiences.length})
                </h3>
                <p className="text-xs font-mono text-[#9CA3AF]">
                  Manage companies, positions, tenures, and bulleted accomplishment highlights.
                </p>
              </div>

              <button
                onClick={handleOpenAddExperience}
                className="shimmer inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Experience</span>
              </button>
            </div>

            <div className="space-y-4">
              {experiences.map((exp, idx) => (
                <div
                  key={exp.id || idx}
                  className="bg-[#12151C] border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all shadow-md space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-bold text-base text-white">
                          {exp.role}
                        </span>
                        <span className="text-xs font-mono text-[var(--color-accent)]">
                          @ {exp.company}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#9CA3AF]">
                        <span>📅 {exp.period}</span>
                        {exp.location && <span>📍 {exp.location}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-start">
                      <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5 mr-1">
                        <button
                          onClick={() => handleMoveExperience(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 text-[#9CA3AF] hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveExperience(idx, 'down')}
                          disabled={idx === experiences.length - 1}
                          className="p-1.5 text-[#9CA3AF] hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleOpenEditExperience(exp)}
                        className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors cursor-pointer border border-blue-500/20"
                        title="Edit Experience"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setConfirmDelete({ type: 'experience', id: exp.id, title: `${exp.role} at ${exp.company}` })}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer border border-red-500/20"
                        title="Delete Experience"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Highlights list */}
                  <ul className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                    {exp.highlights.map((h, hIdx) => (
                      <li key={hIdx} className="text-xs text-[#D1D5DB] flex items-start space-x-2">
                        <span className="text-[var(--color-accent)] font-bold mt-0.5">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PROFESSIONAL REFERENCES MANAGEMENT (CRUD) */}
        {/* ==================================================================== */}
        {activeTab === 'references' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Professional References ({references.length})
                </h3>
                <p className="text-xs font-mono text-[#9CA3AF]">
                  Manage endorsement text and reference contact details shown on the portfolio and resume.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingReference(null);
                  setReferenceForm({ name: '', role: '', company: '', email: '', phone: '', endorsement: '' });
                  setReferenceFormOpen(true);
                }}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Reference</span>
              </button>
            </div>

            {referenceFormOpen && (
              <form onSubmit={handleSaveReference} className="bg-[#12151C] border border-cyan-500/30 rounded-2xl p-5 space-y-4">
                <h4 className="font-display font-bold text-white">{editingReference ? 'Edit Reference' : 'New Reference'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    ['name', 'Name'],
                    ['role', 'Role / Title'],
                    ['company', 'Company'],
                    ['email', 'Email'],
                    ['phone', 'Phone'],
                  ] as const).map(([field, label]) => (
                    <label key={field} className="space-y-1.5 text-xs font-mono text-[#9CA3AF]">
                      <span>{label}</span>
                      <input
                        required
                        type={field === 'email' ? 'email' : 'text'}
                        value={referenceForm[field]}
                        onChange={e => setReferenceForm(current => ({ ...current, [field]: e.target.value }))}
                        className="w-full bg-[#0B0D12] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
                      />
                    </label>
                  ))}
                  <label className="space-y-1.5 text-xs font-mono text-[#9CA3AF] sm:col-span-2">
                    <span>Endorsement</span>
                    <textarea
                      value={referenceForm.endorsement}
                      onChange={e => setReferenceForm(current => ({ ...current, endorsement: e.target.value }))}
                      rows={3}
                      className="w-full bg-[#0B0D12] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500 resize-y"
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setReferenceFormOpen(false)} className="px-4 py-2 rounded-lg bg-white/5 text-[#D1D5DB] text-xs font-mono hover:bg-white/10">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-xs font-mono font-bold hover:bg-cyan-500">Save Reference</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {references.map(reference => (
                <article key={reference.id} className="bg-[#12151C] border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-display font-bold text-white">{reference.name}</h4>
                      <p className="text-sm text-cyan-400">{reference.role} · {reference.company}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditReference(reference)} title="Edit reference" className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDelete({ type: 'reference', id: reference.id, title: reference.name })} title="Delete reference" className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-xs font-mono text-[#9CA3AF]">{reference.email} · {reference.phone}</p>
                  {reference.endorsement && <p className="text-sm text-[#D1D5DB] italic">{reference.endorsement}</p>}
                </article>
              ))}
              {references.length === 0 && !referenceFormOpen && (
                <p className="text-sm text-[#9CA3AF]">No references yet. Use Add Reference to create one.</p>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* CAREER ROADMAP MANAGEMENT (CRUD + ACTIVE STEP SELECTION) */}
        {/* ==================================================================== */}
        {activeTab === 'roadmap' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Career Roadmap Flow ({careerRoadmap.length})
                </h3>
                <p className="text-xs font-mono text-[#9CA3AF]">
                  Edit or remove milestones and select which step is currently active on the public portfolio.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingRoadmapItem(null);
                  setRoadmapForm({ title: '', status: 'future', badge: '' });
                  setRoadmapFormOpen(true);
                }}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Roadmap Step</span>
              </button>
            </div>

            {roadmapFormOpen && (
              <form onSubmit={handleSaveRoadmapItem} className="bg-[#12151C] border border-indigo-500/30 rounded-2xl p-5 space-y-4">
                <h4 className="font-display font-bold text-white">{editingRoadmapItem ? 'Edit Roadmap Step' : 'New Roadmap Step'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs font-mono text-[#9CA3AF]">
                    <span>Career step</span>
                    <input
                      required
                      value={roadmapForm.title}
                      onChange={e => setRoadmapForm(current => ({ ...current, title: e.target.value }))}
                      className="w-full bg-[#0B0D12] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-mono text-[#9CA3AF]">
                    <span>Status</span>
                    <select
                      value={roadmapForm.status}
                      onChange={e => setRoadmapForm(current => ({ ...current, status: e.target.value as CareerRoadmapItem['status'] }))}
                      className="w-full bg-[#0B0D12] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                    >
                      <option value="completed">Completed</option>
                      <option value="active">Active — selected current step</option>
                      <option value="future">Future</option>
                      <option value="vision">Ultimate vision</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-xs font-mono text-[#9CA3AF] sm:col-span-2">
                    <span>Badge (optional)</span>
                    <input
                      value={roadmapForm.badge || ''}
                      onChange={e => setRoadmapForm(current => ({ ...current, badge: e.target.value }))}
                      placeholder="For example: Active or Ultimate Goal"
                      className="w-full bg-[#0B0D12] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setRoadmapFormOpen(false)} className="px-4 py-2 rounded-lg bg-white/5 text-[#D1D5DB] text-xs font-mono hover:bg-white/10">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-mono font-bold hover:bg-indigo-500">Save Step</button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {careerRoadmap.map((item, index) => (
                <article key={item.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#12151C] border rounded-2xl p-4 ${item.status === 'active' ? 'border-[var(--color-accent)]/50' : 'border-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[#9CA3AF]">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h4 className="font-display font-bold text-white">{item.title}</h4>
                      <p className={`text-[10px] font-mono uppercase tracking-wider ${item.status === 'active' ? 'text-[var(--color-accent)]' : 'text-[#9CA3AF]'}`}>
                        {item.status}{item.badge ? ` · ${item.badge}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button onClick={() => handleEditRoadmapItem(item)} title="Edit roadmap step / select active status" className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmDelete({ type: 'roadmap', id: item.id, title: item.title })} title="Delete roadmap step" className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </article>
              ))}
              {careerRoadmap.length === 0 && !roadmapFormOpen && (
                <p className="text-sm text-[#9CA3AF]">No roadmap steps yet. Use Add Roadmap Step to create one.</p>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: SKILLS MANAGEMENT (CRUD) */}
        {/* ==================================================================== */}
        {activeTab === 'skills' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Technical SQA Skills ({skills.length} Categories • {totalSkillItems} items)
                </h3>
                <p className="text-xs font-mono text-[#9CA3AF]">
                  Create categories, rename, add single chips, or remove competencies instantly.
                </p>
              </div>

              <button
                onClick={handleOpenAddCategory}
                className="shimmer inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Skill Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map((cat, catIdx) => (
                <div
                  key={catIdx}
                  className="bg-[#12151C] border border-white/10 rounded-2xl p-5 space-y-4 shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <h4 className="font-display font-bold text-base text-white">
                          {cat.category}
                        </h4>
                        <span className="text-[10px] font-mono text-[#9CA3AF] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                          {cat.items.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditCategory(catIdx)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400 cursor-pointer"
                          title="Rename Category & Bulk Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: 'skillCategory', index: catIdx, title: cat.category })}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-red-400 cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Skill chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {cat.items.map((item, itemIdx) => (
                        <span
                          key={itemIdx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-[#D1D5DB] group hover:border-[var(--color-accent)]/50 transition-colors"
                        >
                          <span>{item}</span>
                          <button
                            onClick={() => handleRemoveSkillItem(catIdx, itemIdx, item)}
                            className="text-[#9CA3AF] hover:text-red-400 cursor-pointer"
                            title={`Remove ${item}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick Add Chip input */}
                  <div className="pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={quickSkillInput[catIdx] || ''}
                        onChange={(e) => setQuickSkillInput({ ...quickSkillInput, [catIdx]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddQuickSkill(catIdx);
                          }
                        }}
                        placeholder={`+ Add skill to ${cat.category}...`}
                        className="flex-grow px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white placeholder:text-white/20 focus:border-emerald-400 focus:outline-none"
                      />
                      <button
                        onClick={() => handleAddQuickSkill(catIdx)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-mono cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: BLOGS & ARTICLES MANAGEMENT (CLEAN EDITORIAL WORKFLOW — NO SEPARATE LOCKS) */}
        {/* ==================================================================== */}
        {activeTab === 'blogs' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Editorial Publishing & Status Console */}
            <div className="p-5 rounded-2xl bg-[#0E1320] border border-white/[0.08] shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-white text-base">
                    Editorial Publishing &amp; Draft Studio
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Published articles are cleanly readable by all visitors without lock prompts. Drafts stay private inside this CMS until published.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Editorial Status Filter Tabs */}
                <div className="inline-flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono">
                  {(
                    [
                      { id: 'All' as const, label: `All (${blogs.length})` },
                      { id: 'Published' as const, label: `Published (${publishedBlogsCount})` },
                      { id: 'Draft' as const, label: `Drafts (${draftBlogsCount})` },
                    ]
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBlogStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        blogStatusFilter === tab.id
                          ? 'bg-purple-600 text-white font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {draftBlogsCount > 0 && (
                  <button
                    type="button"
                    onClick={handlePublishAllDrafts}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                    title="Publish all saved drafts live"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Publish All Drafts</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigateTo('/blog')}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/[0.08] font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open Public Blog</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-grow">
                {/* Search Bar */}
                <div className="relative min-w-[240px] max-w-xs flex-grow">
                  <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={blogSearch}
                    onChange={(e) => setBlogSearch(e.target.value)}
                    placeholder="Search articles..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#12151C] border border-white/10 text-xs font-mono text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
                  />
                  {blogSearch && (
                    <button
                      onClick={() => setBlogSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter & Create Category */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1 sm:pb-0">
                  {['All', ...blogCategories].map((cat) => (
                    <div key={cat} className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => setBlogCategoryFilter(cat)}
                        className={`px-3 py-1.5 text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                          cat !== 'All' ? 'rounded-l-lg' : 'rounded-lg'
                        } ${
                          blogCategoryFilter === cat
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-white/5 text-[#9CA3AF] hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                      {cat !== 'All' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomBlogCategory(cat)}
                          className={`px-1.5 py-1.5 rounded-r-lg text-xs font-mono transition-colors border-l border-black/20 cursor-pointer ${
                            blogCategoryFilter === cat
                              ? 'bg-purple-700 text-white/80 hover:text-white'
                              : 'bg-white/5 text-[#6B7280] hover:text-red-400 hover:bg-red-500/10'
                          }`}
                          title={`Remove "${cat}" category`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Inline Create Category Control */}
                  {isCreatingBlogCategory ? (
                    <form onSubmit={handleAddCustomBlogCategory} className="inline-flex items-center gap-1.5 ml-1">
                      <input
                        type="text"
                        value={newBlogCategoryName}
                        onChange={(e) => setNewBlogCategoryName(e.target.value)}
                        placeholder="Category name..."
                        autoFocus
                        className="px-2.5 py-1 rounded-lg bg-[#12151C] border border-purple-500/50 text-xs font-mono text-white placeholder:text-white/30 focus:border-purple-400 focus:outline-none w-36"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingBlogCategory(false);
                          setNewBlogCategoryName('');
                        }}
                        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCreatingBlogCategory(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-mono font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Create a new blog category"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Category</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add Blog CTA */}
              <button
                onClick={handleOpenAddBlog}
                className="shimmer inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold shadow-lg shadow-purple-600/20 transition-all hover:scale-105 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Article</span>
              </button>
            </div>

            {/* Blogs List */}
            {filteredBlogs.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[#12151C] border border-white/10 space-y-3">
                <BookOpen className="w-8 h-8 text-[#9CA3AF] mx-auto" />
                <h3 className="font-display font-bold text-lg text-white">No articles found</h3>
                <p className="text-xs font-mono text-[#9CA3AF] max-w-sm mx-auto">
                  Start drafting technical articles, guides, and engineering reflections.
                </p>
                <button
                  onClick={handleOpenAddBlog}
                  className="inline-flex items-center space-x-1.5 text-xs font-mono text-purple-400 hover:underline pt-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Write Article</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredBlogs.map((post) => {
                  const isDraft = post.status === 'Draft';
                  return (
                    <div
                      key={post.id}
                      className="bg-[#12151C] border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all shadow-md space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-grow">
                          {post.coverImage && (
                            <img
                              src={post.coverImage}
                              alt={post.title}
                              className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0 hidden sm:block"
                            />
                          )}
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold uppercase">
                                {post.category}
                              </span>
                              <span className="text-xs font-mono text-[#9CA3AF]">
                                {post.readingTime}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleBlogStatus(post.id)}
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                                  isDraft
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                }`}
                                title={
                                  isDraft
                                    ? 'Saved as Private Draft — Click to Publish Live'
                                    : 'Published Live on Site — Click to Move to Draft'
                                }
                              >
                                {isDraft ? (
                                  <EyeOff className="w-3 h-3 text-amber-400" />
                                ) : (
                                  <Globe className="w-3 h-3 text-emerald-400" />
                                )}
                                <span>{isDraft ? 'Draft (Private)' : 'Published (Live)'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleBlogFeatured(post.id)}
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                                  post.featured
                                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35 hover:bg-indigo-500/25'
                                    : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.08]'
                                }`}
                                title={post.featured ? 'Featured on Hero Banner — Click to Unfeature' : 'Click to Feature in Hero Banner'}
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>{post.featured ? 'Featured' : 'Set Featured'}</span>
                              </button>
                            </div>

                            <h4 className="font-display font-bold text-lg text-white hover:text-purple-400 transition-colors">
                              {post.title}
                            </h4>

                            <p className="text-xs text-[#D1D5DB] font-light leading-relaxed max-w-3xl line-clamp-2">
                              {post.description || post.content.slice(0, 150)}...
                            </p>

                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {post.tags.map((tag, tIdx) => (
                                <span key={tIdx} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[#9CA3AF]">
                                  #{tag}
                                </span>
                              ))}
                              <span className="text-[10px] font-mono text-[#9CA3AF] ml-2">
                                Slug: /blog/{post.slug}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          <button
                            onClick={() => navigateTo(`/blog/${post.slug}`)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white transition-colors cursor-pointer border border-white/10"
                            title={isDraft ? 'Preview Draft Article' : 'Open Live Article'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditBlog(post)}
                            className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors cursor-pointer border border-purple-500/20"
                            title="Edit Article"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setConfirmDelete({ type: 'blog', id: post.id, title: post.title })}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer border border-red-500/20"
                            title="Delete Article"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB: RESUME & ATS CV MANAGEMENT */}
        {/* ==================================================================== */}
        {activeTab === 'resume' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Resume Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12151C] border border-rose-500/30 rounded-3xl p-6 shadow-xl">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-xl text-white">
                      Resume & ATS CV Management
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>ATS Score: 96%</span>
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#9CA3AF] mt-1">
                    Manage ATS templates, career objectives, target specializations, and project inclusions for Curriculum Vitae generation.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {onOpenResumeBuilder && (
                  <button
                    onClick={onOpenResumeBuilder}
                    className="shimmer inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-lg shadow-rose-600/25 transition-all hover:scale-105 cursor-pointer"
                    title="Open the full interactive Resume Builder modal"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Launch Full Resume Builder</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (onOpenResumeBuilder) {
                      onOpenResumeBuilder();
                    } else {
                      showToast('Please use Resume Builder modal for one-click PDF generation.');
                    }
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-mono transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-rose-400" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Resume Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Preset, Objective, and Templates */}
              <div className="lg:col-span-7 space-y-6">
                {/* Specialization Preset Selector */}
                <div className="p-6 rounded-3xl bg-[#12151C] border border-white/10 space-y-4">
                  <h4 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-rose-400" />
                    <span>Target Specialization Presets</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'all-rounder', label: 'All-Rounder SQA' },
                      { id: 'automation-qa', label: 'Automation QA' },
                      { id: 'api-testing', label: 'API Testing' },
                      { id: 'manual-qa', label: 'Manual QA' }
                    ].map((role) => (
                      <button
                        key={role.id}
                        onClick={() => handleRolePresetSelect(role.id as TargetRoleType)}
                        className={`p-2.5 rounded-xl text-xs font-mono text-center transition-all cursor-pointer border ${
                          resumeRole === role.id
                            ? 'bg-rose-600/20 border-rose-500 text-rose-300 font-bold shadow-sm'
                            : 'bg-white/[0.03] border-white/10 text-[#9CA3AF] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>

                  {/* Career Objective Editor */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                        Career Objective Statement (ATS Tailored)
                      </label>
                      <button
                        onClick={() => {
                          setResumeObjective(DEFAULT_CAREER_OBJECTIVE);
                          showToast('Reset objective to default.');
                        }}
                        className="text-[11px] font-mono text-[#9CA3AF] hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reset Objective</span>
                      </button>
                    </div>
                    <textarea
                      value={resumeObjective}
                      onChange={(e) => setResumeObjective(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-sans text-white focus:border-rose-400 focus:outline-none leading-relaxed"
                      placeholder="Write your career objective..."
                    />
                  </div>
                </div>

                {/* ATS Template & Typography */}
                <div className="p-6 rounded-3xl bg-[#12151C] border border-white/10 space-y-4">
                  <h4 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-rose-400" />
                    <span>ATS Layout & Typography Engine</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-[#D1D5DB]">Template Architecture</label>
                      <select
                        value={resumeTemplate}
                        onChange={(e) => setResumeTemplate(e.target.value as TemplateType)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white focus:border-rose-400 focus:outline-none"
                      >
                        <option value="classic-ats" className="bg-[#12151C]">Classic ATS Single-Column (Standard)</option>
                        <option value="modern-pro" className="bg-[#12151C]">Modern Professional</option>
                        <option value="minimal" className="bg-[#12151C]">Minimalist Clean</option>
                        <option value="executive" className="bg-[#12151C]">Executive Leadership</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-[#D1D5DB]">Typography Font</label>
                      <select
                        value={resumeFont}
                        onChange={(e) => setResumeFont(e.target.value as AtsFontFamily)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white focus:border-rose-400 focus:outline-none"
                      >
                        <option value="modern" className="bg-[#12151C]">Modern Sans (Inter / Clean)</option>
                        <option value="serif" className="bg-[#12151C]">Serif Classic (Georgia)</option>
                        <option value="corporate" className="bg-[#12151C]">Corporate Clean (System)</option>
                      </select>
                    </div>
                  </div>

                  {/* ATS Checklist */}
                  <div className="pt-2 border-t border-white/[0.06] space-y-2">
                    <span className="text-xs font-mono text-[#9CA3AF] font-semibold">ATS Compliance Checklist:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-[#D1D5DB]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Single-column ATS scanner friendly</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Playwright & Python automation terms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>REST API & Postman verification</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Quantified defect reduction metrics</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Project Selection & Live Resume Summary */}
              <div className="lg:col-span-5 space-y-6">
                {/* Project Inclusion Selection */}
                <div className="p-6 rounded-3xl bg-[#12151C] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-display font-bold text-white flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-rose-400" />
                      <span>Projects Included in Resume ({resumeSelectedProjectIds.length}/{projects.length})</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setResumeSelectedProjectIds(projects.map(p => p.id))}
                        className="text-[11px] font-mono text-rose-400 hover:underline cursor-pointer"
                      >
                        All
                      </button>
                      <span className="text-white/20">|</span>
                      <button
                        onClick={() => setResumeSelectedProjectIds([])}
                        className="text-[11px] font-mono text-[#9CA3AF] hover:text-white cursor-pointer"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {projects.map((proj) => {
                      const isSelected = resumeSelectedProjectIds.includes(proj.id);
                      return (
                        <div
                          key={proj.id}
                          onClick={() => toggleResumeProject(proj.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-rose-950/20 border-rose-500/40 text-white'
                              : 'bg-white/[0.02] border-white/5 text-[#9CA3AF] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs font-mono font-bold truncate">{proj.title}</p>
                            <span className="text-[10px] font-mono text-[#9CA3AF]">{proj.type} • {proj.tags.slice(0, 3).join(', ')}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Candidate CV Summary Preview Card */}
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3 font-mono">
                  <div className="text-xs text-[#9CA3AF] uppercase font-bold tracking-wider flex items-center justify-between">
                    <span>Curriculum Vitae Header</span>
                    <span className="text-emerald-400">Ready</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                    <p className="text-base font-bold text-white font-display">{profile.name || PERSONAL_INFO.name}</p>
                    <p className="text-[var(--color-accent)] font-semibold">{profile.title || PERSONAL_INFO.title}</p>
                    <p className="text-[#9CA3AF] text-[11px]">
                      {profile.email || PERSONAL_INFO.email} • {profile.phone || PERSONAL_INFO.phone}
                    </p>
                    <p className="text-[#9CA3AF] text-[11px]">
                      {profile.location || PERSONAL_INFO.location}
                    </p>
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#D1D5DB]">
                      <span>Experience: {profile.experienceYears || '2'} Years</span>
                      <span className="text-rose-400 font-bold">{resumeRole.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB: COVER LETTER SUITE */}
        {/* ==================================================================== */}
        {activeTab === 'cover-letter' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Top Cover Letter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12151C] border border-indigo-500/30 rounded-3xl p-6 shadow-xl">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-xl text-white">
                      AI Cover Letter Application Suite
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      <span>Target Match: 94%</span>
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#9CA3AF] mt-1">
                    Generate and customize tailored SQA job application cover letters with targeted company data and testing metrics.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {onOpenCoverLetter && (
                  <button
                    onClick={onOpenCoverLetter}
                    className="shimmer inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 cursor-pointer"
                    title="Open full Cover Letter Studio modal"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Launch Cover Letter Studio</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const text = clCustomContent || generateAdminCoverLetter(clCompany, clJobTitle, clHiringManager, clLocation, clTone);
                    navigator.clipboard.writeText(text);
                    showToast('Cover Letter copied to clipboard!');
                  }}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-mono transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Copy Letter</span>
                </button>
              </div>
            </div>

            {/* Cover Letter Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Settings */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 rounded-3xl bg-[#12151C] border border-white/10 space-y-4">
                  <h4 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>Target Job & Company Settings</span>
                  </h4>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="space-y-1">
                      <label className="text-[#D1D5DB] font-semibold">Target Company Name *</label>
                      <input
                        type="text"
                        value={clCompany}
                        onChange={(e) => {
                          setClCompany(e.target.value);
                          setClCustomContent('');
                        }}
                        placeholder="e.g. Brain Station 23 / Tech Corp"
                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:border-indigo-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#D1D5DB] font-semibold">Job Title *</label>
                      <input
                        type="text"
                        value={clJobTitle}
                        onChange={(e) => {
                          setClJobTitle(e.target.value);
                          setClCustomContent('');
                        }}
                        placeholder="e.g. Software Quality Assurance Engineer"
                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:border-indigo-400 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[#D1D5DB] font-semibold">Hiring Manager</label>
                        <input
                          type="text"
                          value={clHiringManager}
                          onChange={(e) => {
                            setClHiringManager(e.target.value);
                            setClCustomContent('');
                          }}
                          placeholder="e.g. Hiring Manager"
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:border-indigo-400 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[#D1D5DB] font-semibold">Location</label>
                        <input
                          type="text"
                          value={clLocation}
                          onChange={(e) => {
                            setClLocation(e.target.value);
                            setClCustomContent('');
                          }}
                          placeholder="e.g. Remote / Dhaka"
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:border-indigo-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[#D1D5DB] font-semibold">Letter Tone</label>
                        <select
                          value={clTone}
                          onChange={(e) => {
                            setClTone(e.target.value as CoverLetterTone);
                            setClCustomContent('');
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:border-indigo-400 focus:outline-none"
                        >
                          <option value="professional" className="bg-[#12151C]">Professional (Balanced)</option>
                          <option value="formal" className="bg-[#12151C]">Formal (Enterprise)</option>
                          <option value="enthusiastic" className="bg-[#12151C]">Enthusiastic (Startup)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[#D1D5DB] font-semibold">Design Layout</label>
                        <select
                          value={clTemplate}
                          onChange={(e) => setClTemplate(e.target.value as CoverLetterTemplate)}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:border-indigo-400 focus:outline-none"
                        >
                          <option value="modern-executive" className="bg-[#12151C]">Modern Executive</option>
                          <option value="classic-corporate" className="bg-[#12151C]">Classic Corporate</option>
                          <option value="minimalist-tech" className="bg-[#12151C]">Minimalist Tech</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SQA Keyword Alignment Analysis */}
                <div className="p-6 rounded-3xl bg-[#12151C] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Targeted SQA Qualifications</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">94% Match</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Playwright Automation',
                      'Python Test Scripts',
                      'REST API Testing (Postman)',
                      'Newman CLI',
                      'Jira Defect Lifecycle',
                      'STLC & Agile',
                      'Regression Testing',
                      'CI/CD Pipelines'
                    ].map((kw, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono text-indigo-300"
                      >
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Cover Letter Output & Editor */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-6 rounded-3xl bg-[#12151C] border border-white/10 space-y-4 flex flex-col h-full">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                        Tailored Cover Letter Preview & Editor
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-[#9CA3AF]">
                        {clCompany}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setClCustomContent('');
                          showToast('Regenerated letter from application settings.');
                        }}
                        className="text-[11px] font-mono text-[#9CA3AF] hover:text-indigo-400 cursor-pointer flex items-center gap-1"
                        title="Re-generate from settings"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Regenerate</span>
                      </button>
                      <button
                        onClick={() => {
                          const text = clCustomContent || generateAdminCoverLetter(clCompany, clJobTitle, clHiringManager, clLocation, clTone);
                          navigator.clipboard.writeText(text);
                          showToast('Cover letter copied!');
                        }}
                        className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Text</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={clCustomContent || generateAdminCoverLetter(clCompany, clJobTitle, clHiringManager, clLocation, clTone)}
                    onChange={(e) => setClCustomContent(e.target.value)}
                    rows={17}
                    className="w-full flex-grow p-4 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono text-[#F3F4F6] focus:border-indigo-400 focus:outline-none leading-relaxed resize-y font-sans sm:text-xs"
                    placeholder="Cover letter text will appear here..."
                  />

                  <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
                    <span>Words: {(clCustomContent || generateAdminCoverLetter(clCompany, clJobTitle, clHiringManager, clLocation, clTone)).split(/\s+/).filter(Boolean).length}</span>
                    <span>Ready for submission with SQA portfolio credentials</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 5: PROFILE & BIO MANAGEMENT (CRUD) */}
        {/* ==================================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Profile Details & Live Portfolio Headline Metrics
                </h3>
                <p className="text-xs font-mono text-[#9CA3AF]">
                  Changes here immediately update the Hero section, contact links, and about details across the entire portfolio.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="bg-[#12151C] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              {/* Personal Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                    Professional Title *
                  </label>
                  <input
                    type="text"
                    value={profile.title}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Direct Profile Photo Upload and Location */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="lg:col-span-7">
                  <ImageUploadField
                    label="Profile Photo (Direct File Upload)"
                    value={profile.avatar}
                    onChange={(uploadedUrl) => {
                      const nextProfile = { ...profile, avatar: uploadedUrl };
                      setProfile(nextProfile);
                      updateStoredProfile(nextProfile);
                      showToast('Profile photo updated across portfolio!');
                    }}
                    shape="square"
                    accentColor="cyan"
                    uploadOptions={{ maxWidth: 900, maxHeight: 900 }}
                    helperText="Upload directly from your computer or mobile gallery (JPG, PNG, WebP)"
                  />
                </div>

                <div className="lg:col-span-5 space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Contacts & Social Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    Phone
                  </label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5 text-cyan-400" />
                    GitHub Link
                  </label>
                  <input
                    type="text"
                    value={profile.github}
                    onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
                    <Linkedin className="w-3.5 h-3.5 text-cyan-400" />
                    LinkedIn Link
                  </label>
                  <input
                    type="text"
                    value={profile.linkedin}
                    onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Career Objective / Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                  Career Objective / Bio Summary
                </label>
                <textarea
                  value={profile.objective}
                  onChange={(e) => setProfile({ ...profile, objective: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-sans text-white focus:border-cyan-400 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Headline Statistics Grid */}
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <h4 className="text-xs font-mono text-[#9CA3AF] uppercase font-bold tracking-wider">
                  Headline Statistics (Hero Section Cards)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#D1D5DB]">Experience</label>
                    <input
                      type="text"
                      value={profile.experienceYears}
                      onChange={(e) => setProfile({ ...profile, experienceYears: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#D1D5DB]">Test Cases</label>
                    <input
                      type="text"
                      value={profile.testCasesCount}
                      onChange={(e) => setProfile({ ...profile, testCasesCount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#D1D5DB]">Bugs Reported</label>
                    <input
                      type="text"
                      value={profile.bugsReportedCount}
                      onChange={(e) => setProfile({ ...profile, bugsReportedCount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#D1D5DB]">Automation Scripts</label>
                    <input
                      type="text"
                      value={profile.automationScriptsCount}
                      onChange={(e) => setProfile({ ...profile, automationScriptsCount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#D1D5DB]">Defect Detection</label>
                    <input
                      type="text"
                      value={profile.defectDetectionRate}
                      onChange={(e) => setProfile({ ...profile, defectDetectionRate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end pt-4 border-t border-white/10">
                <button
                  type="submit"
                  className="shimmer inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-600/25 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile & Headline Metrics</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 7: VISITING CARD & NFC MANAGEMENT (CRUD & GLOBAL IDENTITY) */}
        {/* ==================================================================== */}
        {activeTab === 'vcard' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top Overview & Action Bar */}
            <div className="bg-[#12151C] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="flex items-start space-x-4">
                  <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                    <Nfc className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-display font-bold text-xl sm:text-2xl text-white">
                        Virtual Visiting Card &amp; NFC Studio
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Live Sync
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#9CA3AF] max-w-2xl leading-relaxed">
                      সম্পূর্ণ স্মার্ট ভিজিটিং কার্ড, টিম মেম্বার প্রোফাইল, গ্লোবাল ব্র্যান্ডিং, কিউআর কোড ও পাবলিক প্রাইভেসি কন্ট্রোল পরিচালনা করুন।
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleOpenAddCard}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন কার্ড যোগ করুন</span>
                  </button>

                  <button
                    onClick={() => setIsVisitingCardModalOpen(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-semibold border border-white/15 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>লাইভ কার্ড প্রিভিউ</span>
                  </button>

                  <button
                    onClick={handleResetCards}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                    title="রিসেট ডিফল্ট কার্ড"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SECTION A: GLOBAL BRAND IDENTITY & NFC CONFIG */}
              <form onSubmit={handleSaveVcardConfig} className="space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-bold text-base text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>গ্লোবাল ব্র্যান্ড ও কার্ড সেটিংস (Global Brand Identity)</span>
                  </h4>
                  <span className="text-[11px] font-mono text-[#9CA3AF]">
                    এই তথ্য কার্ডের মূল ব্র্যান্ড ও ভেরিফিকেশন হিসেবে প্রদর্শিত হবে
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Company EN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#D1D5DB]">Company Name (English) *</label>
                    <input
                      type="text"
                      value={vcardConfig.company}
                      onChange={(e) => setVcardConfig({ ...vcardConfig, company: e.target.value })}
                      required
                      placeholder="Altersense Ltd"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Company BN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#D1D5DB]">Company Name (Bengali)</label>
                    <input
                      type="text"
                      value={vcardConfig.companyBn}
                      onChange={(e) => setVcardConfig({ ...vcardConfig, companyBn: e.target.value })}
                      placeholder="অল্টারসেন্স লিমিটেড"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Department EN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#D1D5DB]">Department (English) *</label>
                    <input
                      type="text"
                      value={vcardConfig.department}
                      onChange={(e) => setVcardConfig({ ...vcardConfig, department: e.target.value })}
                      required
                      placeholder="Manual & automation Test"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Department BN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#D1D5DB]">Department (Bengali)</label>
                    <input
                      type="text"
                      value={vcardConfig.departmentBn}
                      onChange={(e) => setVcardConfig({ ...vcardConfig, departmentBn: e.target.value })}
                      placeholder="ম্যানুয়াল ও অটোমেশন টেস্ট"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Verified Badge */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#D1D5DB]">Verification Badge Label</label>
                    <input
                      type="text"
                      value={vcardConfig.verifiedBadge}
                      onChange={(e) => setVcardConfig({ ...vcardConfig, verifiedBadge: e.target.value })}
                      placeholder="SQA"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Permanent NFC Target URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#D1D5DB]">NFC &amp; QR Target URL</label>
                    <input
                      type="text"
                      value={vcardConfig.permanentUrl}
                      onChange={(e) => setVcardConfig({ ...vcardConfig, permanentUrl: e.target.value })}
                      placeholder="https://sabbir-sqa.vercel.app/#vcard"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-md cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>সংরক্ষণ করুন (Save Brand Settings)</span>
                  </button>
                </div>
              </form>

              {/* SECTION B: PRIVACY MATRIX */}
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <span>প্রাইভেসি ও পাবলিক ডেটা নিয়ন্ত্রণ (Privacy Controls)</span>
                    </h4>
                    <p className="text-xs text-[#9CA3AF]">
                      ভিজিটিং কার্ডে কোন তথ্য সর্বসাধারণের জন্য দৃশ্যমান বা মাস্ক থাকবে তা নির্বাচন করুন।
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { key: 'showPhone' as const, label: 'Show Phone', desc: 'ফোন নম্বর প্রদর্শন' },
                    { key: 'showEmail' as const, label: 'Show Email', desc: 'ইমেইল ঠিকানা প্রদর্শন' },
                    { key: 'showLocation' as const, label: 'Show Location', desc: 'লোকেশন প্রদর্শন' },
                    { key: 'showWhatsApp' as const, label: 'Show WhatsApp', desc: 'হোয়াটসঅ্যাপ প্রদর্শন' },
                    { key: 'maskContactInPublic' as const, label: 'Mask Public Info', desc: 'পাবলিক মাস্কিং (+880 16***-***06)' },
                  ].map((item) => (
                    <div 
                      key={item.key}
                      onClick={() => handleTogglePrivacySetting(item.key)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        vcardPrivacy[item.key]
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-white">{item.label}</span>
                        {vcardPrivacy[item.key] ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION C: TEAM & STAFF CARDS CRUD */}
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>টিম ও ইন্ডিভিজুয়াল কার্ড তালিকা ({teamCards.length})</span>
                    </h4>
                    <p className="text-xs text-[#9CA3AF]">
                      প্রতিটি কার্ড স্বাধীনভাবে এডিট, ডুপ্লিকেট অথবা ডিলিট করুন।
                    </p>
                  </div>

                  {/* Search Filter */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type="text"
                      value={cardSearchQuery}
                      onChange={(e) => setCardSearchQuery(e.target.value)}
                      placeholder="Search cards..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white placeholder:text-[#9CA3AF] focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTeamCards.map((card, idx) => (
                    <div
                      key={card.id}
                      className="p-4 rounded-2xl bg-[#090D18] border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                    >
                      {/* Card Header & Avatar */}
                      <div className="flex items-start space-x-3">
                        <img
                          src={card.avatar || '/sabbir_avatar.jpeg'}
                          alt={card.name}
                          className="w-12 h-12 rounded-xl object-cover border border-emerald-500/30 shadow-md shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="overflow-hidden space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <h5 className="font-display font-bold text-white text-sm truncate">
                              {card.name}
                            </h5>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-400 font-bold">
                                LEAD
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-cyan-400 truncate font-semibold">
                            {card.role}
                          </p>
                          <p className="text-[11px] text-[#9CA3AF] font-mono truncate">
                            {card.department}
                          </p>
                        </div>
                      </div>

                      {/* Contact Badges */}
                      <div className="space-y-1 text-[11px] font-mono text-slate-300 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <div className="flex items-center space-x-1.5 truncate">
                          <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{card.phone}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 truncate">
                          <Mail className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">{card.email}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                        <button
                          onClick={() => {
                            setIsVisitingCardModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-[11px] flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>প্রিভিউ</span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleDuplicateCard(card)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Duplicate Card"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleEditCard(card)}
                            className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors cursor-pointer"
                            title="Edit Card"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteCard(card)}
                            disabled={teamCards.length <= 1}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete Card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 8: SECURITY & MASTER LOCK SYSTEM (CENTRALIZED ACCESS CONTROL) */}
        {/* ==================================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-fadeIn">
            {/* EXECUTIVE COLOR VIEW & THEME STUDIO (EXCLUSIVE ADMIN CMS) */}
            <div className="bg-[#12151C] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="flex items-start space-x-4">
                  <div 
                    className="p-3.5 rounded-2xl border text-[var(--color-accent)]"
                    style={{
                      backgroundColor: 'rgba(var(--color-accent-rgb, 0, 210, 255), 0.15)',
                      borderColor: 'rgba(var(--color-accent-rgb, 0, 210, 255), 0.3)'
                    }}
                  >
                    <Palette className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-display font-bold text-xl sm:text-2xl text-white">
                        Portfolio Theme & Color Look Studio
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white border border-white/20">
                        Admin CMS Only
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#9CA3AF] max-w-2xl leading-relaxed">
                      Control the global portfolio look & feel. Changes apply live to all visitors across buttons, glows, borders, and navigation.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsThemeModalOpen(true)}
                  className="shimmer inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-black shadow-lg cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    boxShadow: '0 8px 20px -5px var(--color-accent-glow)'
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Open Full Palette Modal</span>
                </button>
              </div>

              {/* Theme Quick Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {Object.values(COLOR_THEMES).map((theme) => {
                  const isSelected = currentThemeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setCurrentThemeId(theme.id);
                        setAndApplyTheme(theme.id);
                        showToast(`Theme updated to ${theme.name}!`);
                      }}
                      className={`group p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-white/[0.08] shadow-lg' 
                          : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 hover:border-white/20'
                      }`}
                      style={{
                        borderColor: isSelected ? theme.primary : undefined,
                        boxShadow: isSelected ? `0 10px 25px -5px ${theme.glow}` : undefined
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span 
                            className="w-4 h-4 rounded-full border border-white/40 shadow-sm transition-transform group-hover:scale-110"
                            style={{
                              background: `linear-gradient(135deg, ${theme.primary}, ${theme.hover})`
                            }}
                          />
                          <span className="font-display font-bold text-xs text-white">
                            {theme.name}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                        )}
                      </div>
                      <p className="text-[10px] text-[#9CA3AF] font-sans leading-tight mt-1 line-clamp-2">
                        {theme.subtitle}
                      </p>
                      <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                        <span className="text-[#6B7280]">Hex:</span>
                        <span style={{ color: theme.primary }} className="font-bold">{theme.primary}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Permanent Google Cloud Firestore Sync */}
            <div className="bg-[#12151C] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-bold text-xl text-white">
                        Permanent Cloud Database Sync
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                          cloudStatus.isOwnerConnected
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {cloudStatus.isOwnerConnected ? 'Cloud Connected' : 'Connect Owner Account'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#9CA3AF] max-w-2xl leading-relaxed">
                      {cloudStatus.isOwnerConnected
                        ? `Linked as ${cloudStatus.ownerEmail}. Every project, blog article, category, skill, and uploaded image is saved permanently in Google Cloud Firestore across all rebuilds and deployments.`
                        : 'Link your verified Google owner account once so every project, blog article, and uploaded image is backed up permanently in Google Cloud Firestore and never resets on new builds.'}
                    </p>
                    {cloudStatus.lastSyncedAt && (
                      <p className="text-[11px] font-mono text-emerald-400/90">
                        Last Cloud Sync: {new Date(cloudStatus.lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {cloudStatus.isOwnerConnected ? (
                    <>
                      <button
                        type="button"
                        disabled={cloudStatus.isSyncing}
                        onClick={async () => {
                          const res = await syncAllLocalDataToCloud();
                          if (res.success) {
                            showToast(
                              `Synced ${res.projectsSynced} projects & ${res.blogsSynced} blogs to Cloud!`
                            );
                          } else if (res.error) {
                            showToast(res.error);
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${cloudStatus.isSyncing ? 'animate-spin' : ''}`}
                        />
                        <span>
                          {cloudStatus.isSyncing ? 'Syncing to Cloud...' : 'Sync All Data to Cloud'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await signOutOwnerFromGoogle();
                          showToast('Disconnected Google Cloud write session.');
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs cursor-pointer transition-colors"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await signInOwnerWithGoogle();
                        if (res.success) {
                          showToast(`Connected Cloud Sync as ${res.email || 'Owner'}!`);
                        } else if (res.error) {
                          showToast(res.error);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-lg shadow-emerald-600/20"
                    >
                      <Cloud className="w-4 h-4" />
                      <span>Connect Google Cloud Sync</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Dataset Backup, Import & Factory Default Reset */}
            <div className="bg-[#12151C] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="space-y-1 pb-4 border-b border-white/10">
                <h3 className="font-display font-bold text-xl text-white">
                  Portfolio Data Backup &amp; Restore
                </h3>
                <p className="text-xs font-mono text-[#9CA3AF]">
                  Export your complete portfolio dataset as JSON, restore a saved backup file, or reset to default baseline content.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono text-white font-bold flex items-center gap-2">
                      <Download className="w-4 h-4 text-blue-400" />
                      Export JSON Backup
                    </h4>
                    <p className="text-[11px] font-mono text-[#9CA3AF] leading-relaxed">
                      Download all custom projects, photos, milestones, skills, and articles in one JSON archive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="mt-2 w-full py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white font-mono text-xs font-bold cursor-pointer transition-colors"
                  >
                    Download Backup JSON
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono text-white font-bold flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      Restore JSON Backup
                    </h4>
                    <p className="text-[11px] font-mono text-[#9CA3AF] leading-relaxed">
                      Select a previously exported portfolio JSON file from your device to restore your data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 w-full py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white font-mono text-xs font-bold cursor-pointer transition-colors"
                  >
                    Upload Backup JSON
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono text-white font-bold flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      Factory Default Reset
                    </h4>
                    <p className="text-[11px] font-mono text-[#9CA3AF] leading-relaxed">
                      Restore the portfolio and blog articles to original baseline content (with confirmation).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ type: 'reset', title: 'Default Portfolio & Blog Dataset' })}
                    className="mt-2 w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-mono text-xs font-bold cursor-pointer transition-colors"
                  >
                    Reset All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODALS */}
      {/* ==================================================================== */}

      {/* Project Modal */}
      {isProjectModalOpen && (
        <ProjectModal
          isOpen={isProjectModalOpen}
          initialProject={editingProject}
          onClose={() => setIsProjectModalOpen(false)}
          onSave={handleSaveProject}
        />
      )}

      {/* Experience Modal */}
      {isExperienceModalOpen && (
        <ExperienceModal
          isOpen={isExperienceModalOpen}
          initialExperience={editingExperience}
          onClose={() => setIsExperienceModalOpen(false)}
          onSave={handleSaveExperience}
        />
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#12151C] border border-white/20 rounded-3xl p-6 space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-lg">
                {editingCategoryIndex !== null ? 'Edit Skill Category' : 'Add Skill Category'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-[#9CA3AF] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  placeholder="e.g. Mobile Testing, Security Auditing"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-mono text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center justify-between">
                  <span>Skills (comma-separated)</span>
                  <span className="text-[10px] text-[#9CA3AF]">Optional</span>
                </label>
                <textarea
                  value={categoryItemsInput}
                  onChange={(e) => setCategoryItemsInput(e.target.value)}
                  rows={4}
                  placeholder="Appium, Android Studio, Charles Proxy, Xcode Simulator"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs font-mono text-[#D1D5DB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blog Modal */}
      {isBlogModalOpen && (
        <BlogModal
          isOpen={isBlogModalOpen}
          initialBlog={editingBlog}
          onClose={() => setIsBlogModalOpen(false)}
          onSave={handleSaveBlog}
        />
      )}

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#12151C] border border-red-500/30 rounded-3xl p-6 space-y-4 text-white shadow-2xl">
            <div className="inline-flex p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-white">
                {confirmDelete.type === 'reset' ? 'Confirm Reset' : 'Confirm Deletion'}
              </h3>
              <p className="text-xs font-mono text-[#D1D5DB] leading-relaxed">
                {confirmDelete.type === 'reset' 
                  ? 'Are you sure you want to restore the default dataset? Any unsaved edits will be overridden.'
                  : `Are you sure you want to delete "${confirmDelete.title}"? This action will remove it immediately.`
                }
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#D1D5DB]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-lg shadow-red-600/20"
              >
                {confirmDelete.type === 'reset' ? 'Yes, Reset All' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme / Color View Selector Modal */}
      {isThemeModalOpen && (
        <ThemeSelectorModal
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
        />
      )}

      {/* Virtual Visiting Card & Smart NFC Suite Modal */}
      <VisitingCardModal
        isOpen={isVisitingCardModalOpen}
        onClose={() => setIsVisitingCardModalOpen(false)}
      />

      {/* Visiting Card Add/Edit Modal */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-2xl my-8 bg-[#12151C] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Nfc className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    {editingCard ? 'ভিজিটিং কার্ড এডিট করুন' : 'নতুন ভিজিটিং কার্ড তৈরি করুন'}
                  </h3>
                  <p className="text-xs text-[#9CA3AF] font-mono">
                    {editingCard ? `Editing ID: ${editingCard.id}` : 'Create a new staff or branch digital visiting card'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCardModalOpen(false);
                  setEditingCard(null);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB]">Full Name (English) *</label>
                  <input
                    type="text"
                    value={cardForm.name}
                    onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                    required
                    placeholder="Sabbir Ahamed"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB]">Full Name (Bengali)</label>
                  <input
                    type="text"
                    value={cardForm.nameBn}
                    onChange={(e) => setCardForm({ ...cardForm, nameBn: e.target.value })}
                    placeholder="সাব্বির আহমেদ"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB]">Role / Title (English) *</label>
                  <input
                    type="text"
                    value={cardForm.role}
                    onChange={(e) => setCardForm({ ...cardForm, role: e.target.value })}
                    required
                    placeholder="Software Quality Assurance Engineer"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB]">Role / Title (Bengali)</label>
                  <input
                    type="text"
                    value={cardForm.roleBn}
                    onChange={(e) => setCardForm({ ...cardForm, roleBn: e.target.value })}
                    placeholder="সফটওয়্যার কোয়ালিটি অ্যাসিউরেন্স ইঞ্জিনিয়ার"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB]">Department (English)</label>
                  <input
                    type="text"
                    value={cardForm.department}
                    onChange={(e) => setCardForm({ ...cardForm, department: e.target.value })}
                    placeholder="Manual & automation Test"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB]">Department (Bengali)</label>
                  <input
                    type="text"
                    value={cardForm.departmentBn}
                    onChange={(e) => setCardForm({ ...cardForm, departmentBn: e.target.value })}
                    placeholder="ম্যানুয়াল ও অটোমেশন টেস্ট"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB]">Phone Number *</label>
                  <input
                    type="tel"
                    value={cardForm.phone}
                    onChange={(e) => setCardForm({ ...cardForm, phone: e.target.value })}
                    required
                    placeholder="+8801681387906"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB]">Email Address *</label>
                  <input
                    type="email"
                    value={cardForm.email}
                    onChange={(e) => setCardForm({ ...cardForm, email: e.target.value })}
                    required
                    placeholder="sabbircse72@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Direct File Upload for Card Avatar */}
              <div className="space-y-2 pt-2 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setCardForm({ ...cardForm, avatar: profile.avatar || '/sabbir_avatar.jpeg' })}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-emerald-400 cursor-pointer"
                  >
                    Use Main Profile Photo
                  </button>
                </div>
                <ImageUploadField
                  label="Card Profile Photo"
                  value={cardForm.avatar}
                  onChange={(uploadedUrl) => setCardForm({ ...cardForm, avatar: uploadedUrl })}
                  shape="square"
                  accentColor="emerald"
                  uploadOptions={{ maxWidth: 800, maxHeight: 800 }}
                  helperText="Upload photo directly from your device (JPG, PNG, WebP)"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsCardModalOpen(false);
                    setEditingCard(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#D1D5DB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-600/25 cursor-pointer"
                >
                  {editingCard ? 'আপডেট করুন (Save Changes)' : 'কার্ড তৈরি করুন (Create Card)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// ============================================================================
// PROJECT MODAL COMPONENT
// ============================================================================

interface ProjectModalProps {
  isOpen: boolean;
  initialProject: Project | null;
  onClose: () => void;
  onSave: (projectData: Omit<Project, 'id'>) => void;
}

function ProjectModal({ isOpen: _isOpen, initialProject, onClose, onSave }: ProjectModalProps) {
  const [title, setTitle] = useState(initialProject?.title || '');
  const [type, setType] = useState<Project['type']>(initialProject?.type || 'Automation');
  const [link, setLink] = useState(initialProject?.link || '');
  const [image, setImage] = useState(initialProject?.image || '');
  const [description, setDescription] = useState(initialProject?.description || '');
  const [tagsString, setTagsString] = useState(initialProject?.tags.join(', ') || '');
  
  const [metrics, setMetrics] = useState<{ label: string; value: string }[]>(
    initialProject?.metrics || [
      { label: 'Execution', value: 'Fast' },
      { label: 'Pass Rate', value: '100%' }
    ]
  );

  const [assertions] = useState<{ name: string; status: 'PASS' | 'FAIL'; duration?: string }[]>(
    initialProject?.assertions || [
      { name: 'Initial assertion test', status: 'PASS', duration: '120ms' }
    ]
  );

  const [logs] = useState<TestLog[]>(
    initialProject?.logs || [
      { timestamp: '00:00:01', level: 'INFO', message: 'Test suite initialized.' }
    ]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);

    onSave({
      title: title.trim(),
      type,
      link: link.trim() || undefined,
      image: image.trim() || undefined,
      description: description.trim(),
      tags,
      metrics,
      assertions,
      logs,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl my-8 bg-[#12151C] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-[var(--color-accent)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white">
                {initialProject ? 'Edit SQA Project' : 'Add New SQA Project'}
              </h3>
              <p className="text-xs font-mono text-[#9CA3AF]">
                Configure project metrics, assertions, tags, and execution details.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Project Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Playwright Python API Automation Framework"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-mono text-white placeholder:text-white/30 focus:border-[var(--color-accent)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Project Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Project['type'])}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1A1F2C] border border-white/15 text-sm font-mono text-white focus:border-[var(--color-accent)] focus:outline-none"
              >
                <option value="Automation">Automation</option>
                <option value="API">API</option>
                <option value="Performance">Performance</option>
                <option value="Manual">Manual</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              GitHub or Live Documentation Link
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://github.com/sabbir72/Playwright_API_Framework"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white placeholder:text-white/30 focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
            <ImageUploadField
              label="Project Cover / Screenshot Image"
              value={image}
              onChange={setImage}
              shape="banner"
              accentColor="indigo"
              helperText="Upload project screenshot or diagram directly from your device (optional)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
              Project Overview / Summary
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of the test architecture, tools used, coverage, and outcomes..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-sans text-white placeholder:text-white/30 focus:border-[var(--color-accent)] focus:outline-none leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Tags (comma-separated)
              </label>
              <div className="flex gap-1">
                {['Playwright', 'Python', 'Pytest', 'Postman', 'Allure'].map(quickTag => (
                  <button
                    key={quickTag}
                    type="button"
                    onClick={() => {
                      if (!tagsString.includes(quickTag)) {
                        setTagsString(prev => prev ? `${prev}, ${quickTag}` : quickTag);
                      }
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[var(--color-accent)] cursor-pointer"
                  >
                    +{quickTag}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={tagsString}
              onChange={(e) => setTagsString(e.target.value)}
              placeholder="Playwright, Python, Pytest, Allure Reports, REST API"
              className="w-full px-4 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white placeholder:text-white/30 focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>

          {/* Metrics Builder */}
          <div className="space-y-2 border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Key Metrics / Architecture Highlights ({metrics.length})
              </label>
              <button
                type="button"
                onClick={() => setMetrics([...metrics, { label: 'Metric', value: 'Value' }])}
                className="text-xs font-mono text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Metric</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {metrics.map((m, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                  <input
                    type="text"
                    value={m.label}
                    onChange={(e) => {
                      const updated = [...metrics];
                      updated[idx].label = e.target.value;
                      setMetrics(updated);
                    }}
                    placeholder="Label (e.g. Framework)"
                    className="w-1/2 px-2.5 py-1 rounded-lg bg-white/5 text-xs font-mono text-white border border-white/10"
                  />
                  <input
                    type="text"
                    value={m.value}
                    onChange={(e) => {
                      const updated = [...metrics];
                      updated[idx].value = e.target.value;
                      setMetrics(updated);
                    }}
                    placeholder="Value (e.g. Pytest)"
                    className="w-1/2 px-2.5 py-1 rounded-lg bg-white/5 text-xs font-mono text-[var(--color-accent)] border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setMetrics(metrics.filter((_, i) => i !== idx))}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#D1D5DB]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono text-xs font-bold shadow-lg shadow-[var(--color-accent)]/20"
            >
              Save Project
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

// ============================================================================
// EXPERIENCE MODAL COMPONENT
// ============================================================================

interface ExperienceModalProps {
  isOpen: boolean;
  initialExperience: Experience | null;
  onClose: () => void;
  onSave: (expData: Omit<Experience, 'id'>) => void;
}

function ExperienceModal({ isOpen, initialExperience, onClose, onSave }: ExperienceModalProps) {
  const [role, setRole] = useState(initialExperience?.role || '');
  const [company, setCompany] = useState(initialExperience?.company || '');
  const [period, setPeriod] = useState(initialExperience?.period || '');
  const [location, setLocation] = useState(initialExperience?.location || '');
  const [highlightsText, setHighlightsText] = useState(
    initialExperience?.highlights.join('\n') || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim() || !company.trim()) return;

    const highlights = highlightsText
      .split('\n')
      .map(h => h.trim())
      .filter(Boolean);

    onSave({
      role: role.trim(),
      company: company.trim(),
      period: period.trim() || 'Present',
      location: location.trim(),
      highlights: highlights.length > 0 ? highlights : ['Quality assurance operations.'],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl my-8 bg-[#12151C] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white">
                {initialExperience ? 'Edit Work Experience' : 'Add Work Experience'}
              </h3>
              <p className="text-xs font-mono text-[#9CA3AF]">
                Document professional tenure, company, and quality achievements.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Job Title / Role *
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Jr. SQA Engineer"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Company *
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Altersense Ltd"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Period / Tenure
              </label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="03/2025 - Present"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Tejgaon, Dhaka, Bangladesh"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center justify-between">
              <span>Accomplishments & Highlights (1 bullet per line)</span>
              <span className="text-[10px] text-[#9CA3AF]">Separated by Enter key</span>
            </label>
            <textarea
              value={highlightsText}
              onChange={(e) => setHighlightsText(e.target.value)}
              rows={5}
              placeholder="Writing, reviewing, and executing test cases for ERP software...&#10;Performing API testing using Postman...&#10;Defect reporting & tracking via Jira..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-blue-500 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#D1D5DB]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-blue-600/20"
            >
              Save Experience
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

// ============================================================================
// BLOG MODAL COMPONENT
// ============================================================================

interface BlogModalProps {
  isOpen: boolean;
  initialBlog: BlogPost | null;
  onClose: () => void;
  onSave: (blogData: Partial<BlogPost> & { title?: string; content?: string }) => void;
}

function BlogModal({ isOpen, initialBlog, onClose, onSave }: BlogModalProps) {
  const [title, setTitle] = useState(initialBlog?.title || '');
  const [slug, setSlug] = useState(initialBlog?.slug || '');
  const [availableCategories, setAvailableCategories] = useState<string[]>(() => getStoredBlogCategories());
  const [category, setCategory] = useState<string>(initialBlog?.category || 'Software Testing');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [description, setDescription] = useState(initialBlog?.description || '');
  const [content, setContent] = useState(initialBlog?.content || '');
  const [coverImage, setCoverImage] = useState(initialBlog?.coverImage || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200');
  const [status, setStatus] = useState<'Published' | 'Draft'>(initialBlog?.status || 'Published');
  const [featured, setFeatured] = useState<boolean>(initialBlog?.featured || false);
  const [tagsString, setTagsString] = useState(initialBlog?.tags?.join(', ') || 'QA, Testing');
  const [readingTime, setReadingTime] = useState(initialBlog?.readingTime || '5 min read');

  useEffect(() => {
    if (isOpen) {
      setAvailableCategories(getStoredBlogCategories());
      setIsCreatingCategory(false);
      setNewCategoryName('');
    }
  }, [isOpen]);

  // Auto-generate slug and reading time from content
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialBlog && val.trim()) {
      setSlug(generateSlug(val));
    }
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    if (val.trim()) {
      setReadingTime(calculateReadingTime(val));
    }
  };

  const handleConfirmNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setIsCreatingCategory(false);
      return;
    }
    const updated = addBlogCategory(trimmed);
    const matched = updated.find((c) => c.toLowerCase() === trimmed.toLowerCase()) || trimmed;
    setAvailableCategories(updated);
    setCategory(matched);
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    const finalTitle = title.trim() || 'Untitled Article';
    const finalCategory = (isCreatingCategory && newCategoryName.trim())
      ? newCategoryName.trim()
      : (category.trim() || 'Software Testing');

    if (finalCategory) {
      setAvailableCategories(addBlogCategory(finalCategory));
    }

    onSave({
      id: initialBlog?.id,
      title: finalTitle,
      slug: slug.trim() ? generateSlug(slug) : generateSlug(finalTitle),
      category: finalCategory,
      description: description.trim(),
      content: content.trim(),
      coverImage: coverImage.trim() || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200',
      status,
      featured,
      tags: tags.length > 0 ? tags : ['Software Testing'],
      readingTime: readingTime || (content.trim() ? calculateReadingTime(content) : '3 min read'),
    });
  };

  const categoryOptions = availableCategories.includes(category)
    ? availableCategories
    : [category, ...availableCategories].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl my-8 bg-[#12151C] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white">
                {initialBlog ? 'Edit Technical Article' : 'Compose New Article'}
              </h3>
              <p className="text-xs font-mono text-[#9CA3AF]">
                Draft or publish freely. All fields are optional and can be updated anytime.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center justify-between">
                <span>Blog Title</span>
                <span className="text-[10px] text-[#9CA3AF]">Optional</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Building Resilient API Automation with Python & Playwright"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-mono text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCategory((prev) => !prev);
                    setNewCategoryName('');
                  }}
                  className="text-[10px] font-mono text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {isCreatingCategory ? (
                    <span>Select Existing</span>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>New Category</span>
                    </>
                  )}
                </button>
              </div>

              {isCreatingCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmNewCategory();
                      }
                    }}
                    placeholder="Type new category..."
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-purple-500/50 text-sm font-mono text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmNewCategory}
                    className="px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__create_new__') {
                      setIsCreatingCategory(true);
                      setNewCategoryName('');
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1A1F2C] border border-white/15 text-sm font-mono text-white focus:border-purple-500 focus:outline-none"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__create_new__" className="text-purple-300 font-bold">
                    + Create New Category...
                  </option>
                </select>
              )}
            </div>
          </div>

          {/* Row 2: Slug, Status, Reading Time, Featured */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center justify-between">
                <span>URL Slug (/blog/...)</span>
                <span className="text-[10px] text-[#9CA3AF]">Auto</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="building-resilient-api-automation"
                className="w-full px-4 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Publication Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Published' | 'Draft')}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1F2C] border border-white/15 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="Published">Published (Live)</option>
                <option value="Draft">Draft (Private in CMS)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Reading Time
              </label>
              <input
                type="text"
                value={readingTime}
                onChange={(e) => setReadingTime(e.target.value)}
                placeholder="e.g. 5 min read"
                className="w-full px-4 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-center">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Featured Banner
              </label>
              <label className="inline-flex items-center space-x-2 py-2 cursor-pointer text-xs font-mono text-[#D1D5DB]">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
                />
                <span>Highlight as Featured</span>
              </label>
            </div>
          </div>

          {/* Row 3: Direct File Upload for Article Cover Image */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <ImageUploadField
              label="Article Cover Image"
              value={coverImage}
              onChange={setCoverImage}
              shape="banner"
              accentColor="purple"
              helperText="Upload article cover photo directly from your device (JPG, PNG, WebP, GIF, SVG)"
            />
          </div>

          {/* Row 4: Summary / Excerpt */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center justify-between">
              <span>Summary / Excerpt</span>
              <span className="text-[10px] text-[#9CA3AF]">Optional</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short teaser description shown on cards and RSS feeds..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-sans text-white focus:border-purple-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Row 5: Article Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center justify-between">
              <span>Article Content (Markdown supported)</span>
              <span className="text-[10px] text-[#9CA3AF]">
                {content.split(/\s+/).filter(Boolean).length} words • Optional
              </span>
            </label>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={9}
              placeholder="# Introduction&#10;&#10;In modern test engineering, quality gates must be automated...&#10;&#10;## Key Architecture&#10;- Point 1&#10;- Point 2"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-purple-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Row 6: Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center justify-between">
              <span>Tags (comma-separated)</span>
              <span className="text-[10px] text-[#9CA3AF]">Optional</span>
            </label>
            <input
              type="text"
              value={tagsString}
              onChange={(e) => setTagsString(e.target.value)}
              placeholder="Playwright, API, Testing, Automation"
              className="w-full px-4 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#D1D5DB] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              Save Article
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
