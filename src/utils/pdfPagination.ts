export interface DiscretePdfPaginationOptions {
  innerWidthMm: number;
  innerHeightMm: number;
  /**
   * Maximum fraction of the printable A4 page height each page container may fill
   * before moving the next atomic block to a new page (default 0.89 = ~30mm safety reserve).
   */
  pageFillRatio?: number;
  stripClassesRegex?: RegExp;
}

const HEADING_SELECTOR = '.cv-section-heading, h1, h2, h3';
const LEAF_ATOMIC_SELECTOR = '.cv-pdf-item, .cv-pdf-row, li, tr, p';
const DEFAULT_STRIP_REGEX = /(^|\s)(shadow-\S+|rounded-\S+|min-h-\S+|p-\S+|sm:p-\S+|max-w-\S+)(?=\s|$)/g;
const PAGE_BOTTOM_BUFFER_PX = 16;

function isHiddenOrEmpty(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return true;
  const rect = el.getBoundingClientRect();
  return rect.height <= 0.1 || rect.width <= 0.1;
}

function isHorizontalLayout(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const display = style.display;
  const flexDir = style.flexDirection;
  return (
    display === 'grid' ||
    display === 'inline-grid' ||
    ((display === 'flex' || display === 'inline-flex') && !flexDir.startsWith('column'))
  );
}

function getVisibleChildren(el: HTMLElement): HTMLElement[] {
  return Array.from(el.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && !isHiddenOrEmpty(child)
  );
}

function hasPlacedPageContent(pageRoot: HTMLElement): boolean {
  if ((pageRoot.textContent || '').trim().length > 0) return true;
  return pageRoot.querySelectorAll('img, svg, canvas, hr').length > 0;
}

function measurePageContentHeight(pageRoot: HTMLElement): number {
  const rootRect = pageRoot.getBoundingClientRect();
  let maxDescendantBottom = rootRect.height;

  const nodes = pageRoot.querySelectorAll('*');
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (!(el instanceof HTMLElement)) continue;
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.width > 0) {
      const relBottom = r.bottom - rootRect.top + PAGE_BOTTOM_BUFFER_PX;
      if (relBottom > maxDescendantBottom) {
        maxDescendantBottom = relBottom;
      }
    }
  }

  return Math.max(rootRect.height, pageRoot.scrollHeight, Math.ceil(maxDescendantBottom));
}

function measureSoloElementHeight(host: HTMLElement, rootClassName: string, el: HTMLElement): number {
  const probe = document.createElement('div');
  probe.className = rootClassName;
  probe.style.display = 'flow-root';
  probe.style.width = '100%';
  probe.style.maxWidth = '100%';
  probe.style.margin = '0';
  probe.style.padding = `0 0 ${PAGE_BOTTOM_BUFFER_PX}px 0`;
  probe.style.boxSizing = 'border-box';
  probe.style.fontVariantLigatures = 'none';
  probe.appendChild(el.cloneNode(true));
  host.appendChild(probe);
  const h = measurePageContentHeight(probe);
  host.removeChild(probe);
  return h;
}

/**
 * Splits a source document into discrete, self-contained A4 page DOM roots so that
 * no text line, heading, bullet, project card, or reference row can ever cross or
 * be sliced at a page boundary during canvas capture or printing.
 */
export function buildPaginatedA4Pages(
  sourceElement: HTMLElement,
  options: DiscretePdfPaginationOptions
): {
  pages: HTMLElement[];
  innerWidthPx: number;
  innerPageHeightPx: number;
} {
  const {
    innerWidthMm,
    innerHeightMm,
    pageFillRatio = 0.85,
    stripClassesRegex = DEFAULT_STRIP_REGEX,
  } = options;

  const cleanRootClassName = `${sourceElement.className
    .replace(stripClassesRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim()} cv-pdf-exporting`.trim();

  // Mount an offscreen host matching the exact printable mm width of the PDF
  const host = document.createElement('div');
  host.setAttribute('data-pdf-page-packer', 'true');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.width = `${innerWidthMm}mm`;
  host.style.margin = '0';
  host.style.padding = '0';
  host.style.border = 'none';
  host.style.backgroundColor = '#ffffff';
  host.style.color = '#111827';
  host.style.opacity = '0';
  host.setAttribute('aria-hidden', 'true');
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-1';
  host.style.boxSizing = 'border-box';
  document.body.appendChild(host);

  try {
    // Also mount a normalized reference clone inside host so computed styles/heights are measured accurately
    const stagedSource = sourceElement.cloneNode(true) as HTMLElement;
    stagedSource.className = cleanRootClassName;
    stagedSource.style.display = 'flow-root';
    stagedSource.style.width = '100%';
    stagedSource.style.maxWidth = '100%';
    stagedSource.style.margin = '0';
    stagedSource.style.padding = `0 0 ${PAGE_BOTTOM_BUFFER_PX}px 0`;
    stagedSource.style.minHeight = 'auto';
    stagedSource.style.overflow = 'visible';
    stagedSource.style.border = 'none';
    stagedSource.style.boxShadow = 'none';
    stagedSource.style.borderRadius = '0px';
    stagedSource.style.backgroundColor = '#ffffff';
    stagedSource.style.color = '#111827';
    stagedSource.style.boxSizing = 'border-box';
    stagedSource.style.fontVariantLigatures = 'none';
    host.appendChild(stagedSource);
    void stagedSource.offsetHeight;

    const innerWidthPx = stagedSource.getBoundingClientRect().width || (innerWidthMm * 96) / 25.4;
    const innerPageHeightPx = innerWidthPx * (innerHeightMm / innerWidthMm);
    const maxContentHeightPx = Math.floor(innerPageHeightPx * pageFillRatio);
    const maxMoveWholeKeepTogetherPx = Math.floor(maxContentHeightPx * 0.82);

    const pages: HTMLElement[] = [];
    // Open ancestor source nodes & their live cloned wrappers on the active page
    const sourceWrapperStack: HTMLElement[] = [];
    let liveWrapperStack: HTMLElement[] = [];
    let activePageRoot!: HTMLElement;

    const createBlankPageRoot = (): HTMLElement => {
      const root = document.createElement('div');
      root.className = cleanRootClassName;
      root.style.display = 'flow-root';
      root.style.width = '100%';
      root.style.maxWidth = '100%';
      root.style.margin = '0';
      root.style.padding = `0 0 ${PAGE_BOTTOM_BUFFER_PX}px 0`;
      root.style.minHeight = 'auto';
      root.style.overflow = 'visible';
      root.style.border = 'none';
      root.style.boxShadow = 'none';
      root.style.borderRadius = '0px';
      root.style.backgroundColor = '#ffffff';
      root.style.color = '#111827';
      root.style.boxSizing = 'border-box';
      root.style.fontVariantLigatures = 'none';
      return root;
    };

    const startNewPage = () => {
      activePageRoot = createBlankPageRoot();
      pages.push(activePageRoot);
      host.appendChild(activePageRoot);

      // Re-open the current ancestor wrapper tags inside the fresh page
      liveWrapperStack = [];
      let parentTarget: HTMLElement = activePageRoot;
      for (const srcWrapper of sourceWrapperStack) {
        const clonedWrapper = srcWrapper.cloneNode(false) as HTMLElement;
        // Strip top spacing when continuing a wrapper at the top of a new page
        clonedWrapper.style.marginTop = '0px';
        clonedWrapper.style.paddingTop = '0px';
        parentTarget.appendChild(clonedWrapper);
        liveWrapperStack.push(clonedWrapper);
        parentTarget = clonedWrapper;
      }
    };

    const getCurrentInsertTarget = (): HTMLElement => {
      return liveWrapperStack.length > 0
        ? liveWrapperStack[liveWrapperStack.length - 1]
        : activePageRoot;
    };

    const cloneFirstLookaheadFragment = (nextEl: HTMLElement): HTMLElement => {
      const nextHeight = nextEl.getBoundingClientRect().height;
      const children = getVisibleChildren(nextEl);
      if (nextHeight <= 185 || children.length === 0) {
        return nextEl.cloneNode(true) as HTMLElement;
      }
      const shallow = nextEl.cloneNode(false) as HTMLElement;
      shallow.appendChild(children[0].cloneNode(true));
      return shallow;
    };

    startNewPage();

    const packChildren = (sourceContainer: HTMLElement) => {
      const children = getVisibleChildren(sourceContainer);

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const nextSibling = i + 1 < children.length ? children[i + 1] : null;

        // 1. Heading orphan prevention: pair heading with its following item
        if (child.matches(HEADING_SELECTOR) && nextSibling) {
          const hadContentBefore = hasPlacedPageContent(activePageRoot);
          const headingClone = child.cloneNode(true) as HTMLElement;
          const lookaheadClone = cloneFirstLookaheadFragment(nextSibling);
          const target = getCurrentInsertTarget();

          target.appendChild(headingClone);
          target.appendChild(lookaheadClone);
          const heightWithPair = measurePageContentHeight(activePageRoot);
          target.removeChild(lookaheadClone);

          if (hadContentBefore && heightWithPair > maxContentHeightPx) {
            target.removeChild(headingClone);
            startNewPage();
            const freshTarget = getCurrentInsertTarget();
            const cleanHeading = child.cloneNode(true) as HTMLElement;
            cleanHeading.style.marginTop = '0px';
            freshTarget.appendChild(cleanHeading);
          }
          continue;
        }

        const childChildren = getVisibleChildren(child);
        const isKeepTogether = child.classList.contains('cv-keep-together');
        const isLeafAtomic =
          child.matches(LEAF_ATOMIC_SELECTOR) ||
          childChildren.length === 0 ||
          isHorizontalLayout(child);

        // 2. Try placing atomic/keep-together unit whole onto activePageRoot
        if (isKeepTogether || isLeafAtomic) {
          const hadContentBefore = hasPlacedPageContent(activePageRoot);
          const childClone = child.cloneNode(true) as HTMLElement;
          const target = getCurrentInsertTarget();

          target.appendChild(childClone);
          const heightAfter = measurePageContentHeight(activePageRoot);

          if (heightAfter <= maxContentHeightPx) {
            // Fits comfortably on current page
            continue;
          }

          // Did not fit on current page: remove tentative clone first
          target.removeChild(childClone);

          const soloHeight = measureSoloElementHeight(host, cleanRootClassName, child);

          // Move intact to a fresh page if it fits cleanly within a page (or <= 82% for compound .cv-keep-together)
          const canMoveWhole =
            hadContentBefore &&
            (isLeafAtomic
              ? soloHeight <= maxContentHeightPx
              : soloHeight <= maxMoveWholeKeepTogetherPx);

          if (canMoveWhole || childChildren.length === 0) {
            if (hadContentBefore) {
              startNewPage();
              const freshTarget = getCurrentInsertTarget();
              const movedClone = child.cloneNode(true) as HTMLElement;
              movedClone.style.marginTop = '0px';
              freshTarget.appendChild(movedClone);
              continue;
            }
            if (childChildren.length === 0) {
              // Single indivisible leaf already on an empty page — keep on page
              target.appendChild(childClone);
              continue;
            }
          }
          // Otherwise, fall through to split across its internal child items cleanly
        }

        // 3. Container element (or oversized compound block): open wrapper & pack its children recursively
        const openTarget = getCurrentInsertTarget();
        const wrapperClone = child.cloneNode(false) as HTMLElement;
        openTarget.appendChild(wrapperClone);
        sourceWrapperStack.push(child);
        liveWrapperStack.push(wrapperClone);

        packChildren(child);

        sourceWrapperStack.pop();
        const finishedWrapper = liveWrapperStack.pop();
        // Prune empty shell wrapper if all its children moved to subsequent page(s)
        if (finishedWrapper && finishedWrapper.children.length === 0 && finishedWrapper.parentElement) {
          finishedWrapper.parentElement.removeChild(finishedWrapper);
        }
      }
    };

    packChildren(stagedSource);

    // Filter out any completely empty trailing page and detach finished page nodes from measurement host
    const finalPages: HTMLElement[] = [];
    for (const p of pages) {
      const hasContent =
        (p.textContent || '').trim().length > 0 || p.querySelectorAll('img, svg, canvas').length > 0;
      if (p.parentElement === host) {
        host.removeChild(p);
      }
      if (hasContent) {
        finalPages.push(p);
      }
    }

    if (finalPages.length === 0) {
      const fallbackRoot = createBlankPageRoot();
      while (stagedSource.firstChild) {
        fallbackRoot.appendChild(stagedSource.firstChild);
      }
      finalPages.push(fallbackRoot);
    }

    if (stagedSource.parentElement === host) {
      host.removeChild(stagedSource);
    }

    return {
      pages: finalPages,
      innerWidthPx,
      innerPageHeightPx,
    };
  } finally {
    if (document.body.contains(host)) {
      document.body.removeChild(host);
    }
  }
}
