import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, ArrowRight, Check, Copy, Code, BookOpen } from 'lucide-react';
import { PERSONAL_INFO } from '../data';
import { navigateTo } from '../utils/router';
import { getStoredProfile, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolioStore';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800';

interface HeroProps {
  onOpenResumeBuilder?: () => void;
  onOpenCoverLetter?: () => void;
}

export default function Hero({ onOpenResumeBuilder, onOpenCoverLetter }: HeroProps) {
  const [profile, setProfile] = useState(() => getStoredProfile());
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setProfile(getStoredProfile());
    };
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, handleUpdate);
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(profile.email || PERSONAL_INFO.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const primaryAvatar = profile.avatar || PERSONAL_INFO.avatar || '/sabbir_avatar.jpeg';

  const stats = [
    { value: profile.experienceYears || '2+ Years', label: 'Experience' },
    { value: profile.testCasesCount || '150+', label: 'Test Cases' },
    { value: profile.bugsReportedCount || '100+', label: 'Bugs Reported' },
    { value: profile.automationScriptsCount || '20+', label: 'Automation Scripts' },
    { value: profile.defectDetectionRate || '95%', label: 'Defect Detection' }
  ];

  return (
    <section id="about" className="relative min-h-screen pt-32 lg:pt-36 pb-20 flex flex-col justify-center bg-[var(--color-dark-bg,#080B11)] text-[#F3F4F6] overflow-hidden transition-colors duration-300">
      {/* Glow Effects */}
      <div 
        className="absolute top-1/4 right-10 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-all duration-500" 
        style={{ backgroundColor: 'var(--color-accent-glow, rgba(0, 210, 255, 0.2))' }}
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-10 left-10 w-80 h-80 rounded-full blur-[120px] pointer-events-none opacity-40 transition-all duration-500" 
        style={{ backgroundColor: 'var(--color-accent-hover, #0284C7)' }}
        aria-hidden="true" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
          
          {/* Left Content Column */}
          <div className="lg:col-span-7 flex flex-col space-y-6 sm:space-y-7">
            {/* Main Title Headlines */}
            <div className="space-y-3.5">
              <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.08]">
                Hi, I'm <span className="text-[var(--color-accent)]">{profile.name}</span>
              </h1>
              <p className="font-display font-bold text-lg sm:text-2xl text-[#F3F4F6]">
                {profile.title}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <span className="px-3 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs font-mono text-[#D1D5DB] font-medium">
                  Manual QA
                </span>
                <span className="px-3 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs font-mono text-[#D1D5DB] font-medium">
                  API Testing
                </span>
                <span className="px-3 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs font-mono text-[#D1D5DB] font-medium">
                  Automation Testing (Basic & continuous learning)
                </span>
                <span className="px-3 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs font-mono text-[#D1D5DB] font-medium">
                  Mobile Testing (Basic & continuous learning)
                </span>
              </div>
            </div>

            {/* Mobile Hero Profile Avatar (Shown cleanly centered on mobile screens < lg) */}
            <div className="block lg:hidden my-2 sm:my-3">
              <div className="relative w-full max-w-[220px] sm:max-w-[270px] md:max-w-[320px] mx-auto">
                <div className="glass-card rounded-2xl p-3 sm:p-4 border border-white/10 relative overflow-hidden flex flex-col items-center shadow-2xl">
                  {/* Lighting Halo */}
                  <div 
                    className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-2xl pointer-events-none opacity-60" 
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  />

                  {/* Centered Profile Photo Frame */}
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-white/15 shadow-2xl group bg-[#0E1422]">
                    <img
                      src={primaryAvatar}
                      alt={`${profile.name} - ${profile.title}`}
                      className="w-full h-full object-cover object-center"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_AVATAR;
                      }}
                    />

                    {/* Gradient Overlay at Bottom of Image */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--color-dark-bg,#080B11)] via-[var(--color-dark-bg,#080B11)]/80 to-transparent p-2.5 flex flex-col justify-end pointer-events-none">
                      <p className="text-[9px] font-mono text-[var(--color-accent)] font-bold tracking-wider uppercase">SQA Engineer</p>
                      <h4 className="font-display font-extrabold text-sm sm:text-base text-white tracking-tight leading-tight">{profile.name}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Summary Paragraph */}
            <div className="py-1 w-full">
              <p className="text-[#D1D5DB] text-base sm:text-lg font-light leading-[1.8] sm:leading-[1.85] w-full text-justify [text-justify:inter-word] tracking-normal">
                {profile.objective || (
                  <>
                    Software Quality Assurance Engineer with <span className="font-semibold text-white">2+ years of hands-on experience</span> in 
                    <span className="font-semibold text-white"> Manual Testing, API Testing, and Web Application Testing</span>. 
                    Experienced in designing comprehensive test cases, executing functional, regression, and exploratory testing, validating REST APIs, and reporting defects with a strong focus on software quality and user experience. Currently expanding my expertise in 
                    <span className="font-semibold text-white"> UI Automation using Playwright (Python)</span>, 
                    <span className="font-semibold text-white"> Mobile Testing</span>, and 
                    <span className="font-semibold text-white"> CI/CD with GitHub Actions</span>.
                  </>
                )}
              </p>
            </div>

            {/* Contact Pills */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <button
                onClick={handleCopyEmail}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-[var(--color-accent)] text-[#D1D5DB] hover:text-white transition-all cursor-pointer"
                title="Click to copy email"
              >
                <Mail className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>{profile.email}</span>
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#9CA3AF]" />}
              </button>

              <a
                href={`tel:${profile.phone}`}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-[var(--color-accent)] text-[#D1D5DB] hover:text-white transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>{profile.phone}</span>
              </a>

              <div className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-[var(--color-accent)] text-[#D1D5DB] transition-all">
                <MapPin className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>{profile.location}</span>
              </div>
            </div>

            {/* Action Buttons: Hire Me & View Projects */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {/* Primary: Hire Me */}
              <a
                href="#contact"
                className="shimmer inline-flex items-center space-x-2 text-black font-bold text-sm px-6 py-3.5 rounded-full shadow-lg transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  boxShadow: '0 10px 25px -5px var(--color-accent-glow)'
                }}
              >
                <Mail className="w-4 h-4" />
                <span>Hire Me</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              {/* Secondary: View Projects */}
              <a
                href="#projects"
                className="inline-flex items-center space-x-2 bg-white/[0.05] hover:bg-white/10 text-white border border-white/15 hover:border-[var(--color-accent)] font-semibold text-sm px-6 py-3.5 rounded-full transition-all hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer"
              >
                <Code className="w-4 h-4 text-[var(--color-accent)]" />
                <span>View Projects</span>
              </a>

              {/* Tertiary: Read Blog */}
              <a
                href="/blog"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/blog');
                }}
                className="inline-flex items-center space-x-2 bg-white/[0.03] hover:bg-white/[0.08] text-[#D1D5DB] hover:text-white border border-white/10 hover:border-[var(--color-accent)] font-semibold text-sm px-6 py-3.5 rounded-full transition-all hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[var(--color-accent)]" />
                <span>Read Blog</span>
              </a>
            </div>
          </div>

          {/* Right Column: Refined & Spacious Hero Profile Card (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-5 justify-end items-center">
            <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-[430px]">
              {/* Main Glassmorphism Profile Card */}
              <div className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 relative overflow-hidden flex flex-col items-center">
                {/* Lighting Halo */}
                <div 
                  className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-50 transition-all duration-500" 
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />

                {/* Centered Profile Photo Frame */}
                <div className="relative w-full aspect-square sm:aspect-[4/4.2] rounded-2xl overflow-hidden border border-white/15 shadow-2xl group bg-[#0E1422]">
                  <img
                    src={primaryAvatar}
                    alt={`${profile.name} - ${profile.title}`}
                    className="w-full h-full object-cover object-center"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_AVATAR;
                    }}
                  />

                  {/* Gradient Overlay at Bottom of Image */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--color-dark-bg,#080B11)] via-[var(--color-dark-bg,#080B11)]/75 to-transparent p-4 flex flex-col justify-end pointer-events-none">
                    <p className="text-[11px] font-mono text-[var(--color-accent)] font-bold tracking-wider uppercase truncate">{profile.title}</p>
                    <h4 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight truncate">{profile.name}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real & Manually Updated Statistics Banner */}
        <div className="mt-20 pt-8 border-t border-white/10 space-y-4">
          <div className="flex items-center">
            <span className="text-xs sm:text-sm font-mono text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-2 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>This section real and manually updated</span>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="glass-card glass-card-hover p-5 rounded-2xl border border-white/10 text-center space-y-1"
              >
                <p className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                  {stat.value.includes('%') ? <span className="text-[var(--color-accent)]">{stat.value}</span> : stat.value}
                </p>
                <p className="text-xs font-mono text-[#9CA3AF] uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
