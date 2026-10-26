import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';

export interface FilterTabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface ScrollableFilterTabsProps {
  tabs: FilterTabItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  align?: 'center' | 'start';
}

export default function ScrollableFilterTabs({
  tabs,
  activeTab,
  onSelectTab,
  align = 'center',
}: ScrollableFilterTabsProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const checkOverflow = () => {
    const el = scrollRef.current;
    if (!el || isExpanded) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  };

  useEffect(() => {
    checkOverflow();
    const handleResize = () => checkOverflow();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tabs, isExpanded]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = Math.max(220, Math.round(el.clientWidth * 0.65));
    el.scrollBy({
      left: direction === 'left' ? -delta : delta,
      behavior: 'smooth',
    });
  };

  const handleTabClick = (id: string, buttonEl: HTMLButtonElement | null) => {
    onSelectTab(id);
    if (!isExpanded && buttonEl) {
      buttonEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  };

  return (
    <div className="w-full flex items-center gap-2">
      {/* Left Scroll Button (only in compact single-row mode when overflowing) */}
      {!isExpanded && canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount('left')}
          aria-label="Scroll categories left"
          className="min-h-[40px] min-w-[40px] p-2 rounded-lg bg-[#12151C] border border-white/10 text-[#D1D5DB] hover:border-[var(--color-accent)]/50 hover:text-white transition-colors shrink-0 flex items-center justify-center cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Tabs Container */}
      <div
        ref={scrollRef}
        onScroll={checkOverflow}
        className={
          isExpanded
            ? `flex-1 flex flex-wrap items-center gap-2 ${
                align === 'center' ? 'justify-center' : 'justify-start'
              }`
            : `flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 ${
                align === 'center' && !canScrollLeft && !canScrollRight
                  ? 'justify-center'
                  : 'justify-start'
              }`
        }
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={(e) => handleTabClick(tab.id, e.currentTarget)}
              className={`min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-lg text-xs font-mono transition-colors border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-accent)] text-[#080B11] border-[var(--color-accent)] font-bold shadow-md shadow-[var(--color-accent)]/20'
                  : 'bg-[#12151C] border-white/10 text-[#D1D5DB] hover:border-[var(--color-accent)]/50 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[11px] tabular-nums ${
                    isActive ? 'text-[#080B11]/75 font-bold' : 'text-[#9CA3AF]'
                  }`}
                >
                  · {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right Scroll Button */}
      {!isExpanded && canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount('right')}
          aria-label="Scroll categories right"
          className="min-h-[40px] min-w-[40px] p-2 rounded-lg bg-[#12151C] border border-white/10 text-[#D1D5DB] hover:border-[var(--color-accent)]/50 hover:text-white transition-colors shrink-0 flex items-center justify-center cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Compact / View All Toggle when many tabs exist */}
      {tabs.length > 6 && (canScrollLeft || canScrollRight || isExpanded) && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-[var(--color-accent)] whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          title={isExpanded ? 'Collapse tabs into single scrollable row' : 'Expand all category tabs'}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>{isExpanded ? 'Compact' : `All (${tabs.length})`}</span>
        </button>
      )}
    </div>
  );
}
