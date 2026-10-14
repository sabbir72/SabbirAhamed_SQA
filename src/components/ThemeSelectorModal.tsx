/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Modern Color View / Theme Selector Modal
 * Description : Allows visitors & portfolio owner to customize the color view
 *               across the full system with live preview and persistent storage.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-14
 * -----------------------------------------
 */

import React, { useState, useEffect } from 'react';
import { Palette, Check, Sparkles, X, RotateCcw, ShieldCheck, Zap } from 'lucide-react';
import { COLOR_THEMES, ColorTheme, getSavedThemeId, setAndApplyTheme, DEFAULT_THEME_ID } from '../utils/themeStore';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemeSelectorModal({ isOpen, onClose }: ThemeSelectorModalProps) {
  const [activeThemeId, setActiveThemeId] = useState<string>(() => getSavedThemeId());
  const [tempHoverTheme, setTempHoverTheme] = useState<ColorTheme | null>(null);

  useEffect(() => {
    setActiveThemeId(getSavedThemeId());
  }, [isOpen]);

  if (!isOpen) return null;

  const currentTheme = COLOR_THEMES[activeThemeId] || COLOR_THEMES[DEFAULT_THEME_ID];
  const activeDisplay = tempHoverTheme || currentTheme;

  const handleSelectTheme = (themeId: string) => {
    setActiveThemeId(themeId);
    setAndApplyTheme(themeId);
  };

  const handleResetDefault = () => {
    setActiveThemeId(DEFAULT_THEME_ID);
    setAndApplyTheme(DEFAULT_THEME_ID);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl rounded-3xl border border-white/15 bg-[#0D121F] shadow-2xl overflow-hidden animate-scaleUp transition-all duration-300"
        style={{
          boxShadow: `0 25px 60px -15px ${activeDisplay.glow}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative p-6 sm:p-7 border-b border-white/10 bg-gradient-to-r from-white/[0.03] to-transparent flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div 
              className="p-3 rounded-2xl border transition-all duration-300"
              style={{
                backgroundColor: `${activeDisplay.primary}18`,
                borderColor: `${activeDisplay.primary}40`,
                color: activeDisplay.primary
              }}
            >
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-white tracking-tight">
                  Portfolio Color View Studio
                </h3>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border"
                  style={{
                    backgroundColor: `${activeDisplay.primary}15`,
                    borderColor: `${activeDisplay.primary}40`,
                    color: activeDisplay.primary
                  }}
                >
                  Live Theme
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1 font-sans">
                Select your preferred executive color look for Sabbir Ahamed's SQA engineering showcase.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme List Grid */}
        <div className="p-6 sm:p-7 space-y-4 max-h-[62vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {Object.values(COLOR_THEMES).map((theme) => {
              const isSelected = activeThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  onMouseEnter={() => setTempHoverTheme(theme)}
                  onMouseLeave={() => setTempHoverTheme(null)}
                  className={`group relative p-4 rounded-2xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-white/[0.08] shadow-lg' 
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 hover:border-white/20'
                  }`}
                  style={{
                    borderColor: isSelected ? theme.primary : undefined,
                    boxShadow: isSelected ? `0 10px 25px -5px ${theme.glow}` : undefined
                  }}
                >
                  {/* Card Top: Swatch & Name */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2.5">
                      {/* Gradient Circle Swatch */}
                      <span 
                        className="w-5 h-5 rounded-full border-2 border-white/40 shadow-sm shrink-0 transition-transform group-hover:scale-110"
                        style={{
                          background: `linear-gradient(135deg, ${theme.primary}, ${theme.hover})`
                        }}
                      />
                      <span className="font-display font-bold text-sm text-white group-hover:text-white transition-colors">
                        {theme.name}
                      </span>
                    </div>

                    {isSelected && (
                      <span 
                        className="p-1 rounded-full text-white shrink-0"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Check className="w-3 h-3 text-black font-extrabold" />
                      </span>
                    )}
                  </div>

                  {/* Subtitle Description */}
                  <p className="text-[11px] text-[#9CA3AF] font-sans leading-relaxed">
                    {theme.subtitle}
                  </p>

                  {/* Mini Accent Preview Bar */}
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#6B7280]">Accent Hex:</span>
                    <span 
                      className="font-bold tracking-wider"
                      style={{ color: theme.primary }}
                    >
                      {theme.primary}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Info Box */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono text-[#9CA3AF]">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Instant hot-reload: selection persists automatically</span>
            </div>
            <button
              onClick={handleResetDefault}
              className="inline-flex items-center space-x-1 text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Reset to default Cyber Cyan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="text-xs text-[#9CA3AF] font-mono">
            Active: <span className="font-bold text-white">{currentTheme.name}</span> ({currentTheme.primary})
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-black transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: currentTheme.primary,
              boxShadow: `0 8px 20px -5px ${currentTheme.glow}`
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
