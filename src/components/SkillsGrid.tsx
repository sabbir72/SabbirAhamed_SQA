import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Play, Layers, Activity, Database, Sparkles, CheckCircle2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Skill } from '../types';
import { getStoredSkills, PORTFOLIO_UPDATED_EVENT } from '../utils/portfolioStore';
import { isAdminAuthenticated } from '../utils/adminAuth';
import { navigateTo } from '../utils/router';
import PaginationBar from './PaginationBar';
import ScrollableFilterTabs, { FilterTabItem } from './ScrollableFilterTabs';

const MAX_VISIBLE_SKILLS_PER_CARD = 6;

export default function SkillsGrid() {
  const [skills, setSkills] = useState<Skill[]>(() => getStoredSkills());
  const [isAdmin, setIsAdmin] = useState(() => isAdminAuthenticated());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleSync = () => {
      setSkills(getStoredSkills());
      setIsAdmin(isAdminAuthenticated());
    };
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, handleSync);
    window.addEventListener('admin_auth_changed', handleSync);
    return () => {
      window.removeEventListener(PORTFOLIO_UPDATED_EVENT, handleSync);
      window.removeEventListener('admin_auth_changed', handleSync);
    };
  }, []);

  // Ensure selectedCategory stays valid if a category is renamed or removed
  useEffect(() => {
    if (
      selectedCategory !== 'All' &&
      !skills.some((s) => s.category === selectedCategory)
    ) {
      setSelectedCategory('All');
    }
  }, [skills, selectedCategory]);

  const totalSkillsCount = useMemo(
    () => skills.reduce((sum, s) => sum + s.items.length, 0),
    [skills]
  );

  const categoryTabs: FilterTabItem[] = useMemo(
    () => [
      { id: 'All', label: 'All Categories', count: totalSkillsCount },
      ...skills.map((s) => ({
        id: s.category,
        label: s.category,
        count: s.items.length,
      })),
    ],
    [skills, totalSkillsCount]
  );

  const filteredCategories = useMemo(
    () =>
      skills.filter((cat) =>
        selectedCategory === 'All' ? true : cat.category === selectedCategory
      ),
    [skills, selectedCategory]
  );

  // Reset to page 1 when switching category tab
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const effectivePageSize = pageSize <= 0 ? Math.max(1, filteredCategories.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedCategories = useMemo(() => {
    if (pageSize <= 0) return filteredCategories;
    const start = (safePage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, safePage, pageSize]);

  const toggleCardExpand = (categoryName: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Manual Testing':
        return <ClipboardList className="w-5 h-5 text-[var(--color-accent)]" />;
      case 'Automation Testing':
        return <Play className="w-5 h-5 text-[var(--color-accent)]" />;
      case 'API Testing Tools':
        return <Layers className="w-5 h-5 text-[var(--color-accent)]" />;
      case 'Performance Testing':
        return <Activity className="w-5 h-5 text-[var(--color-accent)]" />;
      case 'Tools & Databases':
        return <Database className="w-5 h-5 text-[var(--color-accent)]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />;
    }
  };

  return (
    <section id="skills" className="py-24 bg-transparent text-[#F3F4F6] px-4 sm:px-6 border-t border-white/10 relative">
      <div id="competencies" className="absolute -top-20" />
      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-mono font-semibold text-[var(--color-accent)] tracking-wider">
            Core Skills & Capabilities
          </p>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight [text-wrap:balance]">
            Testing Arsenal & Technical Skills
          </h2>
          <p className="text-[#D1D5DB] text-sm sm:text-base leading-relaxed font-light">
            Methodical manual verification, REST API assertion frameworks, modern web UI automation, SQL database auditing, and performance load benchmarking in my daily SQA toolkit.
          </p>

          {isAdmin && (
            <div className="pt-1 flex justify-center">
              <button
                type="button"
                onClick={() => navigateTo('/admin')}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                title="Manage Skills in Admin Portal"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manage Skills</span>
              </button>
            </div>
          )}
        </div>

        {/* Compact Horizontal Scrollable / Expandable Category Tabs */}
        <div id="skills-grid-top">
          <ScrollableFilterTabs
            tabs={categoryTabs}
            activeTab={selectedCategory}
            onSelectTab={setSelectedCategory}
            align="center"
          />
        </div>

        {/* Skill Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCategories.map((cat) => {
            const isCardExpanded = Boolean(expandedCards[cat.category]) || selectedCategory === cat.category;
            const hasMoreItems = cat.items.length > MAX_VISIBLE_SKILLS_PER_CARD;
            const visibleItems = isCardExpanded
              ? cat.items
              : cat.items.slice(0, MAX_VISIBLE_SKILLS_PER_CARD);
            const hiddenCount = cat.items.length - MAX_VISIBLE_SKILLS_PER_CARD;

            return (
              <div
                key={cat.category}
                className="glass-card glass-card-hover rounded-2xl p-7 border border-white/10 flex flex-col justify-between relative group"
              >
                <div>
                  {/* Category Header */}
                  <div className="flex items-center gap-3.5 pb-4 mb-5 border-b border-white/10">
                    <div className="w-11 h-11 flex items-center justify-center bg-[var(--color-accent)]/10 rounded-xl border border-[var(--color-accent)]/20 group-hover:border-[var(--color-accent)] transition-colors shrink-0">
                      {getCategoryIcon(cat.category)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-lg text-white truncate">
                        {cat.category}
                      </h3>
                      <p className="text-xs text-[#9CA3AF] font-mono tabular-nums">
                        {cat.items.length} skills & tools
                      </p>
                    </div>
                  </div>

                  {/* Skills Items List */}
                  <ul className="space-y-3">
                    {visibleItems.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-xs text-[#F3F4F6]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                        <span className="leading-relaxed font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Expand / Collapse toggle when a single category has > 6 skills */}
                {hasMoreItems && selectedCategory !== cat.category && (
                  <div className="pt-4 mt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => toggleCardExpand(cat.category)}
                      className="text-xs font-mono font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                    >
                      {isCardExpanded ? (
                        <>
                          <span>Show fewer skills</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>+{hiddenCount} more skills</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination Controls for Skill Categories */}
        <PaginationBar
          currentPage={safePage}
          totalItems={filteredCategories.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[3, 6, 9, 0]}
          itemLabel="skill categories"
          scrollTargetId="skills-grid-top"
        />
      </div>
    </section>
  );
}
