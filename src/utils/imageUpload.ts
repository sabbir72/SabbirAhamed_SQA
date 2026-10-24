/**
 * -----------------------------------------
 * Project     : Sabbir Ahamed SQA Portfolio
 * Module      : Direct Local File Image Upload & Self-Contained Persistence Utility
 * Description : Handles local device image file selection, client-side high-clarity WebP/JPEG
 *               optimization, and self-contained Data URL storage mirrored to /api/upload-image
 *               so uploaded images NEVER break (404) across container rebuilds or Vercel deploys.
 * Author      : Sabbir Ahamed
 * Last Updated: 2026-10-24
 * -----------------------------------------
 */

import { getAdminToken } from './adminAuth';

export interface ImageUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Reads a File into a Data URL string
 */
function readFileAsDataUrl(file: File): Promise<string> {
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
 * Optimizes raster images on the client so large phone/camera photos
 * upload instantaneously and remain permanently self-contained across rebuilds.
 */
async function optimizeImageDataUrl(
  file: File,
  options: ImageUploadOptions = {}
): Promise<string> {
  const maxWidth = options.maxWidth || 1200;
  const maxHeight = options.maxHeight || 1200;
  const quality = options.quality || 0.84;

  const rawDataUrl = await readFileAsDataUrl(file);

  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return rawDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width <= maxWidth && height <= maxHeight && file.size <= 220 * 1024) {
        resolve(rawDataUrl);
        return;
      }

      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const outputMime =
        file.type === 'image/png' || file.type === 'image/webp'
          ? 'image/webp'
          : 'image/jpeg';

      try {
        const compressed = canvas.toDataURL(outputMime, quality);
        resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

/**
 * Validates, optimizes, and persists an image file directly from the user's device.
 * Returns a self-contained optimized Data URL (while also mirroring to /api/upload-image)
 * so images never disappear or 404 after a new build or serverless deployment.
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

  const optimizedDataUrl = await optimizeImageDataUrl(file, options);
  const token = getAdminToken() || '';

  // Mirror asynchronously to backend /uploads without relying on ephemeral disk URLs
  fetch('/api/upload-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
    },
    body: JSON.stringify({
      dataUrl: optimizedDataUrl,
      fileName: file.name,
      token,
    }),
  }).catch(() => {});

  return optimizedDataUrl;
}
