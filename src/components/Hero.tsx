import { useState } from 'react';
import { Mail, Phone, MapPin, ArrowRight, Check, Copy, Code, FileText, BookOpen } from 'lucide-react';
import { PERSONAL_INFO } from '../data';
import { navigateTo } from '../utils/router';
import sabbirAvatar from '../assets/images/sabbir_avatar_1784300099360.jpg';

const PRIMARY_AVATAR = sabbirAvatar || PERSONAL_INFO.avatar || '/sabbir_avatar.jpg';
const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800';

interface HeroProps {
  onOpenResumeBuilder?: () => void;
  onOpenCoverLetter?: () => void;
}

export default function Hero({ onOpenResumeBuilder, onOpenCoverLetter }: HeroProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(PERSONAL_INFO.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const stats = [
    { value: '2+ Years', label: 'Experience' },
    { value: '150+', label: 'Test Cases' },
    { value: '100+', label: 'Bugs Reported' },
    { value: '20+', label: 'Automation Scripts' },
    { value: '95%', label: 'Defect Detection' }
  ];

  return (
    <section id="about" className="relative min-h-screen pt-32 lg:pt-36 pb-20 flex flex-col justify-center bg-[#0B0D12] text-[#F3F4F6] overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-[#FF6B35]/10 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
          
          {/* Left Content Column */}
          <div className="lg:col-span-7 flex flex-col space-y-6 sm:space-y-7">
            {/* Main Title Headlines */}
            <div className="space-y-3.5">
              <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.08]">
                Hi, I'm <span className="text-[#FF6B35]">Sabbir Ahamed</span>
              </h1>
              <p className="font-display font-bold text-lg sm:text-2xl text-[#F3F4F6]">
                Software Quality Assurance Engineer
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <span className="px-3 py-1 rounded-md bg-[#12151C] border border-white/10 text-xs font-mono text-[#D1D5DB] font-medium">
                  Manual QA
                </span>
                <span className="px-3 py-1 rounded-md bg-[#12151C] border border-white/10 text-xs font-mono text-[#D1D5DB] font-medium">
                  API Testing
                </span>
                <span className="px-3 py-1 rounded-md bg-[#12151C] border border-white/10 text-xs font-mono text-[#D1D5DB] font-medium">
                  Automation Testing (Basic & continuous learning)
                </span>
                <span className="px-3 py-1 rounded-md bg-[#12151C] border border-white/10 text-xs font-mono text-[#D1D5DB] font-medium">
                  Mobile Testing (Basic & continuous learning)
                </span>
              </div>
            </div>

            {/* Mobile Hero Profile Avatar (Shown cleanly centered on mobile screens < lg) */}
            <div className="block lg:hidden my-2 sm:my-3">
              <div className="relative w-full max-w-[220px] sm:max-w-[270px] md:max-w-[320px] mx-auto">
                <div className="glass-card rounded-2xl p-3 sm:p-4 border border-white/10 relative overflow-hidden flex flex-col items-center shadow-2xl">
                  {/* Lighting Halo */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#FF6B35]/20 rounded-full blur-2xl pointer-events-none" />

                  {/* Centered Profile Photo Frame */}
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-white/15 shadow-2xl group bg-[#12151C]">
                    <img
                      src={PRIMARY_AVATAR}
                      alt="Sabbir Ahamed - Software QA Engineer"
                      className="w-full h-full object-cover object-center"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_AVATAR;
                      }}
                    />

                    {/* Gradient Overlay at Bottom of Image */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0B0D12] via-[#0B0D12]/80 to-transparent p-2.5 flex flex-col justify-end pointer-events-none">
                      <p className="text-[9px] font-mono text-[#FF6B35] font-bold tracking-wider uppercase">SQA Engineer</p>
                      <h4 className="font-display font-extrabold text-sm sm:text-base text-white tracking-tight leading-tight">Sabbir Ahamed</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Summary Paragraph */}
            <div className="py-1 w-full">
              <p className="text-[#D1D5DB] text-base sm:text-lg font-light leading-[1.8] sm:leading-[1.85] w-full text-justify [text-justify:inter-word] tracking-normal">
                Software Quality Assurance Engineer with <span className="font-semibold text-white">2+ years of hands-on experience</span> in 
                <span className="font-semibold text-white"> Manual Testing, API Testing, and Web Application Testing</span>. 
                Experienced in designing comprehensive test cases, executing functional, regression, and exploratory testing, validating REST APIs, and reporting defects with a strong focus on software quality and user experience. Currently expanding my expertise in 
                <span className="font-semibold text-white"> UI Automation using Playwright (Python)</span>, 
                <span className="font-semibold text-white"> Mobile Testing</span>, and 
                <span className="font-semibold text-white"> CI/CD with GitHub Actions</span>. Passionate about continuous learning and leveraging modern QA tools and best practices to help teams deliver reliable, secure, and high-quality software.
              </p>
            </div>

            {/* Contact Pills */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <button
                onClick={handleCopyEmail}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-[#12151C] border border-white/10 hover:border-[#FF6B35] text-[#D1D5DB] hover:text-white transition-all cursor-pointer"
                title="Click to copy email"
              >
                <Mail className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>{PERSONAL_INFO.email}</span>
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#9CA3AF]" />}
              </button>

              <a
                href={`tel:${PERSONAL_INFO.phone}`}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-[#12151C] border border-white/10 hover:border-[#FF6B35] text-[#D1D5DB] hover:text-white transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>{PERSONAL_INFO.phone}</span>
              </a>

              <div className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-[#12151C] border border-white/10 hover:border-[#FF6B35] text-[#D1D5DB] transition-all">
                <MapPin className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>{PERSONAL_INFO.location}</span>
              </div>
            </div>

            {/* Action Buttons: Hire Me & View Projects */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {/* Primary: Hire Me */}
              <a
                href="#contact"
                className="shimmer inline-flex items-center space-x-2 bg-[#FF6B35] hover:bg-[#FF814F] text-white font-semibold text-sm px-6 py-3.5 rounded-full shadow-lg shadow-[#FF6B35]/25 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Mail className="w-4 h-4" />
                <span>Hire Me</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              {/* Secondary: View Projects */}
              <a
                href="#projects"
                className="inline-flex items-center space-x-2 bg-[#12151C] hover:bg-white/10 text-white border border-white/20 hover:border-white/40 font-semibold text-sm px-6 py-3.5 rounded-full transition-all hover:scale-[1.02] active:scale-95 shadow-md"
              >
                <Code className="w-4 h-4 text-[#FF6B35]" />
                <span>View Projects</span>
              </a>

              {/* Tertiary: Read Blog */}
              <a
                href="/blog"
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo('/blog');
                }}
                className="inline-flex items-center space-x-2 bg-white/5 hover:bg-white/15 text-[#D1D5DB] hover:text-white border border-white/15 hover:border-[#FF6B35] font-semibold text-sm px-6 py-3.5 rounded-full transition-all hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#FF6B35]" />
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
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-56 bg-[#FF6B35]/20 rounded-full blur-3xl pointer-events-none" />

                {/* Centered Profile Photo Frame */}
                <div className="relative w-full aspect-square sm:aspect-[4/4.2] rounded-2xl overflow-hidden border border-white/15 shadow-2xl group bg-[#12151C]">
                  <img
                    src={PRIMARY_AVATAR}
                    alt="Sabbir Ahamed - Software QA Engineer"
                    className="w-full h-full object-cover object-center"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_AVATAR;
                    }}
                  />

                  {/* Gradient Overlay at Bottom of Image */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B0D12] via-[#0B0D12]/75 to-transparent p-4 flex flex-col justify-end pointer-events-none">
                    <p className="text-[11px] font-mono text-[#FF6B35] font-bold tracking-wider uppercase">SQA Engineer</p>
                    <h4 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">Sabbir Ahamed</h4>
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
                  {stat.value.includes('%') ? <span className="text-[#FF6B35]">{stat.value}</span> : stat.value}
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



