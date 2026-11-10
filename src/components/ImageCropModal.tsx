import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Crop,
  FlipHorizontal2,
  Loader2,
  Maximize2,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cropAndExportImageDataUrl, loadImageElement } from '../utils/imageUpload';

export type CropAspectPresetId = 'free' | '1:1' | '16:9' | '4:3' | '3:2' | '4:5';
export type OutputSizePresetId = 'recommended' | '400' | '800' | '1200' | 'custom';

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragHandle =
  | 'move'
  | 'nw'
  | 'ne'
  | 'sw'
  | 'se'
  | 'n'
  | 's'
  | 'e'
  | 'w';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  shape?: 'square' | 'circle' | 'banner' | 'wide';
  recommendedMaxWidth?: number;
  recommendedMaxHeight?: number;
  maxDataUrlLength?: number;
  defaultQuality?: number;
  onCancel: () => void;
  onApply: (result: {
    dataUrl: string;
    width: number;
    height: number;
    byteSize: number;
  }) => void;
  /** Optional quick save without cropping (full frame optimized) */
  onQuickSaveOriginal?: () => void;
}

const ASPECT_OPTIONS: { id: CropAspectPresetId; label: string; ratio: number | null }[] = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
];

const MIN_NORM = 0.08;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function buildCenteredCrop(
  imgW: number,
  imgH: number,
  aspectRatio: number | null
): CropRect {
  if (!aspectRatio || imgW <= 0 || imgH <= 0) {
    return { x: 0.06, y: 0.06, w: 0.88, h: 0.88 };
  }

  const imgRatio = imgW / imgH;
  let w = 0.88;
  let h = 0.88;

  if (aspectRatio > imgRatio) {
    // Wider than image
    w = 0.9;
    h = (w * imgW) / (aspectRatio * imgH);
    if (h > 0.9) {
      h = 0.9;
      w = (h * imgH * aspectRatio) / imgW;
    }
  } else {
    // Taller than or equal to image
    h = 0.9;
    w = (h * imgH * aspectRatio) / imgW;
    if (w > 0.9) {
      w = 0.9;
      h = (w * imgW) / (aspectRatio * imgH);
    }
  }

  w = clamp(w, MIN_NORM, 1);
  h = clamp(h, MIN_NORM, 1);

  return {
    x: (1 - w) / 2,
    y: (1 - h) / 2,
    w,
    h,
  };
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  shape = 'wide',
  recommendedMaxWidth = 1000,
  recommendedMaxHeight = 1000,
  maxDataUrlLength = 420000,
  defaultQuality = 0.88,
  onCancel,
  onApply,
  onQuickSaveOriginal,
}: ImageCropModalProps) {
  const defaultAspectId: CropAspectPresetId =
    shape === 'circle' || shape === 'square' ? '1:1' : '16:9';

  const [aspectId, setAspectId] = useState<CropAspectPresetId>(defaultAspectId);
  const [sizePreset, setSizePreset] = useState<OutputSizePresetId>('recommended');
  const [customWidth, setCustomWidth] = useState<number>(recommendedMaxWidth);
  const [customHeight, setCustomHeight] = useState<number>(recommendedMaxHeight);
  const [lockCustomRatio, setLockCustomRatio] = useState<boolean>(true);

  const [rotation, setRotation] = useState<number>(0);
  const [flipHorizontal, setFlipHorizontal] = useState<boolean>(false);
  const [crop, setCrop] = useState<CropRect>({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });

  const [orientedPreviewUrl, setOrientedPreviewUrl] = useState<string>('');
  const [orientedSize, setOrientedSize] = useState<{ w: number; h: number }>({
    w: 1000,
    h: 1000,
  });
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');

  const stageRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    handle: DragHandle;
    startClientX: number;
    startClientY: number;
    startCrop: CropRect;
    stageW: number;
    stageH: number;
  } | null>(null);

  const activeAspectRatio = useMemo(() => {
    return ASPECT_OPTIONS.find((a) => a.id === aspectId)?.ratio ?? null;
  }, [aspectId]);

  // Reset modal settings whenever newly opened with a source image
  useEffect(() => {
    if (!isOpen) return;
    setAspectId(shape === 'circle' || shape === 'square' ? '1:1' : '16:9');
    setSizePreset('recommended');
    setRotation(0);
    setFlipHorizontal(false);
    setLoadError('');
  }, [isOpen, imageSrc, shape]);

  // Build oriented canvas preview URL whenever source, rotation, or flip changes
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    let cancelled = false;
    setIsLoadingImage(true);
    setLoadError('');

    loadImageElement(imageSrc)
      .then((img) => {
        if (cancelled) return;
        const rot = ((rotation % 360) + 360) % 360;
        const swap = rot === 90 || rot === 270;
        const naturalW = img.naturalWidth || img.width || 800;
        const naturalH = img.naturalHeight || img.height || 800;
        const outW = swap ? naturalH : naturalW;
        const outH = swap ? naturalW : naturalH;

        const canvas = document.createElement('canvas');
        // Preview canvas capped cleanly at 1600px max side for snappy 60fps UI
        const previewScale = Math.min(1600 / outW, 1600 / outH, 1);
        canvas.width = Math.max(1, Math.round(outW * previewScale));
        canvas.height = Math.max(1, Math.round(outH * previewScale));

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          if (rot !== 0) ctx.rotate((rot * Math.PI) / 180);
          if (flipHorizontal) ctx.scale(-1, 1);
          ctx.drawImage(
            img,
            -(naturalW * previewScale) / 2,
            -(naturalH * previewScale) / 2,
            naturalW * previewScale,
            naturalH * previewScale
          );
          ctx.restore();
        }

        const url = canvas.toDataURL('image/jpeg', 0.92);
        setOrientedPreviewUrl(url);
        setOrientedSize({ w: outW, h: outH });
        setIsLoadingImage(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : 'এই ছবিটি ব্রাউজার থেকে সরাসরি ক্রপ করা যাচ্ছে না। অনুগ্রহ করে ডিভাইস থেকে ফাইল আপলোড করুন।'
        );
        setIsLoadingImage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, imageSrc, rotation, flipHorizontal]);

  // Recenter crop frame whenever image dimensions or selected aspect ratio change
  useEffect(() => {
    if (!orientedSize.w || !orientedSize.h) return;
    setCrop(buildCenteredCrop(orientedSize.w, orientedSize.h, activeAspectRatio));
  }, [orientedSize.w, orientedSize.h, activeAspectRatio]);

  // Exact pixel dimensions of current crop selection
  const selectedSourcePixels = useMemo(() => {
    const w = Math.max(1, Math.round(crop.w * orientedSize.w));
    const h = Math.max(1, Math.round(crop.h * orientedSize.h));
    return { w, h };
  }, [crop.w, crop.h, orientedSize.w, orientedSize.h]);

  // Computed output pixel dimensions based on Size Preset
  const outputDimensions = useMemo(() => {
    const srcW = selectedSourcePixels.w;
    const srcH = selectedSourcePixels.h;
    const ratio = srcW / Math.max(1, srcH);

    if (sizePreset === 'custom') {
      return {
        w: Math.max(32, Math.min(2000, Math.round(customWidth || srcW))),
        h: Math.max(32, Math.min(2000, Math.round(customHeight || srcH))),
      };
    }

    if (sizePreset === '400' || sizePreset === '800' || sizePreset === '1200') {
      const cap = parseInt(sizePreset, 10);
      if (srcW >= srcH) {
        return { w: cap, h: Math.max(32, Math.round(cap / ratio)) };
      }
      return { w: Math.max(32, Math.round(cap * ratio)), h: cap };
    }

    // 'recommended'
    const scale = Math.min(
      recommendedMaxWidth / srcW,
      recommendedMaxHeight / srcH,
      1
    );
    return {
      w: Math.max(32, Math.round(srcW * scale)),
      h: Math.max(32, Math.round(srcH * scale)),
    };
  }, [
    selectedSourcePixels.w,
    selectedSourcePixels.h,
    sizePreset,
    customWidth,
    customHeight,
    recommendedMaxWidth,
    recommendedMaxHeight,
  ]);

  // Sync custom width/height inputs when switching to Custom or updating crop while locked
  useEffect(() => {
    if (sizePreset !== 'custom') {
      setCustomWidth(outputDimensions.w);
      setCustomHeight(outputDimensions.h);
    }
  }, [sizePreset, outputDimensions.w, outputDimensions.h]);

  const handleCustomWidthChange = (nextVal: number) => {
    const cleanW = Math.max(32, Math.min(2000, nextVal || 32));
    setCustomWidth(cleanW);
    if (lockCustomRatio) {
      const ratio = selectedSourcePixels.w / Math.max(1, selectedSourcePixels.h);
      setCustomHeight(Math.max(32, Math.min(2000, Math.round(cleanW / ratio))));
    }
  };

  const handleCustomHeightChange = (nextVal: number) => {
    const cleanH = Math.max(32, Math.min(2000, nextVal || 32));
    setCustomHeight(cleanH);
    if (lockCustomRatio) {
      const ratio = selectedSourcePixels.w / Math.max(1, selectedSourcePixels.h);
      setCustomWidth(Math.max(32, Math.min(2000, Math.round(cleanH * ratio))));
    }
  };

  // Zoom / Frame Scale slider helper: scales crop rectangle cleanly around its center
  const frameZoomValue = useMemo(() => {
    const dominant = Math.max(crop.w, crop.h);
    return Number((1 / Math.max(0.15, dominant)).toFixed(2));
  }, [crop.w, crop.h]);

  const applyFrameZoom = useCallback(
    (targetZoom: number) => {
      const clampedZoom = clamp(targetZoom, 1, 4);
      const targetDominant = 1 / clampedZoom;
      const centerX = crop.x + crop.w / 2;
      const centerY = crop.y + crop.h / 2;

      let nextW: number;
      let nextH: number;

      if (activeAspectRatio) {
        const normRatio = activeAspectRatio * (orientedSize.h / Math.max(1, orientedSize.w));
        if (normRatio >= 1) {
          nextW = clamp(targetDominant, MIN_NORM, 1);
          nextH = nextW / normRatio;
          if (nextH > 1) {
            nextH = 1;
            nextW = nextH * normRatio;
          }
        } else {
          nextH = clamp(targetDominant, MIN_NORM, 1);
          nextW = nextH * normRatio;
          if (nextW > 1) {
            nextW = 1;
            nextH = nextW / normRatio;
          }
        }
      } else {
        const currentRatio = crop.w / Math.max(0.01, crop.h);
        if (crop.w >= crop.h) {
          nextW = clamp(targetDominant, MIN_NORM, 1);
          nextH = clamp(nextW / currentRatio, MIN_NORM, 1);
        } else {
          nextH = clamp(targetDominant, MIN_NORM, 1);
          nextW = clamp(nextH * currentRatio, MIN_NORM, 1);
        }
      }

      const nextX = clamp(centerX - nextW / 2, 0, 1 - nextW);
      const nextY = clamp(centerY - nextH / 2, 0, 1 - nextH);
      setCrop({ x: nextX, y: nextY, w: nextW, h: nextH });
    },
    [crop, activeAspectRatio, orientedSize.w, orientedSize.h]
  );

  // Pointer drag & resize handling on the crop stage
  const startDrag = (handle: DragHandle, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    dragStateRef.current = {
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCrop: { ...crop },
      stageW: rect.width,
      stageH: rect.height,
    };
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      const dx = (e.clientX - drag.startClientX) / drag.stageW;
      const dy = (e.clientY - drag.startClientY) / drag.stageH;
      const s = drag.startCrop;

      if (drag.handle === 'move') {
        setCrop({
          ...s,
          x: clamp(s.x + dx, 0, 1 - s.w),
          y: clamp(s.y + dy, 0, 1 - s.h),
        });
        return;
      }

      const normRatio = activeAspectRatio
        ? activeAspectRatio * (orientedSize.h / Math.max(1, orientedSize.w))
        : null;

      if (!normRatio) {
        // Freeform resize
        let left = s.x;
        let top = s.y;
        let right = s.x + s.w;
        let bottom = s.y + s.h;

        if (drag.handle.includes('w')) {
          left = clamp(s.x + dx, 0, right - MIN_NORM);
        }
        if (drag.handle.includes('e')) {
          right = clamp(s.x + s.w + dx, left + MIN_NORM, 1);
        }
        if (drag.handle.includes('n')) {
          top = clamp(s.y + dy, 0, bottom - MIN_NORM);
        }
        if (drag.handle.includes('s')) {
          bottom = clamp(s.y + s.h + dy, top + MIN_NORM, 1);
        }

        setCrop({
          x: left,
          y: top,
          w: right - left,
          h: bottom - top,
        });
        return;
      }

      // Aspect-locked resize
      const anchorRight = s.x + s.w;
      const anchorBottom = s.y + s.h;

      if (drag.handle === 'se' || drag.handle === 'sw' || drag.handle === 'ne' || drag.handle === 'nw') {
        const ax = drag.handle.includes('w') ? anchorRight : s.x;
        const ay = drag.handle.includes('n') ? anchorBottom : s.y;
        const maxAvailW = drag.handle.includes('w') ? ax : 1 - ax;
        const maxAvailH = drag.handle.includes('n') ? ay : 1 - ay;

        const maxAllowedW = Math.min(maxAvailW, maxAvailH * normRatio);
        const minAllowedW = Math.max(MIN_NORM, MIN_NORM * normRatio);

        const rawW = drag.handle.includes('w') ? s.w - dx : s.w + dx;
        const rawH = drag.handle.includes('n') ? s.h - dy : s.h + dy;
        const candW =
          Math.abs(dx) >= Math.abs(dy) ? rawW : rawH * normRatio;

        const nextW = clamp(candW, Math.min(minAllowedW, maxAllowedW), maxAllowedW);
        const nextH = nextW / normRatio;

        setCrop({
          x: drag.handle.includes('w') ? ax - nextW : ax,
          y: drag.handle.includes('n') ? ay - nextH : ay,
          w: nextW,
          h: nextH,
        });
        return;
      }

      // Edge drags with aspect lock centered on perpendicular axis
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;

      if (drag.handle === 'e' || drag.handle === 'w') {
        const ax = drag.handle === 'w' ? anchorRight : s.x;
        const maxAvailW = drag.handle === 'w' ? ax : 1 - ax;
        const maxAvailH = Math.min(cy, 1 - cy) * 2;
        const maxAllowedW = Math.min(maxAvailW, maxAvailH * normRatio);
        const rawW = drag.handle === 'w' ? s.w - dx : s.w + dx;
        const nextW = clamp(rawW, MIN_NORM, maxAllowedW);
        const nextH = nextW / normRatio;
        setCrop({
          x: drag.handle === 'w' ? ax - nextW : ax,
          y: clamp(cy - nextH / 2, 0, 1 - nextH),
          w: nextW,
          h: nextH,
        });
      } else {
        const ay = drag.handle === 'n' ? anchorBottom : s.y;
        const maxAvailH = drag.handle === 'n' ? ay : 1 - ay;
        const maxAvailW = Math.min(cx, 1 - cx) * 2;
        const maxAllowedH = Math.min(maxAvailH, maxAvailW / normRatio);
        const rawH = drag.handle === 'n' ? s.h - dy : s.h + dy;
        const nextH = clamp(rawH, MIN_NORM, maxAllowedH);
        const nextW = nextH * normRatio;
        setCrop({
          x: clamp(cx - nextW / 2, 0, 1 - nextW),
          y: drag.handle === 'n' ? ay - nextH : ay,
          w: nextW,
          h: nextH,
        });
      }
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isOpen, activeAspectRatio, orientedSize.w, orientedSize.h]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isExporting, onCancel]);

  const handleApplyCrop = async () => {
    if (isExporting || isLoadingImage || loadError) return;
    setIsExporting(true);
    try {
      const exported = await cropAndExportImageDataUrl(imageSrc, {
        cropX: crop.x,
        cropY: crop.y,
        cropWidth: crop.w,
        cropHeight: crop.h,
        rotation,
        flipHorizontal,
        targetWidth: outputDimensions.w,
        targetHeight: outputDimensions.h,
        quality: defaultQuality,
        maxDataUrlLength,
      });
      onApply(exported);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'ছবি প্রসেস করতে সমস্যা হয়েছে।'
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const showCircleGuide = shape === 'circle' || (shape === 'square' && aspectId === '1:1');

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-crop-studio-title"
    >
      <div className="relative w-full max-w-3xl bg-[#0B0F1A] border border-white/15 rounded-2xl shadow-2xl text-white flex flex-col max-h-[94dvh] overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Crop className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="image-crop-studio-title"
                className="font-display font-bold text-sm sm:text-base text-white truncate"
              >
                পারফেক্ট ছবি ক্রপ ও সাইজ অ্যাডজাস্ট
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                টেনে ফ্রেম ছোট-বড় করুন · অনুপাত ও সাইজ ঠিক করে সেভ করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isExporting}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close Crop Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Workspace Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {/* Interactive Crop Stage */}
          <div className="relative w-full min-h-[240px] sm:min-h-[320px] rounded-xl bg-[#050810] border border-white/10 flex items-center justify-center p-3 sm:p-4 select-none overflow-hidden">
            {isLoadingImage ? (
              <div className="flex flex-col items-center gap-2.5 py-12 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
                <span className="text-xs font-mono">ছবি প্রস্তুত হচ্ছে...</span>
              </div>
            ) : loadError ? (
              <div className="max-w-sm text-center space-y-3 py-8">
                <p className="text-xs text-red-300 leading-relaxed">{loadError}</p>
                <button
                  type="button"
                  onClick={onCancel}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white cursor-pointer"
                >
                  ফিরে যান
                </button>
              </div>
            ) : (
              orientedPreviewUrl && (
                <div
                  ref={stageRef}
                  className="relative touch-none select-none shadow-2xl"
                  style={{
                    aspectRatio: `${orientedSize.w} / ${orientedSize.h}`,
                    maxHeight: '42dvh',
                    maxWidth: '100%',
                    width:
                      orientedSize.w >= orientedSize.h
                        ? 'min(100%, 560px)'
                        : 'auto',
                    height:
                      orientedSize.h > orientedSize.w
                        ? 'min(42dvh, 420px)'
                        : 'auto',
                  }}
                >
                  {/* Full Oriented Image */}
                  <img
                    src={orientedPreviewUrl}
                    alt="Crop source preview"
                    draggable={false}
                    className="w-full h-full block object-contain pointer-events-none select-none rounded-sm"
                  />

                  {/* Dark Overlay Mask Outside Crop Box */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundColor: 'rgba(4, 7, 13, 0.62)',
                      clipPath: `polygon(
                        0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                        ${(crop.x * 100).toFixed(3)}% ${(crop.y * 100).toFixed(3)}%,
                        ${(crop.x * 100).toFixed(3)}% ${((crop.y + crop.h) * 100).toFixed(3)}%,
                        ${((crop.x + crop.w) * 100).toFixed(3)}% ${((crop.y + crop.h) * 100).toFixed(3)}%,
                        ${((crop.x + crop.w) * 100).toFixed(3)}% ${(crop.y * 100).toFixed(3)}%,
                        ${(crop.x * 100).toFixed(3)}% ${(crop.y * 100).toFixed(3)}%
                      )`,
                    }}
                  />

                  {/* Active Draggable & Resizable Crop Box */}
                  <div
                    onPointerDown={(e) => startDrag('move', e)}
                    className="absolute border-2 border-cyan-400 shadow-[0_0_0_1px_rgba(0,0,0,0.45)] cursor-move touch-none"
                    style={{
                      left: `${crop.x * 100}%`,
                      top: `${crop.y * 100}%`,
                      width: `${crop.w * 100}%`,
                      height: `${crop.h * 100}%`,
                    }}
                  >
                    {/* Rule-of-Thirds Grid Lines */}
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                      <div className="border-r border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-b border-white/20" />
                      <div className="border-r border-white/20" />
                      <div className="border-r border-white/20" />
                      <div />
                    </div>

                    {/* Optional Circular Avatar Guide Overlay */}
                    {showCircleGuide && (
                      <div className="absolute inset-0 rounded-full border border-dashed border-cyan-300/75 pointer-events-none" />
                    )}

                    {/* 4 Corner Handles (Large 32px touch area + crisp visible corner markers) */}
                    {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
                      const posClass =
                        corner === 'nw'
                          ? '-top-3.5 -left-3.5 cursor-nwse-resize'
                          : corner === 'ne'
                          ? '-top-3.5 -right-3.5 cursor-nesw-resize'
                          : corner === 'sw'
                          ? '-bottom-3.5 -left-3.5 cursor-nesw-resize'
                          : '-bottom-3.5 -right-3.5 cursor-nwse-resize';

                      return (
                        <div
                          key={corner}
                          onPointerDown={(e) => startDrag(corner, e)}
                          className={`absolute w-8 h-8 flex items-center justify-center touch-none z-20 ${posClass}`}
                        >
                          <span className="w-3.5 h-3.5 rounded-sm bg-white border-2 border-cyan-500 shadow-md" />
                        </div>
                      );
                    })}

                    {/* 4 Edge Midpoint Handles */}
                    <div
                      onPointerDown={(e) => startDrag('n', e)}
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-10 h-5 flex items-center justify-center cursor-ns-resize touch-none z-10"
                    >
                      <span className="w-6 h-1.5 rounded-full bg-white/95 shadow" />
                    </div>
                    <div
                      onPointerDown={(e) => startDrag('s', e)}
                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-10 h-5 flex items-center justify-center cursor-ns-resize touch-none z-10"
                    >
                      <span className="w-6 h-1.5 rounded-full bg-white/95 shadow" />
                    </div>
                    <div
                      onPointerDown={(e) => startDrag('w', e)}
                      className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-10 flex items-center justify-center cursor-ew-resize touch-none z-10"
                    >
                      <span className="w-1.5 h-6 rounded-full bg-white/95 shadow" />
                    </div>
                    <div
                      onPointerDown={(e) => startDrag('e', e)}
                      className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-10 flex items-center justify-center cursor-ew-resize touch-none z-10"
                    >
                      <span className="w-1.5 h-6 rounded-full bg-white/95 shadow" />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Controls Bar Row 1: Aspect Ratio + Quick Rotate/Flip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-8 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400">
                ক্রপ অনুপাত (Aspect Ratio)
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {ASPECT_OPTIONS.map((opt) => {
                  const active = aspectId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAspectId(opt.id)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                        active
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                          : 'bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-1.5">
              <div className="text-[11px] font-mono text-slate-400">
                ঘোরান ও রিসেট
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-xs font-medium text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Rotate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipHorizontal((f) => !f)}
                  className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    flipHorizontal
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 text-slate-200'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Flip</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRotation(0);
                    setFlipHorizontal(false);
                    setCrop(buildCenteredCrop(orientedSize.w, orientedSize.h, activeAspectRatio));
                  }}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-xs font-medium text-slate-300 inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                  title="Reset Framing"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Controls Bar Row 2: Zoom Framing + Output Size & Custom Pixels */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            {/* Precision Zoom */}
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium inline-flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ক্রপ জুম (Zoom)</span>
                </span>
                <span className="font-mono tabular-nums text-cyan-300 font-semibold">
                  {frameZoomValue.toFixed(2)}x
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyFrameZoom(frameZoomValue - 0.2)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.05}
                  value={clamp(frameZoomValue, 1, 4)}
                  onChange={(e) => applyFrameZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => applyFrameZoom(frameZoomValue + 0.2)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 cursor-pointer shrink-0"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Output Resolution Presets & Custom Px */}
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-300 font-medium inline-flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>আউটপুট সাইজ (px)</span>
                </span>
                <span className="font-mono tabular-nums text-emerald-400">
                  {outputDimensions.w} × {outputDimensions.h} px
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'recommended', label: 'Auto (পারফেক্ট)' },
                    { id: '400', label: '400px' },
                    { id: '800', label: '800px' },
                    { id: '1200', label: '1200px HD' },
                    { id: 'custom', label: 'Custom px' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSizePreset(preset.id)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer whitespace-nowrap ${
                      sizePreset === preset.id
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 font-semibold'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {sizePreset === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                    <span>W:</span>
                    <input
                      type="number"
                      min={32}
                      max={2000}
                      value={customWidth}
                      onChange={(e) => handleCustomWidthChange(parseInt(e.target.value, 10))}
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs font-mono text-white tabular-nums focus:border-cyan-400 focus:outline-none"
                    />
                  </label>
                  <span className="text-slate-500 text-xs">×</span>
                  <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                    <span>H:</span>
                    <input
                      type="number"
                      min={32}
                      max={2000}
                      value={customHeight}
                      onChange={(e) => handleCustomHeightChange(parseInt(e.target.value, 10))}
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs font-mono text-white tabular-nums focus:border-cyan-400 focus:outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setLockCustomRatio((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono border cursor-pointer ${
                      lockCustomRatio
                        ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {lockCustomRatio ? 'Ratio Locked' : 'Ratio Free'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-3.5 border-t border-white/10 bg-[#090D16] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isExporting}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              Cancel
            </button>

            {onQuickSaveOriginal && (
              <button
                type="button"
                onClick={onQuickSaveOriginal}
                disabled={isExporting}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                title="ক্রপ না করে সরাসরি অটো-অপটিমাইজ করে সেভ করুন"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>ক্রপ ছাড়াই নিন</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isExporting || isLoadingImage || Boolean(loadError)}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>অ্যাডজাস্ট হচ্ছে...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span>ক্রপ ও সেভ করুন</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
