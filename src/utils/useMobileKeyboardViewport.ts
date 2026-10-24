import { useState, useEffect, useCallback, useRef } from 'react';

export interface MobileKeyboardViewportState {
  viewportHeight: number | null;
  offsetTop: number;
  isKeyboardOpen: boolean;
  isMobileViewport: boolean;
  isInputFocused: boolean;
  setIsInputFocused: (focused: boolean) => void;
  scrollElementIntoView: (el: HTMLElement | null) => void;
}

/**
 * Tracks mobile virtual keyboard geometry via VisualViewport API so password/passcode
 * inputs and submit buttons dynamically reposition into the visible area above the
 * on-screen keyboard on iOS Safari, Android Chrome, and mobile webviews.
 */
export function useMobileKeyboardViewport(active = true): MobileKeyboardViewportState {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [offsetTop, setOffsetTop] = useState<number>(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const maxHeightRef = useRef<number>(typeof window !== 'undefined' ? window.innerHeight : 800);

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    maxHeightRef.current = Math.max(
      window.innerHeight,
      window.visualViewport?.height || window.innerHeight
    );

    const updateViewport = () => {
      const vv = window.visualViewport;
      const currentInnerWidth = window.innerWidth;
      const mobile = currentInnerWidth < 768;
      setIsMobileViewport(mobile);

      const rawHeight = vv ? vv.height : window.innerHeight;
      const rawOffsetTop = vv ? vv.offsetTop : 0;

      if (rawHeight > maxHeightRef.current && !isInputFocused) {
        maxHeightRef.current = rawHeight;
      }

      const baselineHeight = Math.max(window.innerHeight, maxHeightRef.current);
      const heightDelta = baselineHeight - rawHeight;
      const keyboardDetected = mobile && (heightDelta > 110 || rawHeight < baselineHeight * 0.82);

      setViewportHeight(Math.round(rawHeight));
      setOffsetTop(Math.max(0, Math.round(rawOffsetTop)));
      setIsKeyboardOpen(keyboardDetected);
    };

    updateViewport();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateViewport);
      vv.addEventListener('scroll', updateViewport);
    }
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', updateViewport);
        vv.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, [active, isInputFocused]);

  const scrollElementIntoView = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const performScroll = () => {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        el.scrollIntoView();
      }
    };
    requestAnimationFrame(performScroll);
    window.setTimeout(performScroll, 140);
    window.setTimeout(performScroll, 320);
  }, []);

  return {
    viewportHeight,
    offsetTop,
    isKeyboardOpen,
    isMobileViewport,
    isInputFocused,
    setIsInputFocused,
    scrollElementIntoView,
  };
}
