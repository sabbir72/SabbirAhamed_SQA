import { useState, useEffect } from 'react';
import { ShieldCheck, Github, Linkedin, Mail, Menu, X } from 'lucide-react';
import { PERSONAL_INFO } from '../data';
import { navigateTo, navigateToHomeSection } from '../utils/router';

interface NavbarProps {
  dark?: boolean;
  setDark?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenResumeBuilder?: () => void;
  onOpenCoverLetter?: () => void;
  currentPath?: string;
}

export default function Navbar({ onOpenResumeBuilder, onOpenCoverLetter, currentPath = '/' }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      const totalHeight = document.body.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setReadingProgress(Math.min(100, Math.round((window.scrollY / totalHeight) * 100)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'About', href: '#about', isRoute: false },
    { label: 'Skills', href: '#skills', isRoute: false },
    { label: 'Projects', href: '#projects', isRoute: false },
    { label: 'Experience', href: '#experience', isRoute: false },
    { label: 'Mission & Vision', href: '#career-vision', isRoute: false },
    { label: 'Education', href: '#education', isRoute: false },
    { label: 'Blog', href: '/blog', isRoute: true },
    { label: 'Contact', href: '#contact', isRoute: false },
  ];

  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (item.isRoute) {
      navigateTo(item.href);
    } else {
      navigateToHomeSection(item.href);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    navigateToHomeSection('#about');
  };

  const isBlogActive = currentPath.startsWith('/blog');

  return (
    <>
      {/* Top Reading Progress Bar */}
      <div 
        className="progress-bar" 
        style={{ width: `${readingProgress}%` }} 
        role="progressbar" 
        aria-valuenow={readingProgress} 
        aria-valuemin={0} 
        aria-valuemax={100}
      />

      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#0B0D12]/90 backdrop-blur-md shadow-2xl border-b border-white/10 py-3' 
          : 'bg-transparent border-b border-white/[0.06] py-4'
      }`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4" aria-label="Main navigation">
          {/* Brand Logo */}
          <a href="#about" onClick={handleLogoClick} className="flex items-center space-x-2.5 group shrink-0">
            <div className="bg-[#FF6B35]/10 p-2 rounded-xl border border-[#FF6B35]/20 group-hover:border-[#FF6B35] transition-colors">
              <ShieldCheck className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div>
              <span className="font-display font-extrabold text-lg tracking-tight text-white whitespace-nowrap">
                Sabbir<span className="text-[#FF6B35]">.QA</span>
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links - STRICT UNIFIED LIST IN 1 LINE */}
          <ul className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-xs xl:text-sm font-medium whitespace-nowrap flex-nowrap">
            {navItems.map((item) => {
              const isActive = item.isRoute && isBlogActive;
              return (
                <li key={item.label} className="shrink-0 whitespace-nowrap">
                  <a 
                    href={item.href} 
                    onClick={(e) => handleNavClick(e, item)}
                    className={`nav-link whitespace-nowrap transition-colors py-1 cursor-pointer block ${
                      isActive
                        ? 'text-[#FF6B35] font-bold border-b-2 border-[#FF6B35]'
                        : 'text-[#D1D5DB] hover:text-[#FF6B35]'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* Right Action Icons & Direct CTAs */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <a
              href={PERSONAL_INFO.github}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center text-[#D1D5DB] hover:text-white bg-[#12151C] rounded-full border border-white/10 hover:border-[#FF6B35] transition-colors"
              title="GitHub Profile"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href={PERSONAL_INFO.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center text-[#D1D5DB] hover:text-white bg-[#12151C] rounded-full border border-white/10 hover:border-[#FF6B35] transition-colors"
              title="LinkedIn Profile"
            >
              <Linkedin className="w-4 h-4" />
            </a>

            {/* Hire Me Primary Button */}
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                navigateToHomeSection('#contact');
              }}
              className="hidden sm:inline-flex items-center space-x-1.5 shimmer bg-[#FF6B35] hover:bg-[#FF814F] text-white font-semibold px-4 py-2 rounded-full text-xs shadow-lg shadow-[#FF6B35]/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Hire Me</span>
            </a>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center text-white rounded-full bg-[#12151C] border border-white/10"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#FF6B35]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0B0D12]/95 backdrop-blur-xl border-t border-white/10 px-6 py-6 space-y-3 text-sm font-medium text-[#D1D5DB] shadow-2xl animate-fadeIn">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={`block py-2 transition-colors border-b border-white/[0.04] cursor-pointer ${
                  item.isRoute && isBlogActive ? 'text-[#FF6B35] font-bold' : 'hover:text-[#FF6B35]'
                }`}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4">
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  navigateToHomeSection('#contact');
                }}
                className="flex items-center justify-center space-x-2 w-full py-3 shimmer bg-[#FF6B35] hover:bg-[#FF814F] text-white font-bold rounded-full text-xs shadow-lg cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Hire Me</span>
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
}




