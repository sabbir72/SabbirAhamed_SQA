import { useState } from 'react';
import { ExternalLink, Github, Terminal, CheckCircle2, Filter, Layers, Code, Cpu, Activity, FileCheck } from 'lucide-react';
import { PROJECTS } from '../data';
import { Project } from '../types';

export default function Projects() {
  const [selectedType, setSelectedType] = useState<string>('All');
  const [activeModalProject, setActiveModalProject] = useState<Project | null>(null);

  const categories = ['All', 'Automation', 'API', 'Performance', 'Manual'];

  const filteredProjects = selectedType === 'All'
    ? PROJECTS
    : PROJECTS.filter((p) => p.type === selectedType);

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'Automation':
        return 'bg-[#FF6B35]/10 text-[#FF6B35] border-[#FF6B35]/30';
      case 'API':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Performance':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Manual':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      default:
        return 'bg-white/10 text-[#D1D5DB] border-white/10';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Automation':
        return <Code className="w-3.5 h-3.5 text-[#FF6B35]" />;
      case 'API':
        return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Performance':
        return <Cpu className="w-3.5 h-3.5 text-amber-400" />;
      case 'Manual':
        return <FileCheck className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-[#D1D5DB]" />;
    }
  };

  return (
    <section id="projects" className="py-24 bg-[#0B0D12] text-[#F3F4F6] border-t border-white/10 px-4 sm:px-6 relative">
      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-mono font-bold text-[#FF6B35] tracking-widest uppercase mb-1 flex items-center justify-center gap-1.5">
            <Layers className="w-4 h-4 text-[#FF6B35]" />
            <span>SQA PORTFOLIO PROJECTS</span>
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight">
            Featured Quality Assurance Projects
          </h2>
          <p className="text-[#D1D5DB] text-sm sm:text-base leading-relaxed font-light">
            A curated showcase of end-to-end automation test suites, REST API validation framework, performance load scenarios, and manual functional test planning created by Sabbir.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-center flex-wrap gap-2 pt-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedType(cat)}
              className={`px-4 py-2 rounded-full text-xs font-mono transition-all border flex items-center gap-1.5 ${
                selectedType === cat
                  ? 'bg-[#FF6B35] text-white border-[#FF6B35] font-bold shadow-lg shadow-[#FF6B35]/20'
                  : 'bg-[#12151C] border-white/10 text-[#D1D5DB] hover:border-[#FF6B35]/50 hover:text-white'
              }`}
            >
              {cat !== 'All' && getTypeIcon(cat)}
              <span>{cat}</span>
              {cat === 'All' && <span className="ml-1 text-[10px] text-white/60">({PROJECTS.length})</span>}
            </button>
          ))}
        </div>

        {/* Projects Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="glass-card glass-card-hover rounded-2xl p-6 border border-white/10 flex flex-col justify-between space-y-5 relative group transition-all duration-300 hover:border-[#FF6B35]/50 hover:shadow-xl hover:shadow-[#FF6B35]/10"
            >
              <div className="space-y-4">
                {/* Header: Type Badge & Action Link */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border flex items-center gap-1.5 ${getTypeBadgeStyle(project.type)}`}>
                    {getTypeIcon(project.type)}
                    <span>{project.type.toUpperCase()}</span>
                  </span>

                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-[#FF6B35]/20 border border-white/10 hover:border-[#FF6B35]/40 text-[#9CA3AF] hover:text-[#FF6B35] transition-all"
                      title="View Project Link / Repository"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Project Title */}
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-white group-hover:text-[#FF6B35] transition-colors leading-snug">
                  {project.title}
                </h3>

                {/* Project Details / Description */}
                <p className="text-xs sm:text-sm text-[#D1D5DB] font-light leading-relaxed line-clamp-3">
                  {project.description}
                </p>

                {/* Metrics / Key highlights */}
                {project.metrics && project.metrics.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {project.metrics.slice(0, 2).map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                        <p className="text-[10px] font-mono text-[#9CA3AF] uppercase truncate">{m.label}</p>
                        <p className="text-xs font-mono font-bold text-white truncate">{m.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Section: Tools Used Key & Modal Inspector */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                {/* Key Tools Used */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] flex items-center justify-between">
                    <span>Key Tools Used</span>
                    <span className="text-[9px] text-[#FF6B35]">{project.tags.length} Tools</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/[0.04] border border-white/10 text-[#D1D5DB] group-hover:border-[#FF6B35]/30 transition-colors"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setActiveModalProject(project)}
                    className="text-xs font-mono text-[#FF6B35] hover:text-[#FF814F] font-bold flex items-center gap-1 group/btn"
                  >
                    <span>Inspect Test Results</span>
                    <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                  </button>

                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-[#9CA3AF] hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Repo</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Project Inspector Modal */}
        {activeModalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#12151C] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[#F3F4F6]">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${getTypeBadgeStyle(activeModalProject.type)}`}>
                      {activeModalProject.type}
                    </span>
                    <span className="text-xs font-mono text-[#9CA3AF]">{activeModalProject.id}</span>
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-white">
                    {activeModalProject.title}
                  </h3>
                </div>

                <button
                  onClick={() => setActiveModalProject(null)}
                  className="p-1.5 rounded-full text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h5 className="text-xs font-mono font-bold text-[#9CA3AF] uppercase tracking-wider">Project Summary</h5>
                <p className="text-xs sm:text-sm text-[#D1D5DB] leading-relaxed font-light">{activeModalProject.description}</p>
              </div>

              {/* Tools Used */}
              <div className="space-y-2">
                <h5 className="text-xs font-mono font-bold text-[#9CA3AF] uppercase tracking-wider">Testing Stack & Tools</h5>
                <div className="flex flex-wrap gap-2">
                  {activeModalProject.tags.map((t) => (
                    <span key={t} className="px-3 py-1 rounded-full text-xs font-mono bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/30 font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Assertions / Test Cases */}
              <div className="space-y-3 p-4 bg-white/[0.03] rounded-2xl border border-white/10">
                <h5 className="text-xs font-mono font-bold text-[#FF6B35] uppercase tracking-wider flex items-center justify-between">
                  <span>Automated Assertion Log</span>
                  <span className="text-[10px] text-emerald-400">
                    {activeModalProject.assertions.filter(a => a.status === 'PASS').length} / {activeModalProject.assertions.length} Passed
                  </span>
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeModalProject.assertions.map((ast, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs font-mono">
                      <div className="flex items-center space-x-2 truncate">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${ast.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}`} />
                        <span className="text-[#D1D5DB] truncate">{ast.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        {ast.duration && <span className="text-[10px] text-[#9CA3AF]">{ast.duration}</span>}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          ast.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {ast.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                {activeModalProject.link ? (
                  <a
                    href={activeModalProject.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-full bg-[#FF6B35] hover:bg-[#FF814F] text-white text-xs font-mono font-bold flex items-center space-x-2 transition-all shadow-lg shadow-[#FF6B35]/20"
                  >
                    <span>View Repository & Specs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : <div />}

                <button
                  onClick={() => setActiveModalProject(null)}
                  className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#D1D5DB] text-xs font-mono transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
