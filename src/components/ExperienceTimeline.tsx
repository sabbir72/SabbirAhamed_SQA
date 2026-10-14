import { useState, useEffect } from 'react';
import { Briefcase, Calendar, MapPin, CheckCircle2, Terminal, Plus } from 'lucide-react';
import { Experience } from '../types';
import { getStoredExperiences, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolioStore';
import { isAdminAuthenticated } from '../utils/adminAuth';
import { navigateTo } from '../utils/router';

export default function ExperienceTimeline() {
  const [experiences, setExperiences] = useState<Experience[]>(() => getStoredExperiences());
  const [isAdmin, setIsAdmin] = useState(() => isAdminAuthenticated());

  useEffect(() => {
    const handleSync = () => {
      setExperiences(getStoredExperiences());
      setIsAdmin(isAdminAuthenticated());
    };
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, handleSync);
    window.addEventListener('admin_auth_changed', handleSync);
    return () => {
      window.removeEventListener(PORTFOLIO_UPDATED_EVENT, handleSync);
      window.removeEventListener('admin_auth_changed', handleSync);
    };
  }, []);

  return (
    <section id="experience" className="py-24 bg-[#0B0D12] text-[#F3F4F6] border-t border-white/10 px-4 sm:px-6 relative">
      <div className="max-w-5xl mx-auto relative z-10 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-mono font-bold text-[var(--color-accent)] tracking-widest uppercase mb-1 flex items-center justify-center gap-1.5">
            <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
            <span>CAREER TRAJECTORY</span>
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white">
            Professional Experience & Milestones
          </h2>
          <p className="text-[#D1D5DB] text-sm sm:text-base leading-relaxed font-light">
            Over 2 years of hands-on software quality engineering experience across commercial SaaS platforms, enterprise ERP systems, and ML solution deployments in Bangladesh.
          </p>

          {isAdmin && (
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => navigateTo('/admin')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono transition-all cursor-pointer"
                title="Manage Experience in Admin Portal"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Manage Experience</span>
              </button>
            </div>
          )}
        </div>

        {/* Vertical Timeline */}
        <div className="relative border-l border-white/10 ml-4 sm:ml-6 space-y-10">
          {experiences.map((exp, index) => (
            <div key={exp.id} className="relative pl-8 sm:pl-10">
              {/* Timeline Node */}
              <div className={`absolute -left-[9px] top-2 w-4 h-4 rounded-full border-2 border-[#0B0D12] flex items-center justify-center ${
                index === 0 ? 'bg-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/20' : 'bg-white/20'
              }`} />

              <div className="glass-card glass-card-hover p-7 rounded-2xl border border-white/10 space-y-5">
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-display font-bold text-lg sm:text-xl text-white">
                        {exp.role}
                      </h3>
                      {index === 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[10px] font-mono text-[var(--color-accent)] font-bold">
                          CURRENT ROLE
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-accent)] mt-0.5 font-mono">
                      {exp.company}
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end text-xs font-mono text-[#9CA3AF] space-y-1 shrink-0">
                    <span className="flex items-center space-x-1.5 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/10 text-[#D1D5DB]">
                      <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      <span>{exp.period}</span>
                    </span>
                    <span className="flex items-center space-x-1.5 pt-0.5 text-[#9CA3AF]">
                      <MapPin className="w-3.5 h-3.5 text-[#9CA3AF]" />
                      <span>{exp.location}</span>
                    </span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-3 pt-1">
                  <p className="text-[10px] font-mono font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center space-x-1">
                    <Terminal className="w-3 h-3 text-[var(--color-accent)]" />
                    <span>Core Key Deliverables & Achievements</span>
                  </p>
                  <ul className="space-y-2.5">
                    {exp.highlights.map((bullet, idx) => (
                      <li key={idx} className="flex items-start space-x-3 text-xs sm:text-sm text-[#D1D5DB] leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


