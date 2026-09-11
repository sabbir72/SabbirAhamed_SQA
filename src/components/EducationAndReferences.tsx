import { useState } from 'react';
import { GraduationCap, Award, User, Mail, Phone, Building2, Copy, Check } from 'lucide-react';
import { EDUCATION_HISTORY, PROFESSIONAL_REFERENCES } from '../data';

export default function EducationAndReferences() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const ref = PROFESSIONAL_REFERENCES[0];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <section id="education" className="py-24 bg-[#0B0D12] text-[#F3F4F6] px-4 sm:px-6 border-t border-white/10 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Education & Courses (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <p className="text-xs font-mono font-bold text-[#FF6B35] tracking-widest uppercase mb-1">
                ACADEMIC CREDENTIALS
              </p>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                Education & Certifications
              </h2>
            </div>

            <div className="space-y-4">
              {EDUCATION_HISTORY.map((edu) => (
                <div
                  key={edu.id}
                  className="glass-card glass-card-hover p-7 rounded-2xl border border-white/10 relative group"
                >
                  <div className="absolute top-7 right-7 text-[#9CA3AF] group-hover:text-[#FF6B35] transition-colors">
                    {edu.degree.includes('COURSE') ? (
                      <Award className="w-5 h-5" />
                    ) : (
                      <GraduationCap className="w-5 h-5" />
                    )}
                  </div>

                  <span className="text-[10px] font-mono font-bold text-[#FF6B35] bg-[#FF6B35]/10 border border-[#FF6B35]/20 px-3 py-1 rounded-full">
                    {edu.period}
                  </span>

                  <h3 className="font-display font-bold text-base sm:text-lg text-white mt-4">
                    {edu.degree}
                  </h3>
                  
                  <p className="text-sm font-semibold text-[#D1D5DB] mt-1 font-mono">
                    {edu.institution}
                  </p>

                  <p className="text-xs font-mono text-[#9CA3AF] mt-1">
                    {edu.location}
                  </p>

                  {edu.details && (
                    <p className="text-xs sm:text-sm text-[#D1D5DB] leading-relaxed mt-3 pt-3 border-t border-white/10 font-light">
                      {edu.details}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SQA Professional Reference (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <p className="text-xs font-mono font-bold text-[#FF6B35] tracking-widest uppercase mb-1">
                ENDORSEMENT
              </p>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                Professional Reference
              </h2>
            </div>

            <div className="glass-card glass-card-hover p-7 sm:p-8 rounded-2xl border border-white/10 relative overflow-hidden group">
              {/* Decorative background icon */}
              <Building2 className="absolute right-4 bottom-4 w-36 h-36 text-white/5 pointer-events-none" />

              <div className="space-y-6 relative z-10">
                {/* Person details */}
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-xl text-white">
                    {ref.name}
                  </h3>
                  <p className="text-sm font-semibold font-mono text-[#FF6B35]">
                    {ref.role}
                  </p>
                  <p className="text-xs font-mono text-[#9CA3AF]">
                    {ref.company}
                  </p>
                </div>

                <p className="text-[#D1D5DB] text-xs sm:text-sm leading-relaxed italic font-light">
                  "Sabbir possesses robust attention to detail, strong grasp over STLC principles, and handles manual and automated testing routines with extreme consistency."
                </p>

                {/* Contact details with quick copy */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  {/* Email */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs hover:border-[#FF6B35]/50 transition-colors">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Mail className="w-4 h-4 text-[#FF6B35] shrink-0" />
                      <span className="text-[#F3F4F6] truncate font-mono select-all">{ref.email}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(ref.email, 'email')}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#FF6B35] hover:bg-white/10 rounded-lg transition-colors shrink-0"
                      title="Copy email to clipboard"
                    >
                      {copiedField === 'email' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs hover:border-[#FF6B35]/50 transition-colors">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Phone className="w-4 h-4 text-[#FF6B35] shrink-0" />
                      <span className="text-[#F3F4F6] truncate font-mono select-all">{ref.phone}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(ref.phone, 'phone')}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#FF6B35] hover:bg-white/10 rounded-lg transition-colors shrink-0"
                      title="Copy phone to clipboard"
                    >
                      {copiedField === 'phone' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}


