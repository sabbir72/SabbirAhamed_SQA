import { buildPaginatedA4Pages } from './pdfPagination';

async function loadHtml2Pdf() {
  const mod = await import('html2pdf.js');
  return mod.default;
}

export interface RenderPreviewPagesOptions {
  sourceElement: HTMLElement;
  margin: [number, number, number, number]; // [top, left, bottom, right] in mm
  stripClassesRegex?: RegExp;
  extraPrintCss?: string;
}

export interface ExportPaginatedPdfOptions {
  sourceElement: HTMLElement;
  margin: [number, number, number, number]; // [top, left, bottom, right] in mm
  filename: string;
  scale: number;
  quality: number;
  compress: boolean;
  stripClassesRegex?: RegExp;
  extraPrintCss?: string;
  urlNormalizer?: (raw: string) => string;
}

export interface RenderedPreviewResult {
  pages: string[];
  innerWidthMm: number;
  innerHeightMm: number;
  margin: [number, number, number, number];
}

interface LinkOverlayItem {
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

const DEFAULT_STRIP_REGEX = /(^|\s)(shadow-\S+|rounded-\S+|min-h-\S+|p-\S+|sm:p-\S+|max-w-\S+)(?=\s|$)/g;

function replaceOklchStylesInDoc(clonedDoc: Document) {
  const colorCache = new Map<string, string>();
  const colorCanvas = clonedDoc.createElement('canvas');
  colorCanvas.width = 1;
  colorCanvas.height = 1;
  const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });

  const convertOklch = (val: string) => {
    if (colorCache.has(val)) return colorCache.get(val)!;
    let resolved = '#111827';
    if (colorCtx) {
      try {
        colorCtx.clearRect(0, 0, 1, 1);
        colorCtx.fillStyle = 'rgba(0,0,0,0)';
        colorCtx.fillStyle = val;
        colorCtx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = colorCtx.getImageData(0, 0, 1, 1).data;
        resolved =
          a === 0
            ? 'transparent'
            : a < 255
            ? `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
            : `rgb(${r}, ${g}, ${b})`;
      } catch {
        resolved = '#111827';
      }
    }
    colorCache.set(val, resolved);
    return resolved;
  };

  const modernColorPattern = /oklch\([^)]+\)|oklab\([^)]+\)|color-mix\((?:[^()]+|\([^()]*\))*\)/g;

  const sanitizeCssText = (cssText: string): string => {
    if (
      !cssText.includes('oklch') &&
      !cssText.includes('oklab') &&
      !cssText.includes('color-mix')
    ) {
      return cssText;
    }
    return cssText.replace(modernColorPattern, (match) => convertOklch(match));
  };

  const styles = clonedDoc.querySelectorAll('style');
  styles.forEach((styleTag) => {
    if (styleTag.innerHTML) {
      const nextCss = sanitizeCssText(styleTag.innerHTML);
      if (nextCss !== styleTag.innerHTML) {
        styleTag.innerHTML = nextCss;
      }
    }
  });

  // Production builds emit <link rel="stylesheet"> files which html2canvas parses directly
  const links = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
  links.forEach((linkEl) => {
    try {
      const sheet = (linkEl as HTMLLinkElement).sheet;
      if (!sheet) return;
      const rules = Array.from(sheet.cssRules || []);
      const combinedCss = rules.map((r) => r.cssText).join('\n');
      if (
        combinedCss.includes('oklch') ||
        combinedCss.includes('oklab') ||
        combinedCss.includes('color-mix')
      ) {
        const replacementStyle = clonedDoc.createElement('style');
        replacementStyle.textContent = sanitizeCssText(combinedCss);
        linkEl.parentNode?.insertBefore(replacementStyle, linkEl);
        linkEl.parentNode?.removeChild(linkEl);
      }
    } catch {
      // Cross-origin stylesheets (e.g. Google Fonts) have no oklch and cannot be read via cssRules
    }
  });
}

function defaultNormalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('www.')) return `https://${trimmed}`;
  return `https://${trimmed}`;
}

async function waitForDocumentFonts() {
  try {
    const fontsReady = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    if (fontsReady) {
      await Promise.race([fontsReady, new Promise((resolve) => setTimeout(resolve, 700))]);
    }
  } catch {
    // Proceed even if font API is unavailable
  }
}

/**
 * Packs sourceElement into discrete A4 page DOM nodes and renders each page
 * individually onto its own A4-proportioned JPEG data URL, ensuring zero
 * cumulative drift and zero horizontal slicing of text across pages.
 */
async function renderDiscretePageImages(params: {
  sourceElement: HTMLElement;
  margin: [number, number, number, number];
  scale: number;
  quality: number;
  stripClassesRegex?: RegExp;
  extraPrintCss?: string;
  collectLinks?: boolean;
  urlNormalizer?: (raw: string) => string;
}): Promise<{
  pageImages: string[];
  linkOverlays: LinkOverlayItem[];
  innerWidthMm: number;
  innerHeightMm: number;
}> {
  const {
    sourceElement,
    margin,
    scale,
    quality,
    stripClassesRegex = DEFAULT_STRIP_REGEX,
    extraPrintCss = '',
    collectLinks = false,
    urlNormalizer = defaultNormalizeUrl,
  } = params;

  const [html2pdf] = await Promise.all([loadHtml2Pdf(), waitForDocumentFonts()]);

  const innerWidthMm = 210 - margin[1] - margin[3];
  const innerHeightMm = 297 - margin[0] - margin[2];
  const marginY = margin[0];
  const marginX = margin[1];

  const { pages: pageElements } = buildPaginatedA4Pages(sourceElement, {
    innerWidthMm,
    innerHeightMm,
    pageFillRatio: 0.85,
    stripClassesRegex,
  });

  const pageImages: string[] = [];
  const linkOverlays: LinkOverlayItem[] = [];

  for (let pageIdx = 0; pageIdx < pageElements.length; pageIdx++) {
    const pageEl = pageElements[pageIdx];
    const pageLinks: LinkOverlayItem[] = [];

    const opt = {
      margin,
      image: { type: 'jpeg' as const, quality },
      enableLinks: false,
      html2canvas: {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 960,
        windowHeight: Math.max(window.innerHeight || 1200, 1800),
        onclone: (clonedDoc: Document) => {
          replaceOklchStylesInDoc(clonedDoc);
          const styleEl = clonedDoc.createElement('style');
          styleEl.textContent = `
            .html2pdf__overlay {
              position: static !important;
              left: 0 !important;
              top: 0 !important;
              right: auto !important;
              bottom: auto !important;
              width: auto !important;
              height: auto !important;
              overflow: visible !important;
              background: transparent !important;
            }
            .html2pdf__container {
              position: relative !important;
              left: auto !important;
              right: auto !important;
              top: auto !important;
              height: auto !important;
              margin: 0 !important;
              overflow: visible !important;
              padding: 0 0 16px 0 !important;
            }
            .cv-pdf-exporting {
              padding: 0 0 16px 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              height: auto !important;
              overflow: visible !important;
              display: flow-root !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              background-color: #ffffff !important;
              color: #111827 !important;
              font-variant-ligatures: none !important;
            }
            .cv-pdf-exporting * {
              box-sizing: border-box !important;
              font-variant-ligatures: none !important;
            }
            .cv-pdf-exporting .cv-refs-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
            ul {
              list-style-position: outside !important;
            }
            ${extraPrintCss}
          `;
          clonedDoc.head.appendChild(styleEl);

          if (collectLinks) {
            const root = (clonedDoc.querySelector('.html2pdf__container .cv-pdf-exporting') ||
              clonedDoc.querySelector('.cv-pdf-exporting')) as HTMLElement | null;
            if (root) {
              const rootRect = root.getBoundingClientRect();
              const effectiveWidth = rootRect.width || (innerWidthMm * 96) / 25.4;
              const mmPerPx = innerWidthMm / effectiveWidth;

              const anchorEls = root.querySelectorAll('a[href]');
              anchorEls.forEach((aEl) => {
                const a = aEl as HTMLAnchorElement;
                const rawHref = a.getAttribute('href') || a.href;
                if (!rawHref || rawHref === '#' || rawHref.startsWith('javascript:')) return;
                const url = urlNormalizer(rawHref);

                const clientRects = a.getClientRects();
                for (let i = 0; i < clientRects.length; i++) {
                  const rect = clientRects[i];
                  if (rect.width <= 0 || rect.height <= 0) continue;

                  const leftPx = rect.left - rootRect.left;
                  const topPx = rect.top - rootRect.top;

                  pageLinks.push({
                    url,
                    x: Math.max(0, leftPx * mmPerPx),
                    y: Math.max(0, topPx * mmPerPx),
                    w: rect.width * mmPerPx,
                    h: rect.height * mmPerPx,
                    page: pageIdx + 1,
                  });
                }
              });
            }
          }
        },
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: [] as string[], before: [] as string[], after: [] as string[], avoid: [] as string[] },
    };

    const worker: any = html2pdf().set(opt).from(pageEl);
    await worker.toContainer();

    const overlayEl = worker?.prop?.overlay as HTMLElement | undefined;
    const containerEl = worker?.prop?.container as HTMLElement | undefined;
    if (overlayEl) {
      overlayEl.style.position = 'fixed';
      overlayEl.style.top = '0';
      overlayEl.style.left = '0';
      overlayEl.style.right = 'auto';
      overlayEl.style.bottom = 'auto';
      overlayEl.style.width = 'auto';
      overlayEl.style.height = 'auto';
      overlayEl.style.overflow = 'visible';
      overlayEl.style.opacity = '0';
      overlayEl.style.pointerEvents = 'none';
      overlayEl.style.zIndex = '-1';
    }
    if (containerEl) {
      containerEl.style.position = 'relative';
      containerEl.style.top = '0';
      containerEl.style.left = '0';
      containerEl.style.right = 'auto';
      containerEl.style.margin = '0';
      containerEl.style.height = 'auto';
      containerEl.style.overflow = 'visible';
      containerEl.style.paddingBottom = '16px';
      const fullH = Math.ceil(Math.max(containerEl.scrollHeight, containerEl.getBoundingClientRect().height) + 16);
      worker.opt.html2canvas.height = fullH;
      worker.opt.html2canvas.windowHeight = Math.max(window.innerHeight || 1200, fullH + 400);
    }

    const rawCanvas: HTMLCanvasElement = await worker.toCanvas().get('canvas');
    if (!rawCanvas || rawCanvas.width <= 0 || rawCanvas.height <= 0) {
      throw new Error(`Rendered empty canvas on page ${pageIdx + 1}`);
    }
    const targetPageCanvasHeight = Math.max(1, Math.floor(rawCanvas.width * (innerHeightMm / innerWidthMm)));

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = rawCanvas.width;
    pageCanvas.height = targetPageCanvasHeight;
    const ctx = pageCanvas.getContext('2d');

    let fitScale = 1;
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      // Guarantee single-page canvas never clips at bottom even under extreme webfont inflation
      if (rawCanvas.height > targetPageCanvasHeight) {
        fitScale = (targetPageCanvasHeight - 4) / rawCanvas.height;
      }

      const drawW = Math.round(rawCanvas.width * fitScale);
      const drawH = Math.round(rawCanvas.height * fitScale);
      ctx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, drawW, drawH);
    }

    pageImages.push(pageCanvas.toDataURL('image/jpeg', quality));

    if (collectLinks) {
      pageLinks.forEach((lnk) => {
        linkOverlays.push({
          url: lnk.url,
          x: Math.max(0, marginX + lnk.x * fitScale - 0.4),
          y: Math.max(0, marginY + lnk.y * fitScale - 0.4),
          w: lnk.w * fitScale + 0.8,
          h: lnk.h * fitScale + 0.8,
          page: lnk.page,
        });
      });
    }
  }

  return { pageImages, linkOverlays, innerWidthMm, innerHeightMm };
}

/**
 * Generates exact discrete A4 PDF with clickable link annotations and zero mid-line cuts.
 */
export async function exportPaginatedPdf(options: ExportPaginatedPdfOptions): Promise<{
  pdf: any;
  byteLength: number;
}> {
  const {
    sourceElement,
    margin,
    filename,
    scale,
    quality,
    compress,
    stripClassesRegex,
    extraPrintCss,
    urlNormalizer,
  } = options;

  const { pageImages, linkOverlays, innerWidthMm, innerHeightMm } = await renderDiscretePageImages({
    sourceElement,
    margin,
    scale,
    quality,
    stripClassesRegex,
    extraPrintCss,
    collectLinks: true,
    urlNormalizer,
  });

  // Initialize jsPDF document cleanly from a 1x1 dummy node using html2pdf worker
  const html2pdf = await loadHtml2Pdf();
  const initNode = document.createElement('div');
  initNode.style.width = '1px';
  initNode.style.height = '1px';
  initNode.style.backgroundColor = '#ffffff';

  const pdf = await html2pdf()
    .set({
      margin,
      filename,
      image: { type: 'jpeg' as const, quality },
      enableLinks: false,
      html2canvas: { scale: 1, backgroundColor: '#ffffff', logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const, compress } as Record<string, unknown>,
    })
    .from(initNode)
    .toPdf()
    .get('pdf');

  if (pdf) {
    for (let i = 0; i < pageImages.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      pdf.setPage(i + 1);
      pdf.addImage(pageImages[i], 'JPEG', margin[1], margin[0], innerWidthMm, innerHeightMm);
    }

    if (pdf.internal && linkOverlays.length > 0) {
      pdf.link = function (x: number, y: number, w: number, h: number, linkOpts: any) {
        const pageInfo = this.internal.getCurrentPageInfo();
        const s = this.internal.getCoordinateString;
        const o = this.internal.getVerticalCoordinateString;
        pageInfo.pageContext.annotations.push({
          finalBounds: {
            x: s(x),
            y: o(y + h),
            w: s(x + w),
            h: o(y),
          },
          options: linkOpts,
          type: 'link',
        });
      };

      const totalPages = pdf.internal.getNumberOfPages();
      linkOverlays.forEach((item) => {
        if (item.page <= totalPages) {
          pdf.setPage(item.page);
          pdf.link(item.x, item.y, item.w, item.h, { url: item.url });
        }
      });
      pdf.setPage(totalPages);
    }
  }

  const buffer = pdf.output('arraybuffer');
  return { pdf, byteLength: buffer?.byteLength ?? 0 };
}

/**
 * Generates exact paginated A4 preview page images matching the PDF export engine 1:1.
 */
export async function renderA4PreviewPages({
  sourceElement,
  margin,
  stripClassesRegex = DEFAULT_STRIP_REGEX,
  extraPrintCss = '',
}: RenderPreviewPagesOptions): Promise<RenderedPreviewResult> {
  const { pageImages, innerWidthMm, innerHeightMm } = await renderDiscretePageImages({
    sourceElement,
    margin,
    scale: 1.75,
    quality: 0.94,
    stripClassesRegex,
    extraPrintCss,
    collectLinks: false,
  });

  return { pages: pageImages, innerWidthMm, innerHeightMm, margin };
}

/**
 * Triggers native vector printing using discrete pre-paginated A4 page blocks
 * inside a viewport-mounted 1px iframe and detects if the parent iframe sandbox
 * blocked the print dialog cleanly.
 */
export async function triggerVectorPrint(options: {
  sourceElement: HTMLElement | null;
  documentTitle: string;
  marginMm?: [number, number, number, number];
  pageMarginCss?: string;
  extraPrintCss?: string;
  stripClassesRegex?: RegExp;
}): Promise<{ openedDialog: boolean; blockedBySandbox: boolean }> {
  const {
    sourceElement,
    documentTitle,
    marginMm = [12, 13, 12, 13],
    pageMarginCss = '12mm 13mm',
    extraPrintCss = '',
    stripClassesRegex = DEFAULT_STRIP_REGEX,
  } = options;

  await waitForDocumentFonts();

  return new Promise((resolve) => {
    try {
      window.focus();

      if (!sourceElement) {
        let dialogTriggered = false;
        const onBefore = () => {
          dialogTriggered = true;
        };
        window.addEventListener('beforeprint', onBefore, { once: true });
        const start = Date.now();
        window.print();
        const elapsed = Date.now() - start;
        setTimeout(() => {
          window.removeEventListener('beforeprint', onBefore);
          const blocked = !dialogTriggered && elapsed < 120 && window.self !== window.top;
          resolve({ openedDialog: !blocked, blockedBySandbox: blocked });
        }, 350);
        return;
      }

      const innerWidthMm = 210 - marginMm[1] - marginMm[3];
      const innerHeightMm = 297 - marginMm[0] - marginMm[2];
      const { pages } = buildPaginatedA4Pages(sourceElement, {
        innerWidthMm,
        innerHeightMm,
        pageFillRatio: 0.85,
        stripClassesRegex,
      });

      const pagesHtml = pages
        .map(
          (pageEl, idx) =>
            `<div class="print-a4-sheet"${
              idx < pages.length - 1 ? ' style="break-after: page; page-break-after: always;"' : ''
            }>${pageEl.outerHTML}</div>`
        )
        .join('\n');

      const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('\n');

      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0.001';
      iframe.style.pointerEvents = 'none';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const cleanupIframe = () => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      };

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        cleanupIframe();
        window.print();
        resolve({ openedDialog: true, blockedBySandbox: false });
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${documentTitle}</title>
            ${styleSheets}
            <style>
              @page { size: A4 portrait; margin: ${pageMarginCss}; }
              html, body {
                background-color: #ffffff !important;
                background: #ffffff !important;
                color: #111827 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-a4-sheet {
                width: 100% !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              .print-only-resume, .print-cover-letter-root, .cv-pdf-exporting {
                display: flow-root !important;
                width: 100% !important;
                max-width: 100% !important;
                min-height: auto !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                background: #ffffff !important;
                color: #111827 !important;
                padding: 0 !important;
                margin: 0 !important;
                font-variant-ligatures: none !important;
              }
              .cv-pdf-exporting * {
                box-sizing: border-box !important;
              }
              .cv-refs-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
              ul {
                list-style-position: outside !important;
              }
              ${extraPrintCss}
            </style>
          </head>
          <body>
            ${pagesHtml}
          </body>
        </html>
      `);
      doc.close();

      const executePrint = () => {
        let dialogOpened = false;
        const win = iframe.contentWindow;
        const markOpened = () => {
          dialogOpened = true;
        };

        try {
          if (win) {
            win.addEventListener('beforeprint', markOpened, { once: true });
            win.onafterprint = cleanupIframe;
            win.focus();
            const start = Date.now();
            win.print();
            const elapsed = Date.now() - start;

            setTimeout(() => {
              win.removeEventListener('beforeprint', markOpened);
              const blockedBySandbox = !dialogOpened && elapsed < 120 && window.self !== window.top;
              resolve({ openedDialog: !blockedBySandbox, blockedBySandbox });
            }, 350);
          } else {
            window.print();
            resolve({ openedDialog: true, blockedBySandbox: false });
          }
        } catch (err) {
          console.warn('Iframe print failed, trying window.print()', err);
          try {
            window.print();
          } catch {
            // ignore
          }
          resolve({ openedDialog: false, blockedBySandbox: window.self !== window.top });
        }

        setTimeout(cleanupIframe, 5000);
      };

      const fontsReady = (doc as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
      if (fontsReady) {
        Promise.race([fontsReady, new Promise((r) => setTimeout(r, 700))]).then(() => {
          setTimeout(executePrint, 160);
        });
      } else {
        setTimeout(executePrint, 420);
      }
    } catch (err) {
      console.error('Print error:', err);
      resolve({ openedDialog: false, blockedBySandbox: window.self !== window.top });
    }
  });
}
