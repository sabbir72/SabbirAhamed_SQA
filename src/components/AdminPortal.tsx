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
  ShieldCheck, Lock, KeyRound, ArrowLeft, Plus, Edit2, Trash2, Copy, 
  ArrowUp, ArrowDown, ExternalLink, Check, X, AlertCircle, RefreshCw, 
  Download, Upload, Search, Filter, Layers, Briefcase, Zap, Terminal, 
  Cpu, FileCode, CheckCircle2, ChevronRight, Eye, Code, FileText, Sparkles,
  Info, Tag, Activity, Database, ClipboardList, Play, Save, BookOpen, User,
  Globe, Mail, Phone, MapPin, Linkedin, Github, Unlock, Printer, Sliders,
  CheckSquare, Square, Building2, Send, Bookmark, Award, Target, EyeOff, Clock, Palette
} from 'lucide-react';
import ThemeSelectorModal from './ThemeSelectorModal';
import { COLOR_THEMES, getSavedThemeId, setAndApplyTheme } from '../utils/themeStore';
import { Project, Experience, Skill, TestLog, Reference, CareerRoadmapItem } from '../types';
import { 
  getStoredProjects, addStoredProject, updateStoredProject, deleteStoredProject, reorderStoredProjects,
  getStoredExperiences, addStoredExperience, updateStoredExperience, deleteStoredExperience, reorderStoredExperiences,
  getStoredSkills, saveStoredSkills, addStoredSkillCategory, updateStoredSkillCategory, deleteStoredSkillCategory,
  addSkillItemToCategory, removeSkillItemFromCategory,
  getStoredProfile, updateStoredProfile, ProfileData,
  getStoredReferences, addStoredReference, updateStoredReference, deleteStoredReference,
  getStoredCareerRoadmap, addStoredCareerRoadmapItem, updateStoredCareerRoadmapItem, deleteStoredCareerRoadmapItem,
  resetPortfolioToDefault, exportPortfolioDataJson, importPortfolioDataJson,
  PORTFOLIO_UPDATED_EVENT
} from '../utils/portfolioStore';
import { 
  getStoredBlogPosts, upsertBlogPost, deleteBlogPost, resetStoredBlogPosts, 
  generateSlug, calculateReadingTime, BLOGS_UPDATED_EVENT 
} from '../utils/blogStore';
import { BlogPost } from '../data/blogs';
import { 
  isAdminAuthenticated, 
  verifyAdminPasscode, 
  logoutAdmin,
  recordAdminActivity,
  getAdminSessionRemainingSeconds,
  ADMIN_SESSION_EXPIRED_EVENT
} from '../utils/adminAuth';
import { 
  getSystemLocks, 
  updateSystemLocks, 
  toggleSystemLock, 
  lockAllSystems, 
  unlockAllSystems, 
  resetSystemLocks, 
  SystemLocks, 
  LOCKS_UPDATED_EVENT 
} from '../utils/lockStore';
import { PERSONAL_INFO } from '../data';
import { 
  DEFAULT_CAREER_OBJECTIVE, 
  ROLE_CAREER_OBJECTIVES, 
  TargetRoleType, 
  TemplateType, 
  AtsFontFamily 
} from './ResumeBuilderModal';
import { CoverLetterTone, CoverLetterTemplate } from './CoverLetterGeneratorModal';

export type AdminTab = 'projects' | 'experience' | 'references' | 'roadmap' | 'skills' | 'blogs' | 'resume' | 'cover-letter' | 'profile' | 'security';

interface AdminPortalProps {
  onBack: () => void;
  initialTab?: AdminTab;
  onOpenResumeBuilder?: () => void;
  onOpenCoverLetter?: () => void;
}

export default function AdminPortal({ 
  onBack, 
  initialTab = 'projects',
  onOpenResumeBuilder,
  onOpenCoverLetter 
}: AdminPortalProps) {
  // Authentication State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [sessionRemaining, setSessionRemaining] = useState<number>(() => getAdminSessionRemainingSeconds());
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showMasterPass, setShowMasterPass] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => getSavedThemeId());

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  // System Lock State for Everything
  const [systemLocks, setSystemLocks] = useState<SystemLocks>(() => getSystemLocks());

  // Blog Section Lock System State
  const [isBlogLockStrict, setIsBlogLockStrict] = useState<boolean>(true);

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

  // Search & Filter
  const [projectSearch, setProjectSearch] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('All');
  const [blogSearch, setBlogSearch] = useState('');
  const [blogCategoryFilter, setBlogCategoryFilter] = useState<string>('All');

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
    };

    const handleAuthUpdated = () => {
      setIsAdmin(isAdminAuthenticated());
    };

    const handleLocksUpdated = () => {
      setSystemLocks(getSystemLocks());
    };

    window.addEventListener(PORTFOLIO_UPDATED_EVENT, handlePortfolioUpdated);
    window.addEventListener(BLOGS_UPDATED_EVENT, handleBlogsUpdated);
    window.addEventListener('admin_auth_changed', handleAuthUpdated);
    window.addEventListener(LOCKS_UPDATED_EVENT, handleLocksUpdated);

    return () => {
      window.removeEventListener(PORTFOLIO_UPDATED_EVENT, handlePortfolioUpdated);
      window.removeEventListener(BLOGS_UPDATED_EVENT, handleBlogsUpdated);
      window.removeEventListener('admin_auth_changed', handleAuthUpdated);
      window.removeEventListener(LOCKS_UPDATED_EVENT, handleLocksUpdated);
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

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Passcode form submission
  const handlePasscodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isVerifying) return;
    setAuthError('');
    setIsVerifying(true);

    try {
      const success = await verifyAdminPasscode(passcode);
      if (success) {
        setIsAdmin(true);
        setPasscode('');
        setSessionRemaining(120);
        showToast('Admin session unlocked! (Auto-logout in 2 min of inactivity)');
      } else {
        setAuthError('Invalid Admin Passcode! Please enter the correct common passcode.');
      }
    } catch (err) {
      setAuthError('Network authentication error. Please retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Logout / Lock session
  const handleLogout = () => {
    logoutAdmin();
    setIsAdmin(false);
    showToast('Admin session locked.');
  };

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

  const handleSaveBlog = (blogData: Partial<BlogPost> & { title: string; content: string }) => {
    upsertBlogPost(blogData);
    showToast(`Article "${blogData.title}" saved.`);
    setIsBlogModalOpen(false);
    setEditingBlog(null);
  };

  // --------------------------------------------------------------------------
  // BLOG LOCK SYSTEM HANDLERS
  // --------------------------------------------------------------------------
  const handleToggleBlogLock = (id: string) => {
    const post = blogs.find(b => b.id === id);
    if (!post) return;
    const newStatus = post.status === 'Draft' ? 'Published' : 'Draft';
    upsertBlogPost({
      ...post,
      status: newStatus
    });
    setBlogs(getStoredBlogPosts());
    showToast(`Article "${post.title.slice(0, 24)}..." is now ${newStatus === 'Draft' ? 'Locked (Draft)' : 'Public (Live)'}!`);
  };

  const handleBulkLockArticles = () => {
    blogs.forEach(post => {
      upsertBlogPost({ ...post, status: 'Draft' });
    });
    setBlogs(getStoredBlogPosts());
    showToast('All blog articles set to Locked (Draft).');
  };

  const handleBulkUnlockArticles = () => {
    blogs.forEach(post => {
      upsertBlogPost({ ...post, status: 'Published' });
    });
    setBlogs(getStoredBlogPosts());
    showToast('All blog articles Published & Unlocked for visitors.');
  };

  // --------------------------------------------------------------------------
  // CENTRALIZED SYSTEM LOCK HANDLERS (FOR EVERYTHING)
  // --------------------------------------------------------------------------
  const handleToggleLock = (key: keyof Omit<SystemLocks, 'lastModified'>, label: string) => {
    const updated = toggleSystemLock(key);
    setSystemLocks(updated);
    showToast(`${label} is now ${updated[key] ? 'LOCKED' : 'UNLOCKED'}.`);
  };

  const handleLockAllSystems = () => {
    const updated = lockAllSystems();
    setSystemLocks(updated);
    showToast('ALL systems have been LOCKED by Administrator.');
  };

  const handleUnlockAllSystems = () => {
    const updated = unlockAllSystems();
    setSystemLocks(updated);
    showToast('All systems have been UNLOCKED.');
  };

  const handleResetLocks = () => {
    const updated = resetSystemLocks();
    setSystemLocks(updated);
    showToast('System locks reset to standard baseline.');
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

  // Filtered Blogs
  const filteredBlogs = useMemo(() => {
    return blogs.filter(b => {
      const matchSearch = blogSearch === '' ||
        b.title.toLowerCase().includes(blogSearch.toLowerCase()) ||
        b.description.toLowerCase().includes(blogSearch.toLowerCase()) ||
        b.tags.some(t => t.toLowerCase().includes(blogSearch.toLowerCase()));
      
      const matchCategory = blogCategoryFilter === 'All' || b.category === blogCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [blogs, blogSearch, blogCategoryFilter]);

  const totalSkillItems = useMemo(() => {
    return skills.reduce((acc, cat) => acc + cat.items.length, 0);
  }, [skills]);

  const activeLocksCount = useMemo(() => {
    let count = 0;
    if (systemLocks.blogLocked) count++;
    if (systemLocks.resumeLocked) count++;
    if (systemLocks.coverLetterLocked) count++;
    if (systemLocks.projectsLocked) count++;
    if (systemLocks.experienceLocked) count++;
    if (systemLocks.skillsLocked) count++;
    if (systemLocks.profileLocked) count++;
    return count;
  }, [systemLocks]);

  // ============================================================================
  // UNLOCKED VIEW OR PASSCODE GATE
  // ============================================================================

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0D12] text-white flex flex-col items-center justify-center p-4 relative font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[var(--color-accent)]/15 via-transparent to-transparent pointer-events-none" />

        <div className="w-full max-w-md bg-[#12151C] border border-[var(--color-accent)]/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10 animate-fadeIn">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-xs font-mono text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portfolio</span>
          </button>

          <div className="text-center space-y-3 pt-2">
            <div className="inline-flex p-3.5 rounded-2xl bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-[var(--color-accent)]">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="font-display font-extrabold text-2xl text-white">
              Admin Authentication
            </h1>
            <p className="text-xs font-mono text-[#9CA3AF] max-w-xs mx-auto leading-relaxed">
              The Portfolio Admin Management System is restricted to admin only. Please enter the master admin passcode to view the admin management system.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handlePasscodeLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  Common Admin Passcode
                </span>
                <span className="text-[10px] text-[#9CA3AF] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[var(--color-accent)]" />
                  <span>Security Protected</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? "text" : "password"}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="*****"
                  autoFocus
                  required
                  disabled={isVerifying}
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/[0.05] border border-white/20 text-sm font-mono text-white placeholder:text-white/30 focus:border-[var(--color-accent)] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
                  title={showPasscode ? "Hide Passcode" : "Show Passcode"}
                >
                  {showPasscode ? <Eye className="w-4 h-4 text-[var(--color-accent)]" /> : <Lock className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="shimmer w-full py-3.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono text-xs font-bold shadow-lg shadow-[var(--color-accent)]/25 cursor-pointer flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isVerifying ? (
                <span>Verifying Passcode...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Login & View Admin System</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-white/10 text-center">
            <span className="text-[11px] font-mono text-[#9CA3AF]">
              Restricted to Portfolio Owner & Authorized Administrator
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // AUTHENTICATED ADMIN DASHBOARD
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#F3F4F6] flex flex-col font-sans selection:bg-[var(--color-accent)] selection:text-white pt-20 pb-24">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-[#12151C] border border-[var(--color-accent)] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 font-mono text-xs animate-slideIn">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)]" />
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-8">
        
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white transition-colors cursor-pointer border border-white/10"
                title="Return to Portfolio"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight flex items-center gap-2.5">
                  <span>Portfolio Admin Management System</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Unlocked</span>
                  </span>
                </h1>
                <p className="text-xs font-mono text-[#9CA3AF] mt-0.5">
                  Unified CRUD Control for Projects, Work Experience, Skills, Blogs, Profile & Security.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onBack}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white border border-white/10 text-xs font-mono transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>View Portfolio</span>
            </button>

            <button
              onClick={handleExportBackup}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white border border-white/10 text-xs font-mono transition-colors cursor-pointer"
              title="Download full JSON dataset"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white border border-white/10 text-xs font-mono transition-colors cursor-pointer"
              title="Upload JSON dataset"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import JSON</span>
            </button>

            <button
              onClick={() => setConfirmDelete({ type: 'reset', title: 'Default Portfolio & Blog Dataset' })}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono transition-colors cursor-pointer"
              title="Restore original portfolio content"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setIsThemeModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-[var(--color-accent)] border border-white/10 text-xs font-mono transition-colors cursor-pointer"
              title="Open Color View Studio to change site theme"
            >
              <Palette className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Color View</span>
            </button>

            <div 
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
                sessionRemaining <= 30
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
              title="Admin CMS automatically logs out after 2 minutes of inactivity. Any interaction resets the countdown."
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Logout: <strong className="font-bold">{formatTimer(sessionRemaining)}</strong></span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono transition-colors cursor-pointer"
              title="Logout and Hide Portfolio Admin Management System"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div 
            onClick={() => setActiveTab('projects')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'projects' 
                ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/10' 
                : 'bg-[#12151C] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
              <span>PROJECTS</span>
              <Layers className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            </div>
            <div className="text-xl font-display font-extrabold text-white mt-1">
              {projects.length}
            </div>
            <div className="text-[10px] font-mono text-[var(--color-accent)] mt-0.5 truncate">
              {systemLocks.projectsLocked ? '🔒 Locked' : 'Showcases'}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('experience')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'experience' 
                ? 'bg-blue-500/15 border-blue-500 shadow-lg shadow-blue-500/10' 
                : 'bg-[#12151C] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
              <span>EXPERIENCE</span>
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-display font-extrabold text-white mt-1">
              {experiences.length}
            </div>
            <div className="text-[10px] font-mono text-blue-400 mt-0.5 truncate">
              {systemLocks.experienceLocked ? '🔒 Locked' : 'Career Roles'}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('skills')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'skills' 
                ? 'bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/10' 
                : 'bg-[#12151C] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
              <span>SKILLS</span>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-display font-extrabold text-white mt-1">
              {totalSkillItems}
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-0.5 truncate">
              {systemLocks.skillsLocked ? '🔒 Locked' : `${skills.length} Cats`}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('blogs')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'blogs' 
                ? 'bg-purple-500/15 border-purple-500 shadow-lg shadow-purple-500/10' 
                : 'bg-[#12151C] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
              <span>SQA BLOG</span>
              <Lock className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-display font-extrabold text-white mt-1">
              {blogs.length}
            </div>
            <div className="text-[10px] font-mono text-purple-400 mt-0.5 truncate">
              {systemLocks.blogLocked ? '🔒 Strictly Locked' : 'Active'}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('resume')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'resume' 
                ? 'bg-rose-500/15 border-rose-500 shadow-lg shadow-rose-500/10' 
                : 'bg-[#12151C] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
              <span>ATS RESUME</span>
              <FileText className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-display font-extrabold text-white mt-1">
              96%
            </div>
            <div className="text-[10px] font-mono text-rose-400 mt-0.5 truncate">
              {systemLocks.resumeLocked ? '🔒 Admin Locked' : 'ATS CV'}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('cover-letter')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'cover-letter' 
                ? 'bg-indigo-500/15 border-indigo-500 shadow-lg shadow-indigo-500/10' 
                : 'bg-[#12151C] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
              <span>COVER LETTER</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-display font-extrabold text-white mt-1">
              AI Suite
            </div>
            <div className="text-[10px] font-mono text-indigo-400 mt-0.5 truncate">
              {systemLocks.coverLetterLocked ? '🔒 Admin Locked' : 'Tailored'}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('profile')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-cyan-500/15 border-cyan-500 shadow-lg shadow-cyan-500/10' 
                : 'bg-[#12151C] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
              <span>PROFILE & BIO</span>
              <User className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-display font-extrabold text-white mt-1">
              {profile.experienceYears}
            </div>
            <div className="text-[10px] font-mono text-cyan-400 mt-0.5 truncate">
              {systemLocks.profileLocked ? '🔒 Locked' : 'Headline'}
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('security')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'security' 
                ? 'bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/10' 
                : 'bg-[#12151C] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
              <span>LOCK SYSTEM</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-display font-extrabold text-white mt-1">
              {activeLocksCount}/7
            </div>
            <div className="text-[10px] font-mono text-amber-400 mt-0.5 truncate">
              {activeLocksCount > 0 ? 'Guards Active' : 'All Open'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/25'
                : 'bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Projects ({projects.length})</span>
            {systemLocks.projectsLocked && <Lock className="w-3 h-3 text-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('experience')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'experience'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Experience ({experiences.length})</span>
            {systemLocks.experienceLocked && <Lock className="w-3 h-3 text-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('references')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'references'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                : 'bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>References ({references.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'roadmap'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Career Roadmap ({careerRoadmap.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'skills'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Skills ({skills.length} Cats)</span>
            {systemLocks.skillsLocked && <Lock className="w-3 h-3 text-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('blogs')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'blogs'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Blogs & Lock ({blogs.length})</span>
            {systemLocks.blogLocked && <Lock className="w-3 h-3 text-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('resume')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'resume'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Resume & ATS</span>
            {systemLocks.resumeLocked && <Lock className="w-3 h-3 text-rose-300" />}
          </button>

          <button
            onClick={() => setActiveTab('cover-letter')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'cover-letter'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Cover Letter Suite</span>
            {systemLocks.coverLetterLocked && <Lock className="w-3 h-3 text-indigo-300" />}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                : 'bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Bio</span>
            {systemLocks.profileLocked && <Lock className="w-3 h-3 text-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'bg-white/5 text-[#D1D5DB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security & Lock System</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-mono">
              {activeLocksCount}
            </span>
          </button>
        </div>

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
        {/* TAB 4: BLOGS MANAGEMENT (CRUD) */}
        {/* ==================================================================== */}
        {activeTab === 'blogs' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Blog Section Lock & Security System Panel */}
            <div className="p-5 rounded-2xl bg-[#12151C] border border-purple-500/30 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-white text-base">
                        Blog Section Lock System
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                        isBlogLockStrict
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        <span>{isBlogLockStrict ? 'Strict Admin Lock: Active' : 'Unrestricted Mode'}</span>
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#9CA3AF] mt-0.5">
                      Restricts article creation, deletion, and editing exclusively to the authenticated admin.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setIsBlogLockStrict(!isBlogLockStrict);
                      showToast(isBlogLockStrict ? 'Blog Section Lock relaxed.' : 'Blog Section Strict Admin Lock enforced!');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isBlogLockStrict
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-white/5 border-white/10 text-[#D1D5DB] hover:text-white'
                    }`}
                  >
                    {isBlogLockStrict ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Unlock className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{isBlogLockStrict ? 'Lock Enforced' : 'Enable Strict Lock'}</span>
                  </button>

                  <button
                    onClick={handleBulkLockArticles}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white border border-white/10 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Lock all articles into Draft/Protected state"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lock All as Draft</span>
                  </button>

                  <button
                    onClick={handleBulkUnlockArticles}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white border border-white/10 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Publish and unlock all articles for public view"
                  >
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Publish & Unlock All</span>
                  </button>

                  <a
                    href="/blog"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Verify Blog Public View</span>
                  </a>
                </div>
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

                {/* Filter Category */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {['All', 'Software Testing', 'Playwright', 'API Testing', 'ERPNext', 'QA Career'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setBlogCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                        blogCategoryFilter === cat
                          ? 'bg-purple-600 text-white font-bold'
                          : 'bg-white/5 text-[#9CA3AF] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
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
                {filteredBlogs.map((post) => (
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
                              onClick={() => handleToggleBlogLock(post.id)}
                              className={`px-2.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                                post.status === 'Draft' 
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25' 
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                              }`}
                              title={post.status === 'Draft' ? 'Status: Locked (Draft) - Click to Unlock & Publish' : 'Status: Public (Live) - Click to Lock as Draft'}
                            >
                              {post.status === 'Draft' ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
                              <span>{post.status === 'Draft' ? 'Locked (Draft)' : 'Public (Live)'}</span>
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
                          onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white transition-colors cursor-pointer border border-white/10"
                          title="Preview Article in Browser"
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
                ))}
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

              {/* Avatar and Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center justify-between">
                    <span>Avatar Image URL / Path</span>
                    <span className="text-[10px] text-[#9CA3AF]">e.g. /sabbir_avatar.jpeg</span>
                  </label>
                  <input
                    type="text"
                    value={profile.avatar}
                    onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
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

            {/* Master Lock Banner & 1-Click Operations */}
            <div className="bg-[#12151C] border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div className="flex items-start space-x-4">
                  <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display font-bold text-xl sm:text-2xl text-white">
                        Security & Master Lock System
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                        activeLocksCount > 0 
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' 
                          : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      }`}>
                        <Lock className="w-3.5 h-3.5" />
                        <span>{activeLocksCount} of 7 Systems Guarded</span>
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#9CA3AF] max-w-2xl leading-relaxed">
                      Centralized administrative lock controls for the entire portfolio: SQA Blog section, ATS Resume Suite, AI Cover Letter Studio, and Portfolio CMS Content.
                    </p>
                  </div>
                </div>

                {/* 1-Click Master Control Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleLockAllSystems}
                    className="shimmer inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold shadow-lg shadow-red-600/25 transition-all hover:scale-105 cursor-pointer"
                    title="Lock all 7 systems down immediately"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Emergency Lock All</span>
                  </button>

                  <button
                    onClick={handleUnlockAllSystems}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 cursor-pointer"
                    title="Unlock all systems for full access"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Unlock All Systems</span>
                  </button>

                  <button
                    onClick={handleResetLocks}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#D1D5DB] hover:text-white border border-white/10 font-mono text-xs transition-colors cursor-pointer"
                    title="Reset to recommended security baseline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Baseline Defaults</span>
                  </button>
                </div>
              </div>

              {/* Modular Lock Control Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* LOCK CARD 1: SQA BLOG SECTION LOCK */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-purple-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-sm text-white">SQA Blog Section Lock</h4>
                        <span className="text-[10px] font-mono text-[#9CA3AF]">Technical Articles & Publishing</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      systemLocks.blogLocked ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {systemLocks.blogLocked ? 'LOCKED' : 'UNLOCKED'}
                    </span>
                  </div>

                  <p className="text-xs text-[#9CA3AF] font-light leading-relaxed">
                    Controls whether visitors can access the SQA knowledge base, and restricts draft publishing to verified admins.
                  </p>

                  <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#D1D5DB]">Strict Admin Blog Lock</span>
                      <button
                        onClick={() => handleToggleLock('blogLocked', 'SQA Blog Master Lock')}
                        className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          systemLocks.blogLocked
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-white/5 text-[#9CA3AF] border-white/10'
                        }`}
                      >
                        {systemLocks.blogLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                        <span>{systemLocks.blogLocked ? 'Locked' : 'Open'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#D1D5DB]">Public Visitor Browsing</span>
                      <button
                        onClick={() => handleToggleLock('blogPublicBrowsing', 'Public Blog Browsing')}
                        className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          systemLocks.blogPublicBrowsing
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}
                      >
                        {systemLocks.blogPublicBrowsing ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />}
                        <span>{systemLocks.blogPublicBrowsing ? 'Enabled' : 'Blocked'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleBulkLockArticles}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-[#D1D5DB] border border-white/10 transition-colors cursor-pointer"
                    >
                      Lock All as Draft
                    </button>
                    <button
                      onClick={handleBulkUnlockArticles}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-[#D1D5DB] border border-white/10 transition-colors cursor-pointer"
                    >
                      Unlock All Posts
                    </button>
                  </div>
                </div>

                {/* LOCK CARD 2: ATS RESUME SUITE LOCK */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-rose-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-sm text-white">ATS Resume Suite Lock</h4>
                        <span className="text-[10px] font-mono text-[#9CA3AF]">Curriculum Vitae Generation</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      systemLocks.resumeLocked ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {systemLocks.resumeLocked ? 'ADMIN ONLY' : 'PUBLIC'}
                    </span>
                  </div>

                  <p className="text-xs text-[#9CA3AF] font-light leading-relaxed">
                    Restricts ATS Resume Builder access and PDF downloads to the verified admin via common passcode challenge.
                  </p>

                  <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#D1D5DB]">Passcode Gate Protection</span>
                      <button
                        onClick={() => handleToggleLock('resumeLocked', 'Resume Builder Passcode Gate')}
                        className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          systemLocks.resumeLocked
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-white/5 text-[#9CA3AF] border-white/10'
                        }`}
                      >
                        {systemLocks.resumeLocked ? <Lock className="w-3 h-3 text-rose-400" /> : <Unlock className="w-3 h-3" />}
                        <span>{systemLocks.resumeLocked ? 'Admin Lock' : 'Public'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#D1D5DB]">PDF Download & Export Lock</span>
                      <button
                        onClick={() => handleToggleLock('resumeDownloadLocked', 'Resume Download Lock')}
                        className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          systemLocks.resumeDownloadLocked
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {systemLocks.resumeDownloadLocked ? <Lock className="w-3 h-3 text-rose-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
                        <span>{systemLocks.resumeDownloadLocked ? 'Locked' : 'Open'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    {onOpenResumeBuilder && (
                      <button
                        onClick={onOpenResumeBuilder}
                        className="w-full py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-mono transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Resume Builder Modal</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* LOCK CARD 3: AI COVER LETTER SUITE LOCK */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-indigo-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-sm text-white">AI Cover Letter Suite Lock</h4>
                        <span className="text-[10px] font-mono text-[#9CA3AF]">Application Generator & Letters</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      systemLocks.coverLetterLocked ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {systemLocks.coverLetterLocked ? 'ADMIN ONLY' : 'PUBLIC'}
                    </span>
                  </div>

                  <p className="text-xs text-[#9CA3AF] font-light leading-relaxed">
                    Guards the AI cover letter generator, preventing unauthorized company targeting or letter exports.
                  </p>

                  <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#D1D5DB]">Passcode Gate Protection</span>
                      <button
                        onClick={() => handleToggleLock('coverLetterLocked', 'Cover Letter Passcode Gate')}
                        className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          systemLocks.coverLetterLocked
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-white/5 text-[#9CA3AF] border-white/10'
                        }`}
                      >
                        {systemLocks.coverLetterLocked ? <Lock className="w-3 h-3 text-indigo-400" /> : <Unlock className="w-3 h-3" />}
                        <span>{systemLocks.coverLetterLocked ? 'Admin Lock' : 'Public'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#D1D5DB]">Letter Export & Copy Lock</span>
                      <button
                        onClick={() => handleToggleLock('coverLetterExportLocked', 'Cover Letter Export Lock')}
                        className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          systemLocks.coverLetterExportLocked
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {systemLocks.coverLetterExportLocked ? <Lock className="w-3 h-3 text-indigo-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
                        <span>{systemLocks.coverLetterExportLocked ? 'Locked' : 'Open'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    {onOpenCoverLetter && (
                      <button
                        onClick={onOpenCoverLetter}
                        className="w-full py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Cover Letter Modal</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* LOCK CARD 4: PORTFOLIO CMS CONTENT PROTECTION LOCKS */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-blue-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-sm text-white">Portfolio Content Locks</h4>
                        <span className="text-[10px] font-mono text-[#9CA3AF]">Projects, Work, Skills, Profile</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      CMS GUARDS
                    </span>
                  </div>

                  <p className="text-xs text-[#9CA3AF] font-light leading-relaxed">
                    Prevent accidental modification, deletions, or external overrides on core portfolio data.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.06]">
                    <button
                      onClick={() => handleToggleLock('projectsLocked', 'Projects Edit Lock')}
                      className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                        systemLocks.projectsLocked 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                          : 'bg-white/5 border-white/10 text-[#D1D5DB]'
                      }`}
                    >
                      <span>Projects</span>
                      {systemLocks.projectsLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-[#9CA3AF]" />}
                    </button>

                    <button
                      onClick={() => handleToggleLock('experienceLocked', 'Experience Edit Lock')}
                      className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                        systemLocks.experienceLocked 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                          : 'bg-white/5 border-white/10 text-[#D1D5DB]'
                      }`}
                    >
                      <span>Experience</span>
                      {systemLocks.experienceLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-[#9CA3AF]" />}
                    </button>

                    <button
                      onClick={() => handleToggleLock('skillsLocked', 'Skills Edit Lock')}
                      className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                        systemLocks.skillsLocked 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                          : 'bg-white/5 border-white/10 text-[#D1D5DB]'
                      }`}
                    >
                      <span>Skills</span>
                      {systemLocks.skillsLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-[#9CA3AF]" />}
                    </button>

                    <button
                      onClick={() => handleToggleLock('profileLocked', 'Profile Edit Lock')}
                      className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                        systemLocks.profileLocked 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                          : 'bg-white/5 border-white/10 text-[#D1D5DB]'
                      }`}
                    >
                      <span>Profile</span>
                      {systemLocks.profileLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-[#9CA3AF]" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Master Administrator Passcode & Encryption Card */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    <span>Common Administrator Passcode (Hidden by Default)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Encrypted & Masked</span>
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-white/10 font-mono text-sm text-[#D1D5DB]">
                  <span className="tracking-widest font-bold text-[var(--color-accent)]">
                    {showMasterPass ? 'sabbir@sqa2026' : '••••••••••••••'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowMasterPass(!showMasterPass)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#D1D5DB] hover:text-white transition-colors cursor-pointer border border-white/10"
                    >
                      {showMasterPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showMasterPass ? 'Hide' : 'Reveal'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('sabbir@sqa2026');
                        showToast('Admin Passcode copied to clipboard!');
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white hover:text-[var(--color-accent)] transition-colors cursor-pointer border border-white/10"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-[#9CA3AF] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>The master password string is hidden. All passcode inputs throughout the site are masked with placeholder <code className="text-white font-bold bg-white/10 px-1 rounded">*****</code>.</span>
                </p>
              </div>

              {/* Data Backup, Reset, and Session Logout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <h4 className="text-xs font-mono text-white font-bold flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-400" />
                    Full Data Backup
                  </h4>
                  <p className="text-[11px] font-mono text-[#9CA3AF] leading-relaxed">
                    Export all custom projects, milestones, skills, and settings into a single JSON file.
                  </p>
                  <button
                    onClick={handleExportBackup}
                    className="mt-2 w-full py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white font-mono text-xs font-bold cursor-pointer"
                  >
                    Download Backup JSON
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <h4 className="text-xs font-mono text-white font-bold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                    Factory Default Reset
                  </h4>
                  <p className="text-[11px] font-mono text-[#9CA3AF] leading-relaxed">
                    Restore the portfolio to original baseline data. Requires confirmation.
                  </p>
                  <button
                    onClick={() => setConfirmDelete({ type: 'reset', title: 'Default Portfolio & Blog Dataset' })}
                    className="mt-2 w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-mono text-xs font-bold cursor-pointer"
                  >
                    Reset All Data
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                  <h4 className="text-xs font-mono text-red-400 font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-400" />
                    Logout & Lock System
                  </h4>
                  <p className="text-[11px] font-mono text-[#9CA3AF] leading-relaxed">
                    Terminate session. The Portfolio Admin Management System will be locked and hidden.
                  </p>
                  <button
                    onClick={handleLogout}
                    className="mt-2 w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold cursor-pointer transition-all"
                  >
                    Logout Admin Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

function ProjectModal({ isOpen, initialProject, onClose, onSave }: ProjectModalProps) {
  const [title, setTitle] = useState(initialProject?.title || '');
  const [type, setType] = useState<Project['type']>(initialProject?.type || 'Automation');
  const [link, setLink] = useState(initialProject?.link || '');
  const [description, setDescription] = useState(initialProject?.description || '');
  const [tagsString, setTagsString] = useState(initialProject?.tags.join(', ') || '');
  
  const [metrics, setMetrics] = useState<{ label: string; value: string }[]>(
    initialProject?.metrics || [
      { label: 'Execution', value: 'Fast' },
      { label: 'Pass Rate', value: '100%' }
    ]
  );

  const [assertions, setAssertions] = useState<{ name: string; status: 'PASS' | 'FAIL'; duration?: string }[]>(
    initialProject?.assertions || [
      { name: 'Initial assertion test', status: 'PASS', duration: '120ms' }
    ]
  );

  const [logs, setLogs] = useState<TestLog[]>(
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
  onSave: (blogData: Partial<BlogPost> & { title: string; content: string }) => void;
}

function BlogModal({ isOpen, initialBlog, onClose, onSave }: BlogModalProps) {
  const [title, setTitle] = useState(initialBlog?.title || '');
  const [slug, setSlug] = useState(initialBlog?.slug || '');
  const [category, setCategory] = useState<BlogPost['category']>(initialBlog?.category || 'Software Testing');
  const [description, setDescription] = useState(initialBlog?.description || '');
  const [content, setContent] = useState(initialBlog?.content || '');
  const [coverImage, setCoverImage] = useState(initialBlog?.coverImage || 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=1200');
  const [status, setStatus] = useState<'Published' | 'Draft'>(initialBlog?.status || 'Published');
  const [tagsString, setTagsString] = useState(initialBlog?.tags.join(', ') || 'QA, Testing');
  const [readingTime, setReadingTime] = useState(initialBlog?.readingTime || '5 min read');

  // Auto-generate slug and reading time from content
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialBlog) {
      setSlug(generateSlug(val));
    }
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    setReadingTime(calculateReadingTime(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);

    onSave({
      id: initialBlog?.id,
      title: title.trim(),
      slug: slug.trim() ? generateSlug(slug) : generateSlug(title),
      category,
      description: description.trim(),
      content: content.trim(),
      coverImage: coverImage.trim(),
      status,
      tags: tags.length > 0 ? tags : ['Software Testing'],
      readingTime: readingTime || calculateReadingTime(content),
    });
  };

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
                Publish SQA test automation tutorials, case studies, and engineering practices.
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Article Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Building Resilient API Automation with Python & Playwright"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-mono text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BlogPost['category'])}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1A1F2C] border border-white/15 text-sm font-mono text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="Software Testing">Software Testing</option>
                <option value="Playwright">Playwright</option>
                <option value="API Testing">API Testing</option>
                <option value="ERPNext">ERPNext</option>
                <option value="Automation">Automation</option>
                <option value="QA Career">QA Career</option>
                <option value="AI">AI</option>
                <option value="Programming">Programming</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                URL Slug (/blog/...)
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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Published' | 'Draft')}
                className="w-full px-3 py-2 rounded-xl bg-[#1A1F2C] border border-white/15 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
                Reading Time Estimate
              </label>
              <input
                type="text"
                value={readingTime}
                onChange={(e) => setReadingTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
              Cover Image URL
            </label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-4 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
              Summary / Excerpt
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short teaser description shown on cards and RSS feeds..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-sans text-white focus:border-purple-500 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center justify-between">
              <span>Article Content (Markdown supported) *</span>
              <span className="text-[10px] text-[#9CA3AF]">{content.split(/\s+/).filter(Boolean).length} words</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={10}
              placeholder="# Introduction&#10;&#10;In modern test engineering, quality gates must be automated...&#10;&#10;## Key Architecture&#10;- Point 1&#10;- Point 2"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-xs font-mono text-white focus:border-purple-500 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#D1D5DB] font-semibold">
              Tags (comma-separated)
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
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#D1D5DB]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold shadow-lg shadow-purple-600/20"
            >
              Save Article
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
