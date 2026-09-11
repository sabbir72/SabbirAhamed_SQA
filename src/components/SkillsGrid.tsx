import { useState } from 'react';
import { ClipboardList, Play, Layers, Activity, Database, Sparkles, CheckCircle2 } from 'lucide-react';
import { SKILL_CATEGORIES } from '../data';

export default function SkillsGrid() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Manual Testing', 'Automation Testing', 'API Testing Tools', 'Performance Testing', 'Tools & Databases'];

  const filteredCategories = SKILL_CATEGORIES.filter((cat) =>
    selectedCategory === 'All' ? true : cat.category === selectedCategory
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Manual Testing':
        return <ClipboardList className="w-5 h-5 text-[#FF6B35]" />;
      case 'Automation Testing':
        return <Play className="w-5 h-5 text-[#FF6B35]" />;
      case 'API Testing Tools':
        return <Layers className="w-5 h-5 text-[#FF6B35]" />;
      case 'Performance Testing':
        return <Activity className="w-5 h-5 text-[#FF6B35]" />;
      case 'Tools & Databases':
        return <Database className="w-5 h-5 text-[#FF6B35]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#FF6B35]" />;
    }
  };

  return (
    <section id="skills" className="py-24 bg-[#0B0D12] text-[#F3F4F6] px-4 sm:px-6 border-t border-white/10 relative">
      <div id="competencies" className="absolute -top-20" />
      <div className="max-w-7xl mx-auto relative z-10 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-mono font-bold text-[#FF6B35] tracking-widest uppercase mb-1">
            CORE SKILLS & CAPABILITIES
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white">
            Testing Arsenal & Technical Skills
          </h2>
          <p className="text-[#D1D5DB] text-sm sm:text-base leading-relaxed font-light">
            Methodical manual verification, REST API assertion frameworks, modern web UI automation, SQL database auditing, and performance load benchmarking in my daily SQA toolkit.
          </p>
        </div>

        {/* Filter Category Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-mono transition-all border ${
                selectedCategory === cat
                  ? 'bg-[#FF6B35] text-white border-[#FF6B35] font-bold shadow-lg shadow-[#FF6B35]/20'
                  : 'bg-[#12151C] border-white/10 text-[#D1D5DB] hover:border-[#FF6B35]/50 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Skill Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((cat) => (
            <div
              key={cat.category}
              className="glass-card glass-card-hover rounded-2xl p-7 border border-white/10 relative group"
            >
              <div className="absolute top-5 right-5 text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                VERIFIED
              </div>

              {/* Category Header */}
              <div className="flex items-center space-x-3.5 pb-4 mb-5 border-b border-white/10">
                <div className="w-11 h-11 flex items-center justify-center bg-[#FF6B35]/10 rounded-xl border border-[#FF6B35]/20 group-hover:border-[#FF6B35] transition-colors">
                  {getCategoryIcon(cat.category)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    {cat.category}
                  </h3>
                  <p className="text-xs text-[#9CA3AF] font-mono">
                    {cat.items.length} Primary Frameworks & Skills
                  </p>
                </div>
              </div>

              {/* Skills Items List */}
              <ul className="space-y-3">
                {cat.items.map((item) => (
                  <li key={item} className="flex items-center space-x-2.5 text-xs text-[#F3F4F6]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B35] shrink-0" />
                    <span className="leading-relaxed font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



