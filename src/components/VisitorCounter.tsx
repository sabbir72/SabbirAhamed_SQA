/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Visitor Counter & Live Analytics Badge
 * Description : Displays total site visitors, pageviews, and live active session
 *               metrics with animated counters and responsive tooltip details.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-08-12
 * -----------------------------------------
 */

import React, { useState, useEffect } from 'react';
import { Users, Eye, Activity, Sparkles, TrendingUp } from 'lucide-react';
import { 
  trackVisitorHit, 
  subscribeVisitorStats, 
  getCurrentVisitorMetrics, 
  VisitorMetrics 
} from '../utils/visitorTracker';

interface VisitorCounterProps {
  variant?: 'badge' | 'card' | 'navbar' | 'footer';
  className?: string;
  tooltipPlacement?: 'top' | 'bottom';
}

export default function VisitorCounter({ 
  variant = 'badge', 
  className = '',
  tooltipPlacement = 'bottom'
}: VisitorCounterProps) {
  const [stats, setStats] = useState<VisitorMetrics>(() => getCurrentVisitorMetrics());
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Register hit on mount
    trackVisitorHit();

    // Subscribe to state updates
    const unsubscribe = subscribeVisitorStats((updatedStats) => {
      setStats(updatedStats);
    });

    return () => unsubscribe();
  }, []);

  const formattedTotal = (stats.totalVisitors || 0).toLocaleString();
  const formattedViews = (stats.totalPageViews || 0).toLocaleString();
  const formattedToday = (stats.todayVisitors || 0).toLocaleString();

  // Render for Navbar / Compact pill variant (small & simple as in header)
  if (variant === 'navbar') {
    return (
      <div 
        className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#12151C] border border-white/10 text-xs font-mono text-[#D1D5DB] hover:border-[#FF6B35]/50 hover:bg-[#181C26] transition-all cursor-pointer ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        title="Click for visitor analytics breakdown"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Users className="w-3.5 h-3.5 text-[#FF6B35]" />
        <span className="font-bold text-white">{formattedTotal}</span>
        <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold">Visitors</span>

        {/* Hover Tooltip Breakdown */}
        {showTooltip && (
          <div className={`absolute ${tooltipPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 sm:left-1/2 sm:-translate-x-1/2 w-56 bg-[#12151C] border border-[#FF6B35]/30 rounded-2xl p-3.5 shadow-2xl z-50 text-left space-y-2 animate-fadeIn pointer-events-none`}>
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] font-bold text-white">
              <span className="flex items-center gap-1.5 text-[#FF6B35]">
                <Activity className="w-3.5 h-3.5" /> Site Analytics
              </span>
              <span className="text-emerald-400 font-mono text-[10px]">● Live</span>
            </div>
            
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Total Visitors:</span>
                <span className="text-white font-bold">{formattedTotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Total Page Views:</span>
                <span className="text-amber-400 font-bold">{formattedViews}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Today's Visitors:</span>
                <span className="text-emerald-400 font-bold">+{formattedToday}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render for Footer variant (rich stats box)
  if (variant === 'footer') {
    return (
      <div className={`p-4 rounded-2xl bg-[#12151C]/80 border border-white/10 hover:border-[#FF6B35]/40 transition-all ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Total Visitors
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Tracking
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] text-[#9CA3AF] flex items-center justify-center gap-1 mb-0.5">
              <Users className="w-3 h-3 text-[#FF6B35]" /> Visitors
            </div>
            <div className="text-sm sm:text-base font-extrabold text-white">
              {formattedTotal}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] text-[#9CA3AF] flex items-center justify-center gap-1 mb-0.5">
              <Eye className="w-3 h-3 text-amber-400" /> Views
            </div>
            <div className="text-sm sm:text-base font-extrabold text-amber-400">
              {formattedViews}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] text-[#9CA3AF] flex items-center justify-center gap-1 mb-0.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" /> Today
            </div>
            <div className="text-sm sm:text-base font-extrabold text-emerald-400">
              +{formattedToday}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render for Card variant (Hero / Recruiter section)
  if (variant === 'card') {
    return (
      <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#12151C] to-[#181C26] border border-[#FF6B35]/30 shadow-xl space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Portfolio Traffic
              </h4>
              <p className="text-[11px] text-[#9CA3AF]">Real-time Visitor Analytics</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-[#9CA3AF]">Total Visitors</div>
              <div className="text-lg font-mono font-black text-white">{formattedTotal}</div>
            </div>
            <Users className="w-5 h-5 text-[#FF6B35] opacity-80" />
          </div>

          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-[#9CA3AF]">Page Views</div>
              <div className="text-lg font-mono font-black text-amber-400">{formattedViews}</div>
            </div>
            <Eye className="w-5 h-5 text-amber-400 opacity-80" />
          </div>
        </div>
      </div>
    );
  }

  // Default Badge Variant
  return (
    <div className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#12151C] border border-[#FF6B35]/30 text-xs font-mono text-white shadow-lg ${className}`}>
      <Users className="w-3.5 h-3.5 text-[#FF6B35]" />
      <span className="text-[#9CA3AF]">Total Visitors:</span>
      <span className="font-extrabold text-[#FF6B35]">{formattedTotal}</span>
      <span className="relative flex h-2 w-2 ml-1">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
    </div>
  );
}
