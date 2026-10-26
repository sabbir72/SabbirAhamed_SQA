import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize: number; // 0 means "All"
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  scrollTargetId?: string;
}

export default function PaginationBar({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [6, 9, 0],
  itemLabel = 'items',
  scrollTargetId,
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  const effectiveSize = pageSize <= 0 ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectiveSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = (safePage - 1) * effectiveSize + 1;
  const endItem = Math.min(safePage * effectiveSize, totalItems);

  const handleSelectPage = (nextPage: number) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped === safePage) return;
    onPageChange(clamped);

    if (scrollTargetId) {
      const target = document.getElementById(scrollTargetId);
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }
  };

  // Build smart page numbers with ellipsis
  const getPageNumbers = (): (number | 'ellipsis-start' | 'ellipsis-end')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1];

    if (safePage > 3) {
      pages.push('ellipsis-start');
    }

    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (safePage < totalPages - 2) {
      pages.push('ellipsis-end');
    }

    pages.push(totalPages);
    return pages;
  };

  const minOption = Math.min(...pageSizeOptions.filter((n) => n > 0));
  const showDensitySelector = Boolean(onPageSizeChange && totalItems > minOption);

  // Hide bar completely only when all items fit inside the smallest page size
  if (totalPages <= 1 && !showDensitySelector) {
    return null;
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left: Range Summary & Optional Page Size Switcher */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs font-mono text-[#9CA3AF] tabular-nums">
        <span>
          Showing <strong className="text-white">{startItem}–{endItem}</strong> of{' '}
          <strong className="text-white">{totalItems}</strong> {itemLabel}
        </span>

        {showDensitySelector && onPageSizeChange && (
          <>
            <span aria-hidden="true" className="text-white/20">·</span>
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#12151C] border border-white/10">
              {pageSizeOptions.map((opt) => {
                const isSelected = pageSize === opt;
                const label = opt === 0 ? 'All' : `${opt} / page`;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onPageSizeChange(opt);
                      onPageChange(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--color-accent)] text-[#080B11] font-bold'
                        : 'text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Right: Page Controls */}
      {totalPages > 1 && (
        <nav
          aria-label={`${itemLabel} pagination`}
          className="flex items-center gap-1.5 flex-wrap justify-center"
        >
          <button
            type="button"
            onClick={() => handleSelectPage(safePage - 1)}
            disabled={safePage <= 1}
            className="min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded-lg bg-[#12151C] border border-white/10 text-xs font-mono text-[#D1D5DB] hover:border-[var(--color-accent)]/50 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          {pageNumbers.map((entry) => {
            if (entry === 'ellipsis-start' || entry === 'ellipsis-end') {
              return (
                <span
                  key={entry}
                  className="px-2 text-xs font-mono text-[#9CA3AF] select-none"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }

            const isActive = entry === safePage;
            return (
              <button
                key={entry}
                type="button"
                onClick={() => handleSelectPage(entry)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[44px] sm:min-h-[40px] min-w-[40px] px-3 py-2 rounded-lg text-xs font-mono tabular-nums transition-colors border whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-[#080B11] border-[var(--color-accent)] font-bold shadow-md shadow-[var(--color-accent)]/20'
                    : 'bg-[#12151C] border-white/10 text-[#D1D5DB] hover:border-[var(--color-accent)]/50 hover:text-white'
                }`}
              >
                {entry}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handleSelectPage(safePage + 1)}
            disabled={safePage >= totalPages}
            className="min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded-lg bg-[#12151C] border border-white/10 text-xs font-mono text-[#D1D5DB] hover:border-[var(--color-accent)]/50 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
