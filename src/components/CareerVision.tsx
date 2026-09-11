import { Target, Compass, Sparkles, Rocket, CheckCircle2, ArrowRight } from 'lucide-react';

export default function CareerVision() {
  const careerFlow = [
    { step: '01', title: 'Junior SQA Engineer', type: 'completed' },
    { step: '02', title: 'SQA Engineer (Present)', type: 'active', badge: 'Active' },
    { step: '03', title: 'Senior SQA Engineer', type: 'future' },
    { step: '04', title: 'Quality Engineering Specialist', type: 'future' },
    { step: '05', title: 'QA Technical Lead / Mentor', type: 'future' },
    { step: '06', title: 'QA Platform Founder', type: 'vision', badge: 'Ultimate Goal' },
  ];

  return (
    <section id="career-vision" className="py-20 bg-[#0B0D12] text-white relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 -left-40 w-80 h-80 bg-[#FF6B35]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35] text-xs font-mono font-bold uppercase tracking-wider">
            <Compass className="w-4 h-4 text-[#FF6B35]" />
            <span>Purpose & Direction</span>
          </div>

          <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
            Mission & Vision
          </h2>

          <p className="text-[#9CA3AF] text-sm sm:text-base font-light">
            Guiding principles driving my software quality engineering journey, technical growth, and future aspirations.
          </p>
        </div>

        {/* Mission & Vision Side-by-Side Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mission Card */}
          <div className="bg-[#12151C] border border-white/10 hover:border-[#FF6B35]/40 rounded-3xl p-8 space-y-5 transition-all duration-300 relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF6B35]/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6B35]/10 border border-[#FF6B35]/30 flex items-center justify-center text-[#FF6B35]">
                <Target className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono text-[#FF6B35] uppercase tracking-wider font-bold bg-[#FF6B35]/10 px-3 py-1 rounded-full border border-[#FF6B35]/20">
                My Mission
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Deliver Flawless Software Quality & Elevate QA Standards
              </h3>
              <p className="text-[#D1D5DB] text-sm leading-relaxed font-light">
                To rigorously safeguard user experience and software reliability through high-impact manual testing, automated API verification, Playwright test frameworks, and continuous integration—ensuring every release is stable, scalable, and resilient.
              </p>
            </div>

            <ul className="space-y-2 pt-2 text-xs text-[#9CA3AF] font-sans border-t border-white/5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF6B35] shrink-0" />
                <span>Maintain 100% test coverage for critical user journeys.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF6B35] shrink-0" />
                <span>Integrate automated shift-left continuous testing in CI/CD pipelines.</span>
              </li>
            </ul>
          </div>

          {/* Vision Card */}
          <div className="bg-[#12151C] border border-white/10 hover:border-blue-500/40 rounded-3xl p-8 space-y-5 transition-all duration-300 relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Rocket className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono text-blue-400 uppercase tracking-wider font-bold bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                My Vision
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Build Quality Engineering Solutions & Empower QA Talent
              </h3>
              <p className="text-[#D1D5DB] text-sm leading-relaxed font-light">
                To evolve into a Quality Engineering Specialist & Founder of a trusted SQA solutions platform—building open-source automation tools, providing enterprise QA services, and educating the next generation of SQA engineers globally.
              </p>
            </div>

            <ul className="space-y-2 pt-2 text-xs text-[#9CA3AF] font-sans border-t border-white/5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Develop innovative, developer-friendly QA testing software.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Mentor and build educational resources for aspiring engineers.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Minimal Career Progression Flow */}
        <div className="bg-[#12151C]/60 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF6B35]" />
              <span>Career Roadmap Flow</span>
            </h3>
            <span className="text-xs font-mono text-[#9CA3AF]">Long-Term Growth</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {careerFlow.map((item, idx) => {
              const isActive = item.type === 'active';
              const isVision = item.type === 'vision';

              let cardStyle = 'bg-[#0B0D12]/70 border-white/10 text-gray-300';
              if (isActive) {
                cardStyle = 'bg-[#181C26] border-[#FF6B35] text-white shadow-lg ring-1 ring-[#FF6B35]/50';
              } else if (isVision) {
                cardStyle = 'bg-[#161224] border-purple-500/60 text-white shadow-lg ring-1 ring-purple-500/50';
              }

              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${cardStyle}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isActive 
                          ? 'bg-[#FF6B35] text-white' 
                          : isVision 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-white/10 text-gray-400'
                      }`}>
                        {item.step}
                      </span>
                      {item.badge && (
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border font-bold ${
                          isActive 
                            ? 'bg-[#FF6B35]/20 text-[#FF6B35] border-[#FF6B35]/30' 
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold leading-snug">{item.title}</h4>
                  </div>

                  {idx < careerFlow.length - 1 && (
                    <div className="hidden lg:flex justify-end mt-4">
                      <ArrowRight className={`w-3.5 h-3.5 ${isActive ? 'text-[#FF6B35]' : 'text-gray-600'}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
