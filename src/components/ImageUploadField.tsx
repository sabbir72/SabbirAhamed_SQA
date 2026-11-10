import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Loader2,
  Link2,
  CheckCircle2,
  Crop,
} from 'lucide-react';
import {
  readFileAsDataUrl,
  uploadPortfolioImageFile,
} from '../utils/imageUpload';
import ImageCropModal from './ImageCropModal';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (newUrl: string) => void;
  aspect?: 'square' | 'wide';
  shape?: 'square' | 'circle' | 'banner' | 'wide';
  imageFit?: 'cover' | 'contain';
  accentColor?: string;
  uploadOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxDataUrlLength?: number;
  };
  helperText?: string;
  defaultResetUrl?: string;
  resetLabel?: string;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  aspect = 'wide',
  shape,
  imageFit = 'cover',
  accentColor = 'indigo',
  uploadOptions,
  helperText,
  defaultResetUrl,
  resetLabel = 'Use Default',
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastDimensionLabel, setLastDimensionLabel] = useState('');

  // Pending image source for interactive Crop & Size Adjust Studio
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [pendingRawFile, setPendingRawFile] = useState<File | null>(null);

  const resolvedShape = shape || aspect;
  const isCompactSquare = resolvedShape === 'square' || resolvedShape === 'circle';
  const defaultMaxW = uploadOptions?.maxWidth ?? (isCompactSquare ? 900 : 1280);
  const defaultMaxH = uploadOptions?.maxHeight ?? (isCompactSquare ? 900 : 800);
  const defaultQuality = uploadOptions?.quality ?? 0.88;
  const defaultMaxDataUrlLen =
    uploadOptions?.maxDataUrlLength ?? (isCompactSquare ? 280000 : 420000);

  const buttonAccentClasses =
    accentColor === 'cyan'
      ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20'
      : accentColor === 'emerald'
      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
      : accentColor === 'amber'
      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
      : accentColor === 'purple'
      ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20';

  const processSelectedFile = async (file?: File | null) => {
    if (!file) return;
    setErrorMsg('');

    if (!file.type.startsWith('image/')) {
      setErrorMsg('অনুগ্রহ করে একটি সঠিক ছবির ফাইল (JPG, PNG, WebP, SVG) নির্বাচন করুন।');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('ছবির সাইজ সর্বোচ্চ ২০ মেগাবাইট (20MB) হতে পারবে।');
      return;
    }

    // Keep SVG & GIF direct without flattening vectors/animation
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      setIsUploading(true);
      try {
        const uploadedUrl = await uploadPortfolioImageFile(file, {
          maxWidth: defaultMaxW,
          maxHeight: defaultMaxH,
          quality: defaultQuality,
          maxDataUrlLength: defaultMaxDataUrlLen,
        });
        setLastDimensionLabel('');
        onChange(uploadedUrl);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'ছবি আপলোড করতে সমস্যা হয়েছে।');
      } finally {
        setIsUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
      return;
    }

    // Open interactive Crop & Size Adjust modal with the selected file
    setIsUploading(true);
    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      setPendingRawFile(file);
      setCropSourceUrl(rawDataUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ছবি পড়তে সমস্যা হয়েছে।');
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleQuickSaveWithoutCrop = async () => {
    if (!pendingRawFile) {
      setCropSourceUrl(null);
      return;
    }
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadPortfolioImageFile(pendingRawFile, {
        maxWidth: defaultMaxW,
        maxHeight: defaultMaxH,
        quality: defaultQuality,
        maxDataUrlLength: defaultMaxDataUrlLen,
      });
      setLastDimensionLabel('');
      onChange(uploadedUrl);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ছবি সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsUploading(false);
      setCropSourceUrl(null);
      setPendingRawFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFile(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processSelectedFile(file);
  };

  const handleOpenCropExisting = () => {
    if (!value || !value.trim() || isUploading) return;
    setErrorMsg('');
    setPendingRawFile(null);
    setCropSourceUrl(value);
  };

  const hasImage = Boolean(value && value.trim());

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-mono text-[#D1D5DB] font-semibold flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-[var(--color-accent,#00D2FF)]" />
          <span>{label}</span>
        </label>

        <div className="flex items-center gap-2">
          {defaultResetUrl && value !== defaultResetUrl && (
            <button
              type="button"
              onClick={() => {
                setLastDimensionLabel('');
                onChange(defaultResetUrl);
              }}
              className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              {resetLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowUrlInput((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Link2 className="w-3 h-3" />
            <span>{showUrlInput ? 'Hide Link Field' : 'Image Link (Optional)'}</span>
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border transition-all p-3.5 sm:p-4 bg-white/[0.03] ${
          isDragging
            ? 'border-[var(--color-accent,#00D2FF)] bg-[var(--color-accent,#00D2FF)]/10'
            : 'border-white/15 hover:border-white/25'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Live Thumbnail Preview */}
          <div
            onClick={() => !isUploading && inputRef.current?.click()}
            className={`relative overflow-hidden border border-white/15 flex items-center justify-center shrink-0 cursor-pointer group ${
              hasImage && imageFit === 'contain' ? 'bg-white p-1.5' : 'bg-[#090D16]'
            } ${
              resolvedShape === 'circle'
                ? 'w-20 h-20 sm:w-24 sm:h-24 rounded-full'
                : isCompactSquare
                ? 'w-20 h-20 sm:w-24 sm:h-24 rounded-xl'
                : 'w-full sm:w-36 h-24 rounded-xl'
            }`}
            title="Click to choose image from device"
          >
            {hasImage ? (
              <>
                <img
                  src={value}
                  alt="Uploaded preview"
                  className={`w-full h-full ${imageFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = '0.25';
                  }}
                />
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-mono text-white font-semibold">
                  Change
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-1 p-2 text-center">
                <ImageIcon className="w-6 h-6 text-slate-400" />
                <span className="text-[10px] font-mono">No Photo</span>
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[var(--color-accent,#00D2FF)] animate-spin" />
              </div>
            )}
          </div>

          {/* Upload Actions & Status */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-white">
                ডিভাইস বা ফাইল থেকে সরাসরি ছবি আপলোড ও ক্রপ করুন
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {helperText ||
                  'JPG, PNG, WebP বা SVG ফাইল বেছে নিয়ে পারফেক্ট সাইজ ও ক্রপ অ্যাডজাস্ট করতে পারবেন।'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
                className={`min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-mono font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50 ${buttonAccentClasses}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {hasImage ? 'নতুন ছবি বাছুন' : 'ফাইল থেকে ছবি আপলোড করুন'}
                    </span>
                  </>
                )}
              </button>

              {hasImage && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleOpenCropExisting}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/35 text-xs font-mono font-semibold transition-colors cursor-pointer"
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>ক্রপ ও সাইজ ঠিক করুন</span>
                </button>
              )}

              {hasImage && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setLastDimensionLabel('');
                    onChange('');
                  }}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 text-xs font-mono transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {hasImage && !errorMsg && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {lastDimensionLabel
                    ? `ক্রপ ও সাইজ সেট হয়েছে (${lastDimensionLabel})`
                    : value.startsWith('data:')
                    ? 'ডিভাইস থেকে আপলোডকৃত ছবি যুক্ত আছে'
                    : value.startsWith('/uploads/')
                    ? `আপলোডকৃত ফাইল (${value.replace('/uploads/', '')})`
                    : value}
                </span>
              </div>
            )}

            {errorMsg && (
              <p className="text-[11px] font-mono text-red-400">{errorMsg}</p>
            )}
          </div>
        </div>

        {showUrlInput && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <input
              type="text"
              value={value.startsWith('data:') ? '' : value}
              onChange={(e) => {
                setLastDimensionLabel('');
                onChange(e.target.value);
              }}
              placeholder="অথবা সরাসরি ছবির লিংক দিন (https://... বা /sabbir_avatar.jpeg)"
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs font-mono text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Interactive Crop & Perfect Size Adjuster Modal */}
      {cropSourceUrl && (
        <ImageCropModal
          isOpen={Boolean(cropSourceUrl)}
          imageSrc={cropSourceUrl}
          shape={resolvedShape}
          recommendedMaxWidth={defaultMaxW}
          recommendedMaxHeight={defaultMaxH}
          maxDataUrlLength={defaultMaxDataUrlLen}
          defaultQuality={defaultQuality}
          onCancel={() => {
            setCropSourceUrl(null);
            setPendingRawFile(null);
          }}
          onQuickSaveOriginal={
            pendingRawFile ? handleQuickSaveWithoutCrop : undefined
          }
          onApply={(result) => {
            const kb = Math.max(1, Math.round(result.byteSize / 1024));
            setLastDimensionLabel(`${result.width}×${result.height}px · ${kb}KB`);
            onChange(result.dataUrl);
            setCropSourceUrl(null);
            setPendingRawFile(null);
          }}
        />
      )}
    </div>
  );
}
