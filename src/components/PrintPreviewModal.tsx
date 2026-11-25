import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  FileCheck2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileName: string;
  pages: string[];
  margin: [number, number, number, number]; // [top, left, bottom, right] in mm
  isLoading: boolean;
  isExportingPdf: boolean;
  pdfQualityMode: 'under-1mb' | 'normal';
  onTogglePdfQualityMode: () => void;
  onDownloadPdf: () => Promise<void> | void;
  onPrintNow: () => Promise<{ openedDialog: boolean; blockedBySandbox: boolean }>;
  lastPdfInfo?: { sizeLabel: string; mode: 'under-1mb' | 'normal' } | null;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  fileName,
  pages,
  margin,
  isLoading,
  isExportingPdf,
  pdfQualityMode,
  onTogglePdfQualityMode,
  onDownloadPdf,
  onPrintNow,
  lastPdfInfo,
}) => {
  const [zoomScale, setZoomScale] = useState<'fit' | 'actual'>('fit');
  const [isPrinting, setIsPrinting] = useState(false);
  const [sandboxNotice, setSandboxNotice] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSandboxNotice(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrintClick = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    setSandboxNotice(false);
    try {
      const res = await onPrintNow();
      if (res.blockedBySandbox) {
        setSandboxNotice(true);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // Convert mm margins into % relative to A4 width (210mm), because CSS percentage padding uses element width
  const padTopPct = (margin[0] / 210) * 100;
  const padRightPct = (margin[3] / 210) * 100;
  const padBottomPct = (margin[2] / 210) * 100;
  const padLeftPct = (margin[1] / 210) * 100;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex flex-col overflow-hidden no-print animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} Print Preview`}
    >
      {/* Top Action Toolbar */}
      <div className="bg-[#12151C] border-b border-white/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-bold text-sm sm:text-base text-white">
                {title} — Print &amp; PDF Preview
              </h3>
              {!isLoading && pages.length > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {pages.length} A4 {pages.length === 1 ? 'Page' : 'Pages'}
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-300 mt-0.5 truncate max-w-[260px] sm:max-w-md">
              {fileName} • Margins {margin[0]}mm / {margin[1]}mm
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setZoomScale((prev) => (prev === 'fit' ? 'actual' : 'fit'))}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-slate-100 text-xs font-mono font-semibold transition-colors cursor-pointer"
            title="Toggle A4 page zoom"
          >
            {zoomScale === 'fit' ? (
              <>
                <ZoomIn className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>Zoom 100%</span>
              </>
            ) : (
              <>
                <ZoomOut className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>Fit Screen</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onTogglePdfQualityMode}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold transition-colors cursor-pointer ${
              pdfQualityMode === 'under-1mb'
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/40 text-emerald-300'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-200'
            }`}
            title="Toggle Under 1MB compression or Normal Full Quality PDF"
          >
            <span>{pdfQualityMode === 'under-1mb' ? 'Limit <1MB: ON' : 'Normal Size: ON'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintClick}
            disabled={isLoading || isPrinting}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#060911] text-xs font-mono font-extrabold shadow-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Send formatted pages to system Print / Save PDF dialog"
          >
            {isPrinting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            <span>{isPrinting ? 'Opening Print...' : 'Print Now'}</span>
          </button>

          <button
            type="button"
            onClick={() => onDownloadPdf()}
            disabled={isLoading || isExportingPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-ink,#060911)] text-xs font-mono font-bold shadow-lg shadow-[var(--color-accent)]/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isExportingPdf
                ? 'Saving PDF...'
                : pdfQualityMode === 'under-1mb'
                ? 'Download PDF (<1MB)'
                : 'Download PDF (Normal)'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close Print Preview"
            aria-label="Close Print Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sandbox print notice (shown only if embedded preview iframe blocks OS print popup) */}
      {sandboxNotice && (
        <div className="bg-amber-500/15 border-b border-amber-400/30 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-amber-100 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              এই প্রিভিউ ফ্রেম থেকে ব্রাউজারের Print ডায়ালগ ব্লক করা আছে — সরাসরি নিচের{' '}
              <strong className="text-white">Download PDF</strong> বাটনে ক্লিক করে হুবহু এই পেজগুলো সেভ করুন বা মেইন লিংক থেকে প্রিন্ট করুন।
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDownloadPdf()}
            disabled={isExportingPdf}
            className="px-3 py-1 rounded bg-amber-400 hover:bg-amber-300 text-[#060911] font-bold cursor-pointer"
          >
            Download PDF Now
          </button>
        </div>
      )}

      {/* A4 Paginated Sheet Preview Viewport */}
      <div className="flex-1 overflow-y-auto bg-[#171A21] p-4 sm:p-8 flex flex-col items-center gap-6">
        {lastPdfInfo && (
          <div className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full shrink-0">
            Last exported PDF: {lastPdfInfo.sizeLabel} ({lastPdfInfo.mode === 'under-1mb' ? 'Under 1MB Cap' : 'Normal Full Quality'})
          </div>
        )}

        {isLoading ? (
          <div className="my-auto flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-[var(--color-accent)] animate-spin" />
            <p className="text-sm font-mono font-semibold text-white">
              Preparing exact A4 Print &amp; PDF Preview...
            </p>
            <p className="text-xs font-mono text-slate-400">
              Checking page margins &amp; preventing line cuts across pages
            </p>
          </div>
        ) : pages.length === 0 ? (
          <div className="my-auto text-center text-sm font-mono text-slate-300 py-16">
            Unable to generate preview pages. You can still download the PDF directly.
          </div>
        ) : (
          pages.map((pageDataUrl, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center w-full shrink-0"
            >
              <div className="mb-2 flex items-center justify-between w-full text-[11px] font-mono text-slate-300" style={{ maxWidth: zoomScale === 'actual' ? '210mm' : '760px' }}>
                <span className="font-bold text-slate-200">
                  Page {idx + 1} of {pages.length}
                </span>
                <span className="text-slate-400">A4 Portrait (210 × 297 mm)</span>
              </div>

              <div
                className="bg-white shadow-2xl border border-black/15 rounded-sm overflow-hidden w-full shrink-0"
                style={{
                  maxWidth: zoomScale === 'actual' ? '210mm' : '760px',
                  aspectRatio: '210 / 297',
                  paddingTop: `${padTopPct}%`,
                  paddingRight: `${padRightPct}%`,
                  paddingBottom: `${padBottomPct}%`,
                  paddingLeft: `${padLeftPct}%`,
                  boxSizing: 'border-box',
                }}
              >
                <img
                  src={pageDataUrl}
                  alt={`${title} Page ${idx + 1}`}
                  className="w-full h-full object-contain object-top block select-none"
                  draggable={false}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
