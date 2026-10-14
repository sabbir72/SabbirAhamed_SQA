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

export default function Navbar({ 
  onOpenResumeBuilder, 
  onOpenCoverLetter, 
  currentPath = '/' 
}: NavbarProps) {
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
          ? 'bg-[var(--color-dark-bg,#080B11)]/90 backdrop-blur-md shadow-2xl border-b border-white/10 py-3' 
          : 'bg-transparent border-b border-white/[0.06] py-4'
      }`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4" aria-label="Main navigation">
          {/* Brand Logo */}
          <a href="#about" onClick={handleLogoClick} className="flex items-center space-x-2.5 group shrink-0">
            <div className="bg-[var(--color-accent)]/10 p-2 rounded-xl border border-[var(--color-accent)]/25 group-hover:border-[var(--color-accent)] transition-colors">
              <ShieldCheck className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <span className="font-display font-extrabold text-lg tracking-tight text-white whitespace-nowrap">
                Sabbir<span className="text-[var(--color-accent)]">.QA</span>
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <ul className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-xs xl:text-sm font-medium whitespace-nowrap flex-nowrap">
            {navItems.map((item) => {
              const isActive = item.href === '/blog' && isBlogActive;
              return (
                <li key={item.label} className="shrink-0 whitespace-nowrap">
                  <a 
                    href={item.href} 
                    onClick={(e) => handleNavClick(e, item)}
                    className={`nav-link whitespace-nowrap transition-colors py-1 cursor-pointer block ${
                      isActive
                        ? 'text-[var(--color-accent)] font-bold border-b-2 border-[var(--color-accent)]'
                        : 'text-[#D1D5DB] hover:text-[var(--color-accent)]'
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
              className="w-9 h-9 flex items-center justify-center text-[#D1D5DB] hover:text-white bg-white/[0.05] hover:bg-white/10 rounded-full border border-white/10 hover:border-[var(--color-accent)] transition-colors"
              title="GitHub Profile"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href={PERSONAL_INFO.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center text-[#D1D5DB] hover:text-white bg-white/[0.05] hover:bg-white/10 rounded-full border border-white/10 hover:border-[var(--color-accent)] transition-colors"
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
              className="hidden sm:inline-flex items-center space-x-1.5 shimmer text-black font-bold px-4 py-2 rounded-full text-xs shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: 'var(--color-accent)',
                boxShadow: '0 10px 25px -5px var(--color-accent-glow, rgba(0,210,255,0.3))'
              }}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Hire Me</span>
            </a>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center text-white rounded-full bg-white/[0.05] border border-white/10"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[var(--color-accent)]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[var(--color-dark-bg,#080B11)]/95 backdrop-blur-xl border-t border-white/10 px-6 py-6 space-y-3 text-sm font-medium text-[#D1D5DB] shadow-2xl animate-fadeIn">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={`block py-2 transition-colors border-b border-white/[0.04] cursor-pointer ${
                  item.isRoute && isBlogActive ? 'text-[var(--color-accent)] font-bold' : 'hover:text-[var(--color-accent)]'
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
                className="flex items-center justify-center space-x-2 w-full py-3 shimmer text-black font-bold rounded-full text-xs shadow-lg cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  boxShadow: '0 8px 20px -5px var(--color-accent-glow)'
                }}
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
