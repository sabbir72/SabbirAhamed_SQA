import React from 'react';

interface QaLogoProps {
  variant?: 'navbar' | 'footer' | 'compact';
  className?: string;
  showSubtitle?: boolean;
}

/**
 * Modern High-Tech Quality Assurance (QA) Brand Logo Component
 * Incorporates a precision test-verified shield glyph, micro audit-radar ring,
 * and dynamic theme accent coloring.
 */
export const QaLogo: React.FC<QaLogoProps> = ({
  variant = 'navbar',
  className = '',
  showSubtitle = true,
}) => {
  const isFooter = variant === 'footer';
  const isCompact = variant === 'compact';

  return (
    <div className={`flex items-center space-x-3 group ${className}`}>
      {/* High-Tech QA Insignia Mark */}
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Ambient Glow */}
        <div className="absolute -inset-1 rounded-2xl bg-[var(--color-accent)] opacity-20 blur-md group-hover:opacity-40 transition-opacity duration-300 pointer-events-none" />

        {/* Shield Hexagon Container */}
        <div className="relative w-10 h-10 rounded-xl bg-[#0E131F]/90 border border-[var(--color-accent)]/30 group-hover:border-[var(--color-accent)] flex items-center justify-center shadow-lg transition-all duration-300">
          {/* Custom QA Geometric SVG Vector */}
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-[var(--color-accent)] transition-transform duration-300 group-hover:scale-105"
          >
            {/* Outer Hexagonal Shield Outline */}
            <path
              d="M18 3L30 8.5V17C30 24.5 24.8 30.5 18 33C11.2 30.5 6 24.5 6 17V8.5L18 3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-80"
            />
            {/* Inner Precision Grid / Core */}
            <circle
              cx="18"
              cy="16"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="2 2"
              className="opacity-40"
            />
            {/* QA Verified Checkmark */}
            <path
              d="M13.5 16.5L16.5 19.5L23 12.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Bottom Test Pass Radar Pulse Indicator */}
            <circle
              cx="18"
              cy="27"
              r="1.5"
              fill="currentColor"
            />
          </svg>

          {/* Micro Status Dot in Corner */}
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-accent)]" />
          </span>
        </div>
      </div>

      {/* Brand Typography & Credentials */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-display font-extrabold text-lg tracking-tight text-white group-hover:text-white transition-colors">
            Sabbir
          </span>
          {/* Distinct QA Monogram Badge */}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 group-hover:border-[var(--color-accent)] transition-colors">
            QA
          </span>
        </div>

        {showSubtitle && !isCompact && (
          <span className="text-[10px] sm:text-[11px] text-[#9CA3AF] font-mono tracking-tight group-hover:text-[#D1D5DB] transition-colors mt-0.5">
            {isFooter ? 'Software Quality Assurance Engineer' : 'SQA Specialist & SDET'}
          </span>
        )}
      </div>
    </div>
  );
};
