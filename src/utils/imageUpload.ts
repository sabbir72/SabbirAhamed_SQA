/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Direct Local File Image Upload, Crop Export & Cloud-Safe Compression
 * Description : Handles device image loading, interactive rotated/flipped/zoomed crop
 *               rendering onto HTML5 Canvas, adaptive WebP/JPEG optimization bounded to
 *               Firestore-safe Data URL byte limits so zero uploads ever fail or break.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-11-10
 * -----------------------------------------
 */

export interface ImageUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  /** Maximum Data URL character length safe for Firestore field storage */
  maxDataUrlLength?: number;
}

export interface CropExportConfig {
  /** Normalized crop rectangle in 0..1 coordinates relative to the transformed image */
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  /** Clockwise rotation in degrees (0, 90, 180, 270) */
  rotation?: number;
  /** Mirror horizontally */
  flipHorizontal?: boolean;
  /** Optional explicit target output width (pixels) */
  targetWidth?: number;
  /** Optional explicit target output height (pixels) */
  targetHeight?: number;
  /** Fallback bounding limits if targetWidth/targetHeight omitted */
  maxWidth?: number;
  maxHeight?: number;
  /** Preferred quality 0..1 */
  quality?: number;
  /** Preferred mime type */
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
  /** Maximum Data URL character budget so Firestore writes always succeed */
  maxDataUrlLength?: number;
}

/**
 * Reads a File into a Data URL string
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Loads an image URL/DataURL into an HTMLImageElement cleanly.
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('/')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('ছবি লোড করা যায়নি। অনুগ্রহ করে ডিভাইস থেকে ফাইল নির্বাচন করুন।'));
    img.src = src;
  });
}

/**
 * Exports an HTMLCanvasElement as a valid Data URL strictly bounded below maxDataUrlLength.
 */
export function exportCanvasToBoundedDataUrl(
  sourceCanvas: HTMLCanvasElement,
  preferredMime: 'image/webp' | 'image/jpeg' | 'image/png' = 'image/webp',
  initialQuality = 0.88,
  maxDataUrlLength = 420000
): string {
  const mimeCandidates: ('image/webp' | 'image/jpeg')[] =
    preferredMime === 'image/jpeg'
      ? ['image/jpeg']
      : ['image/webp', 'image/jpeg'];

  let workingCanvas = sourceCanvas;

  // 1. Try progressive quality steps at full chosen resolution
  for (const mime of mimeCandidates) {
    for (const q of [initialQuality, 0.82, 0.74, 0.65, 0.56]) {
      try {
        const url = workingCanvas.toDataURL(mime, Math.min(0.95, Math.max(0.45, q)));
        if (url.startsWith(`data:${mime}`) && url.length <= maxDataUrlLength) {
          return url;
        }
      } catch {
        // Fallback to next format
      }
    }
  }

  // 2. Proportionally downscale dimensions gently only if byte budget still exceeded
  let scale = 0.82;
  for (let attempt = 0; attempt < 5; attempt++) {
    const scaledW = Math.max(64, Math.round(sourceCanvas.width * scale));
    const scaledH = Math.max(64, Math.round(sourceCanvas.height * scale));
    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = scaledW;
    nextCanvas.height = scaledH;
    const ctx = nextCanvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, scaledW, scaledH);
      workingCanvas = nextCanvas;

      for (const mime of mimeCandidates) {
        for (const q of [0.8, 0.7, 0.6]) {
          try {
            const url = workingCanvas.toDataURL(mime, q);
            if (url.startsWith(`data:${mime}`) && url.length <= maxDataUrlLength) {
              return url;
            }
          } catch {
            // ignore
          }
        }
      }
    }
    scale *= 0.78;
  }

  // Final guaranteed compact JPEG fallback
  return workingCanvas.toDataURL('image/jpeg', 0.55);
}

/**
 * Renders the transformed + cropped region onto an output canvas with high-clarity resampling
 * and returns a self-contained Cloud-safe Data URL.
 */
export async function cropAndExportImageDataUrl(
  sourceSrc: string,
  config: CropExportConfig
): Promise<{ dataUrl: string; width: number; height: number; byteSize: number }> {
  const img = await loadImageElement(sourceSrc);
  const rotation = (((config.rotation || 0) % 360) + 360) % 360;
  const flipH = Boolean(config.flipHorizontal);

  // Step 1: Render rotated/flipped source onto an intermediate canvas
  const swapDims = rotation === 90 || rotation === 270;
  const orientedW = swapDims ? img.naturalHeight || img.height : img.naturalWidth || img.width;
  const orientedH = swapDims ? img.naturalWidth || img.width : img.naturalHeight || img.height;

  const orientedCanvas = document.createElement('canvas');
  orientedCanvas.width = Math.max(1, orientedW);
  orientedCanvas.height = Math.max(1, orientedH);
  const oCtx = orientedCanvas.getContext('2d');
  if (!oCtx) {
    throw new Error('ক্যানভাস প্রসেসিং শুরু করা যায়নি।');
  }

  oCtx.save();
  oCtx.translate(orientedW / 2, orientedH / 2);
  if (rotation !== 0) {
    oCtx.rotate((rotation * Math.PI) / 180);
  }
  if (flipH) {
    oCtx.scale(-1, 1);
  }
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  oCtx.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);
  oCtx.restore();

  // Step 2: Resolve exact source pixel rectangle from normalized 0..1 coordinates
  const normX = Math.max(0, Math.min(0.99, config.cropX));
  const normY = Math.max(0, Math.min(0.99, config.cropY));
  const normW = Math.max(0.01, Math.min(1 - normX, config.cropWidth));
  const normH = Math.max(0.01, Math.min(1 - normY, config.cropHeight));

  const sx = Math.round(normX * orientedW);
  const sy = Math.round(normY * orientedH);
  const sw = Math.max(1, Math.round(normW * orientedW));
  const sh = Math.max(1, Math.round(normH * orientedH));

  // Step 3: Compute output pixel dimensions
  const maxW = config.maxWidth || 1200;
  const maxH = config.maxHeight || 1200;

  let outW = config.targetWidth && config.targetWidth > 0 ? Math.round(config.targetWidth) : sw;
  let outH = config.targetHeight && config.targetHeight > 0 ? Math.round(config.targetHeight) : sh;

  if (!config.targetWidth && !config.targetHeight) {
    const ratio = Math.min(maxW / sw, maxH / sh, 1);
    outW = Math.max(1, Math.round(sw * ratio));
    outH = Math.max(1, Math.round(sh * ratio));
  } else {
    // Clamp explicit user sizes safely to prevent browser/Firestore OOM
    outW = Math.max(32, Math.min(2000, outW));
    outH = Math.max(32, Math.min(2000, outH));
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) {
    throw new Error('আউটপুট ইমেজ তৈরি করা যায়নি।');
  }

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(orientedCanvas, sx, sy, sw, sh, 0, 0, outW, outH);

  const mime =
    config.mimeType === 'image/png'
      ? 'image/webp'
      : config.mimeType || 'image/webp';

  const dataUrl = exportCanvasToBoundedDataUrl(
    outCanvas,
    mime,
    config.quality ?? 0.88,
    config.maxDataUrlLength ?? 420000
  );

  const approxBytes = Math.round((dataUrl.length * 3) / 4);
  return {
    dataUrl,
    width: outW,
    height: outH,
    byteSize: approxBytes,
  };
}

/**
 * Optimizes raster images directly on the client without interactive crop.
 */
async function optimizeImageDataUrl(
  file: File,
  options: ImageUploadOptions = {}
): Promise<string> {
  const maxWidth = options.maxWidth || 1200;
  const maxHeight = options.maxHeight || 1200;
  const quality = options.quality || 0.86;
  const maxDataUrlLength = options.maxDataUrlLength || 420000;

  const rawDataUrl = await readFileAsDataUrl(file);

  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return rawDataUrl;
  }

  try {
    const img = await loadImageElement(rawDataUrl);
    let { width, height } = img;

    if (
      width <= maxWidth &&
      height <= maxHeight &&
      rawDataUrl.length <= maxDataUrlLength
    ) {
      return rawDataUrl;
    }

    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return rawDataUrl;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const outputMime =
      file.type === 'image/png' || file.type === 'image/webp'
        ? 'image/webp'
        : 'image/jpeg';

    const optimized = exportCanvasToBoundedDataUrl(
      canvas,
      outputMime,
      quality,
      maxDataUrlLength
    );
    return optimized.length < rawDataUrl.length || rawDataUrl.length > maxDataUrlLength
      ? optimized
      : rawDataUrl;
  } catch {
    return rawDataUrl;
  }
}

/**
 * Validates and prepares an image file from the user's device.
 */
export async function uploadPortfolioImageFile(
  file: File,
  options: ImageUploadOptions = {}
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('অনুগ্রহ করে একটি সঠিক ছবির ফাইল (JPG, PNG, WebP, SVG) নির্বাচন করুন।');
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error('ছবির সাইজ সর্বোচ্চ ২০ মেগাবাইট (20MB) হতে পারবে।');
  }

  return optimizeImageDataUrl(file, options);
}

/**
 * Uploads an optimized/cropped image Data URL to Cloudflare Free Store (/api/cloud/upload)
 * whenever authenticated as Admin and Cloudflare is configured; falls back cleanly otherwise.
 */
export async function uploadDataUrlToCloudflare(
  dataUrl: string,
  fileName?: string,
  adminToken?: string | null
): Promise<{
  url: string;
  storedInCloudflare: boolean;
  configured: boolean;
  error?: string;
}> {
  if (!dataUrl || !dataUrl.startsWith('data:image/') || !adminToken) {
    return { url: dataUrl, storedInCloudflare: false, configured: false };
  }

  try {
    const response = await fetch('/api/cloud/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({
        dataUrl,
        fileName: fileName || 'portfolio-image',
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      configured?: boolean;
      storedInCloudflare?: boolean;
      url?: string | null;
      error?: string;
    };

    if (response.ok && data.storedInCloudflare && data.url) {
      return {
        url: data.url,
        storedInCloudflare: true,
        configured: true,
      };
    }

    return {
      url: dataUrl,
      storedInCloudflare: false,
      configured: Boolean(data.configured),
      error: data.error,
    };
  } catch (err) {
    return {
      url: dataUrl,
      storedInCloudflare: false,
      configured: false,
      error: err instanceof Error ? err.message : undefined,
    };
  }
}

