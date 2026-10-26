import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Github, Terminal, CheckCircle2, Layers, Code, Cpu, FileCheck, Plus, Search, X } from 'lucide-react';
import { Project } from '../types';
import { getStoredProjects, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolioStore';
import { isAdminAuthenticated } from '../utils/adminAuth';
import { navigateTo } from '../utils/router';
import PaginationBar from './PaginationBar';
import ScrollableFilterTabs, { FilterTabItem } from './ScrollableFilterTabs';

const MAX_VISIBLE_TAGS = 5;

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>(() => getStoredProjects());
  const [isAdmin, setIsAdmin] = useState(() => isAdminAuthenticated());
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);
  const [activeModalProject, setActiveModalProject] = useState<Project | null>(null);

  useEffect(() => {
    const handleSync = () => {
      setProjects(getStoredProjects());
      setIsAdmin(isAdminAuthenticated());
    };
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, handleSync);
    window.addEventListener('admin_auth_changed', handleSync);
    return () => {
      window.removeEventListener(PORTFOLIO_UPDATED_EVENT, handleSync);
      window.removeEventListener('admin_auth_changed', handleSync);
    };
  }, []);

  const getTypeIcon = (type: string, isActive = false) => {
    const iconColor = isActive ? 'text-[#080B11]' : undefined;
    switch (type) {
      case 'Automation':
        return <Code className={`w-3.5 h-3.5 ${iconColor || 'text-[var(--color-accent)]'}`} />;
      case 'API':
        return <Terminal className={`w-3.5 h-3.5 ${iconColor || 'text-emerald-400'}`} />;
      case 'Performance':
        return <Cpu className={`w-3.5 h-3.5 ${iconColor || 'text-amber-400'}`} />;
      case 'Manual':
        return <FileCheck className={`w-3.5 h-3.5 ${iconColor || 'text-sky-400'}`} />;
      default:
        return <Layers className={`w-3.5 h-3.5 ${iconColor || 'text-[#D1D5DB]'}`} />;
    }
  };

  const getTypeTextAccent = (type: string) => {
    switch (type) {
      case 'Automation':
        return 'text-[var(--color-accent)]';
      case 'API':
        return 'text-emerald-400';
      case 'Performance':
        return 'text-amber-400';
      case 'Manual':
        return 'text-sky-400';
      default:
        return 'text-[#D1D5DB]';
    }
  };

  // Build dynamic category tabs (default SQA types + any custom types added via Admin)
  const categoryTabs: FilterTabItem[] = useMemo(() => {
    const baseOrder: string[] = ['Automation', 'API', 'Performance', 'Manual'];
    const dynamicTypes: string[] = Array.from(
      new Set<string>(projects.map((p) => p.type).filter(Boolean))
    );
    const orderedTypes = [
      ...baseOrder.filter((t) => dynamicTypes.includes(t) || projects.length === 0),
      ...dynamicTypes.filter((t) => !baseOrder.includes(t)),
    ];

    return [
      { id: 'All', label: 'All', count: projects.length },
      ...orderedTypes.map((type) => ({
        id: type,
        label: type,
        count: projects.filter((p) => p.type === type).length,
        icon: getTypeIcon(type, selectedType === type),
      })),
    ];
  }, [projects, selectedType]);

  // Filter projects by category and search query
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesType = selectedType === 'All' || p.type === selectedType;
      if (!matchesType) return false;
      if (!query) return true;
      return (
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.type.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query))
      );
    });
  }, [projects, selectedType, searchQuery]);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, searchQuery]);

  // Paginate filtered projects
  const effectivePageSize = pageSize <= 0 ? Math.max(1, filteredProjects.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedProjects = useMemo(() => {
    if (pageSize <= 0) return filteredProjects;
    const start = (safePage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, safePage, pageSize]);

  return (
    <section id="projects" className="py-24 bg-transparent text-[#F3F4F6] border-t border-white/10 px-4 sm:px-6 relative">
      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-mono font-semibold text-[var(--color-accent)] tracking-wider">
            SQA Portfolio Projects
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight [text-wrap:balance]">
            Featured Quality Assurance Projects
          </h2>
          <p className="text-[#D1D5DB] text-sm sm:text-base leading-relaxed font-light">
            A curated showcase of end-to-end automation test suites, REST API validation frameworks, performance load scenarios, and manual functional test planning created by Sabbir.
          </p>
        </div>

        {/* Filter Bar: Compact Scrollable Category Tabs + Search + Admin CTA */}
        <div id="projects-grid-top" className="space-y-4 pt-2">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <ScrollableFilterTabs
                tabs={categoryTabs}
                activeTab={selectedType}
                onSelectTab={setSelectedType}
                align="start"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              {/* Quick Project Search */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects or tools..."
                  className="w-full min-h-[44px] sm:min-h-[40px] pl-9 pr-8 py-2 rounded-lg bg-[#12151C] border border-white/10 text-xs font-mono text-white placeholder:text-[#9CA3AF]/70 focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear project search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigateTo('/admin')}
                  className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  title="Open Admin System to add/edit/delete projects"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage Projects</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Projects Cards Grid */}
        {paginatedProjects.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 border border-white/10 text-center space-y-3">
            <p className="font-display font-bold text-lg text-white">No matching projects found</p>
            <p className="text-xs font-mono text-[#9CA3AF]">
              Try clearing your search query or switching to another project category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedType('All');
                setSearchQuery('');
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-mono text-white transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProjects.map((project) => {
              const visibleTags = project.tags.slice(0, MAX_VISIBLE_TAGS);
              const extraTagCount = Math.max(0, project.tags.length - MAX_VISIBLE_TAGS);

              return (
                <div
                  key={project.id}
                  className="glass-card glass-card-hover rounded-2xl p-6 border border-white/10 flex flex-col justify-between space-y-5 relative group"
                >
                  <div className="space-y-4">
                    {project.image && (
                      <div
                        onClick={() => setActiveModalProject(project)}
                        className="w-full h-44 rounded-xl overflow-hidden border border-white/10 bg-[#0A0E17] cursor-pointer relative"
                      >
                        <img
                          src={project.image}
                          alt={project.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Header: Quiet Unboxed Kicker & Action Link */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
                        {getTypeIcon(project.type)}
                        <span className={`font-semibold ${getTypeTextAccent(project.type)}`}>
                          {project.type}
                        </span>
                        {project.assertions?.length > 0 && (
                          <>
                            <span aria-hidden="true" className="text-white/25">·</span>
                            <span className="text-[#9CA3AF]">
                              {project.assertions.length} checks
                            </span>
                          </>
                        )}
                      </div>

                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-white/[0.04] hover:bg-[var(--color-accent)]/20 border border-white/10 hover:border-[var(--color-accent)]/40 text-[#9CA3AF] hover:text-[var(--color-accent)] transition-colors shrink-0"
                          title="View Project Link / Repository"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {/* Project Title */}
                    <h3 className="font-display font-extrabold text-lg sm:text-xl text-white group-hover:text-[var(--color-accent)] transition-colors leading-snug">
                      {project.title}
                    </h3>

                    {/* Project Details / Description */}
                    <p className="text-xs sm:text-sm text-[#D1D5DB] font-light leading-relaxed line-clamp-3">
                      {project.description}
                    </p>

                    {/* Metrics / Key highlights */}
                    {project.metrics && project.metrics.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                        {project.metrics.slice(0, 2).map((m, idx) => (
                          <div key={idx} className="space-y-0.5 min-w-0">
                            <p className="text-[11px] font-mono text-[#9CA3AF] truncate">{m.label}</p>
                            <p className="text-xs font-mono font-bold text-white truncate tabular-nums">{m.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Section: Tools Metadata & Modal Inspector */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-mono text-[#9CA3AF] flex items-center justify-between tabular-nums">
                        <span>Key Tools</span>
                        <span className="text-[var(--color-accent)]">{project.tags.length} tools</span>
                      </p>
                      <p className="text-xs font-mono text-[#D1D5DB] leading-relaxed">
                        {visibleTags.join(' · ')}
                        {extraTagCount > 0 && (
                          <span className="text-[#9CA3AF]"> · +{extraTagCount} more</span>
                        )}
                      </p>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveModalProject(project)}
                        className="text-xs font-mono text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-bold flex items-center gap-1 group/btn whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Inspect Test Results</span>
                        <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                      </button>

                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-[#9CA3AF] hover:text-white flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Github className="w-3.5 h-3.5" />
                          <span>Repo</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        <PaginationBar
          currentPage={safePage}
          totalItems={filteredProjects.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[6, 9, 12, 0]}
          itemLabel="projects"
          scrollTargetId="projects-grid-top"
        />

        {/* Project Inspector Modal */}
        {activeModalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#12151C] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-[#F3F4F6]">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#9CA3AF]">
                    <span className={`font-semibold ${getTypeTextAccent(activeModalProject.type)}`}>
                      {activeModalProject.type}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeModalProject.id}</span>
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-white">
                    {activeModalProject.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModalProject(null)}
                  className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              {activeModalProject.image && (
                <div className="w-full max-h-64 rounded-2xl overflow-hidden border border-white/10 bg-[#0A0E17]">
                  <img
                    src={activeModalProject.image}
                    alt={activeModalProject.title}
                    referrerPolicy="no-referrer"
                    className="w-full max-h-64 object-cover"
                  />
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <h5 className="text-xs font-mono font-bold text-[#9CA3AF]">Project Summary</h5>
                <p className="text-xs sm:text-sm text-[#D1D5DB] leading-relaxed font-light">{activeModalProject.description}</p>
              </div>

              {/* Tools Used */}
              <div className="space-y-2">
                <h5 className="text-xs font-mono font-bold text-[#9CA3AF]">Testing Stack & Tools</h5>
                <p className="text-xs font-mono text-[var(--color-accent)] leading-relaxed">
                  {activeModalProject.tags.join(' · ')}
                </p>
              </div>

              {/* Assertions / Test Cases */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <h5 className="text-xs font-mono font-bold text-[var(--color-accent)] flex items-center justify-between tabular-nums">
                  <span>Automated Assertion Log</span>
                  <span className="text-emerald-400">
                    {activeModalProject.assertions.filter((a) => a.status === 'PASS').length} / {activeModalProject.assertions.length} Passed
                  </span>
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeModalProject.assertions.map((ast, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 text-xs font-mono gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${ast.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}`} />
                        <span className="text-[#D1D5DB] truncate">{ast.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        {ast.duration && <span className="text-[11px] text-[#9CA3AF]">{ast.duration}</span>}
                        <span className={`text-[11px] font-bold ${
                          ast.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'
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
                    className="px-5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[#080B11] text-xs font-mono font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>View Repository & Specs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : <div />}

                <button
                  type="button"
                  onClick={() => setActiveModalProject(null)}
                  className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#D1D5DB] text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
