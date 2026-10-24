/**
 * ----------------------------------------------------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Component   : Footer
 * Description : Clean, modern 3-column executive footer featuring:
 *               - Column 1: Brand Logo
 *               - Column 2: Quick Navigation Links
 *               - Column 3: Contact & Social Logos with Hover-to-Reveal Info
 *               - Sub-footer with Copyright, Traffic Counter, Admin Access & Back to Top.
 * ----------------------------------------------------------------------------------
 */

import React, { useState } from 'react';
import { 
  Github, 
  Linkedin, 
  Mail, 
  Phone, 
  MapPin, 
  ArrowUp, 
  Check, 
  Copy,
  ExternalLink,
  X 
} from 'lucide-react';
import { PERSONAL_INFO } from '../data';
import { QaLogo } from './QaLogo';
import VisitorCounter from './VisitorCounter';
import { navigateTo, navigateToHomeSection } from '../utils/router';

interface FooterProps {
  onOpenVisitingCard?: () => void;
  onOpenResumeBuilder?: () => void;
  onOpenCoverLetter?: () => void;
}

type ContactTab = 'email' | 'phone' | 'location' | 'github' | 'linkedin';

export default function Footer(_props: FooterProps) {
  const [hoveredTab, setHoveredTab] = useState<ContactTab | null>(null);
  const [selectedTab, setSelectedTab] = useState<ContactTab | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const currentTab = hoveredTab || selectedTab;

  const toggleTab = (tab: ContactTab) => {
    setSelectedTab((prev) => (prev === tab ? null : tab));
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(PERSONAL_INFO.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'About Me', href: '#about' },
    { label: 'Skills & Arsenal', href: '#skills' },
    { label: 'Featured Projects', href: '#projects' },
    { label: 'Experience Timeline', href: '#experience' },
    { label: 'Mission & Vision', href: '#career-vision' },
    { label: 'Education & Certs', href: '#education' },
    { label: 'Technical Blog', href: '/blog', isRoute: true },
    { label: 'Get in Touch', href: '#contact' },
  ];

  const handleLinkClick = (e: React.MouseEvent, href: string, isRoute?: boolean) => {
    e.preventDefault();
    if (isRoute) {
      navigateTo(href);
    } else {
      navigateToHomeSection(href);
    }
  };

  const linkedinUrl = PERSONAL_INFO.linkedin.startsWith('http')
    ? PERSONAL_INFO.linkedin
    : `https://${PERSONAL_INFO.linkedin}`;

  return (
    <footer className="relative z-10 bg-black/60 backdrop-blur-md border-t border-white/10 text-[#F3F4F6] transition-colors duration-300">
      {/* Top Subtle Accent Gradient Glow Line */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent,#00D2FF)]/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
        {/* Main 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-white/[0.08] items-start">
          
          {/* Column 1: Brand Logo (4 Cols on LG) */}
          <div className="lg:col-span-4 flex items-start">
            <div className="flex items-center space-x-3">
              <QaLogo variant="footer" />
            </div>
          </div>

          {/* Column 2: Quick Navigation (4 Cols on LG) */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-white border-b border-white/10 pb-2">
              Navigation
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs font-mono">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => handleLinkClick(e, link.href, link.isRoute)}
                    className="text-[#9CA3AF] hover:text-[var(--color-accent)] transition-colors inline-block cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact & Social Logos with Hover-to-Reveal Info (4 Cols on LG) */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-white border-b border-white/10 pb-2">
              Connect Directly
            </h4>
            
            <div className="space-y-3">
              {/* Row of Contact Logos / Icons */}
              <div 
                className="flex items-center gap-2.5"
                onMouseLeave={() => setHoveredTab(null)}
              >
                {/* Email Logo */}
                <div className="relative group/tip">
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredTab('email')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTab('email');
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      currentTab === 'email'
                        ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20 scale-105'
                        : 'bg-white/[0.04] hover:bg-white/[0.10] border-white/10 hover:border-[var(--color-accent)] text-[#D1D5DB] hover:text-white'
                    }`}
                    title="Email"
                    aria-label="Email"
                  >
                    <Mail className="w-5 h-5 text-[var(--color-accent)]" />
                  </button>
                  {/* Floating Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex flex-col items-center pointer-events-none z-30">
                    <span className="px-2.5 py-1 text-[11px] font-mono whitespace-nowrap rounded-lg bg-black/95 text-white border border-white/20 shadow-2xl backdrop-blur-md">
                      {PERSONAL_INFO.email}
                    </span>
                    <span className="w-2 h-2 bg-black/95 border-r border-b border-white/20 rotate-45 -mt-1" />
                  </div>
                </div>

                {/* Phone Logo */}
                <div className="relative group/tip">
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredTab('phone')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTab('phone');
                    }}
                    className={`p-3 rounded-xl border transition-all inline-flex cursor-pointer ${
                      currentTab === 'phone'
                        ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20 scale-105'
                        : 'bg-white/[0.04] hover:bg-white/[0.10] border-white/10 hover:border-[var(--color-accent)] text-[#D1D5DB] hover:text-white'
                    }`}
                    title="Phone"
                    aria-label="Phone"
                  >
                    <Phone className="w-5 h-5 text-[var(--color-accent)]" />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex flex-col items-center pointer-events-none z-30">
                    <span className="px-2.5 py-1 text-[11px] font-mono whitespace-nowrap rounded-lg bg-black/95 text-white border border-white/20 shadow-2xl backdrop-blur-md">
                      {PERSONAL_INFO.phone}
                    </span>
                    <span className="w-2 h-2 bg-black/95 border-r border-b border-white/20 rotate-45 -mt-1" />
                  </div>
                </div>

                {/* Location Logo */}
                <div className="relative group/tip">
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredTab('location')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTab('location');
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      currentTab === 'location'
                        ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20 scale-105'
                        : 'bg-white/[0.04] hover:bg-white/[0.10] border-white/10 hover:border-[var(--color-accent)] text-[#D1D5DB] hover:text-white'
                    }`}
                    title="Location"
                    aria-label="Location"
                  >
                    <MapPin className="w-5 h-5 text-[var(--color-accent)]" />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex flex-col items-center pointer-events-none z-30">
                    <span className="px-2.5 py-1 text-[11px] font-mono whitespace-nowrap rounded-lg bg-black/95 text-white border border-white/20 shadow-2xl backdrop-blur-md">
                      Dhaka, Bangladesh
                    </span>
                    <span className="w-2 h-2 bg-black/95 border-r border-b border-white/20 rotate-45 -mt-1" />
                  </div>
                </div>

                {/* GitHub Logo */}
                <div className="relative group/tip">
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredTab('github')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTab('github');
                    }}
                    className={`p-3 rounded-xl border transition-all inline-flex cursor-pointer ${
                      currentTab === 'github'
                        ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20 scale-105'
                        : 'bg-white/[0.04] hover:bg-white/[0.10] border-white/10 hover:border-[var(--color-accent)] text-[#D1D5DB] hover:text-white'
                    }`}
                    title="GitHub"
                    aria-label="GitHub"
                  >
                    <Github className="w-5 h-5 text-[var(--color-accent)]" />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex flex-col items-center pointer-events-none z-30">
                    <span className="px-2.5 py-1 text-[11px] font-mono whitespace-nowrap rounded-lg bg-black/95 text-white border border-white/20 shadow-2xl backdrop-blur-md">
                      github.com/{PERSONAL_INFO.githubUser || 'sabbir72'}
                    </span>
                    <span className="w-2 h-2 bg-black/95 border-r border-b border-white/20 rotate-45 -mt-1" />
                  </div>
                </div>

                {/* LinkedIn Logo */}
                <div className="relative group/tip">
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredTab('linkedin')}
                    onMouseLeave={() => setHoveredTab(null)}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTab('linkedin');
                    }}
                    className={`p-3 rounded-xl border transition-all inline-flex cursor-pointer ${
                      currentTab === 'linkedin'
                        ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20 scale-105'
                        : 'bg-white/[0.04] hover:bg-white/[0.10] border-white/10 hover:border-[var(--color-accent)] text-[#D1D5DB] hover:text-white'
                    }`}
                    title="LinkedIn"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5 text-[var(--color-accent)]" />
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:flex flex-col items-center pointer-events-none z-30">
                    <span className="px-2.5 py-1 text-[11px] font-mono whitespace-nowrap rounded-lg bg-black/95 text-white border border-white/20 shadow-2xl backdrop-blur-md">
                      linkedin.com/in/sabbir-ahamed72
                    </span>
                    <span className="w-2 h-2 bg-black/95 border-r border-b border-white/20 rotate-45 -mt-1" />
                  </div>
                </div>
              </div>

              {/* Dynamic Info Reveal Panel: Only rendered when hovered or clicked */}
              {currentTab && (
                <div className="p-3 rounded-xl bg-white/[0.04] border border-[var(--color-accent)]/30 backdrop-blur-md transition-all flex items-center justify-between text-xs font-mono shadow-lg shadow-black/40 animate-fadeIn">
                  {currentTab === 'email' && (
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        <Mail className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                        <span className="text-white font-medium truncate">{PERSONAL_INFO.email}</span>
                      </div>
                      <button
                        onClick={handleCopyEmail}
                        className="ml-2 px-2.5 py-1 rounded-md bg-[var(--color-accent)]/15 hover:bg-[var(--color-accent)]/25 text-[var(--color-accent)] text-[11px] flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}

                  {currentTab === 'phone' && (
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                        <span className="text-white font-medium">{PERSONAL_INFO.phone}</span>
                      </div>
                      <a
                        href={`tel:${PERSONAL_INFO.phone}`}
                        className="ml-2 px-2.5 py-1 rounded-md bg-[var(--color-accent)]/15 hover:bg-[var(--color-accent)]/25 text-[var(--color-accent)] text-[11px] transition-colors shrink-0"
                      >
                        Call Now
                      </a>
                    </div>
                  )}

                  {currentTab === 'location' && (
                    <div className="w-full flex items-center space-x-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                      <span className="text-white font-medium">{PERSONAL_INFO.location}</span>
                    </div>
                  )}

                  {currentTab === 'github' && (
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        <Github className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                        <span className="text-white font-medium truncate">github.com/{PERSONAL_INFO.githubUser || 'sabbir72'}</span>
                      </div>
                      <a
                        href={PERSONAL_INFO.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 px-2.5 py-1 rounded-md bg-[var(--color-accent)]/15 hover:bg-[var(--color-accent)]/25 text-[var(--color-accent)] text-[11px] transition-colors shrink-0 flex items-center space-x-1"
                      >
                        <span>Visit Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {currentTab === 'linkedin' && (
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        <Linkedin className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                        <span className="text-white font-medium truncate">linkedin.com/in/sabbir-ahamed72</span>
                      </div>
                      <a
                        href={linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 px-2.5 py-1 rounded-md bg-[var(--color-accent)]/15 hover:bg-[var(--color-accent)]/25 text-[var(--color-accent)] text-[11px] transition-colors shrink-0 flex items-center space-x-1"
                      >
                        <span>Connect</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {selectedTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTab(null);
                        setHoveredTab(null);
                      }}
                      className="ml-2 p-1 text-white/40 hover:text-white rounded hover:bg-white/10 transition-colors shrink-0"
                      title="Hide info"
                      aria-label="Hide info"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Sub-Footer Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-[#9CA3AF]">
          
          {/* Copyright */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-center md:text-left">
            <p>© {new Date().getFullYear()} Sabbir Ahamed. All rights reserved.</p>
          </div>

          {/* Traffic Counter & Admin Session Info & Back to Top */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
            {/* Live Traffic Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs">
              <span className="text-[#9CA3AF]">Traffic:</span>
              <VisitorCounter variant="navbar" tooltipPlacement="top" />
            </div>

            {/* Back to Top Button */}
            <button
              onClick={scrollToTop}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 hover:border-[var(--color-accent)] text-[#D1D5DB] hover:text-white transition-all cursor-pointer shadow-sm group"
              title="Scroll to Top"
              aria-label="Back to Top"
            >
              <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

        </div>
      </div>
    </footer>
  );
}
