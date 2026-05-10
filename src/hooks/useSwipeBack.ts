import { useEffect, useRef, useCallback, useState } from 'react';

const SWIPE_THRESHOLD = 80;
const EDGE_THRESHOLD = 20;

export function useSwipeBack(onSwipeBack: () => void, enabled: boolean = true) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const translateXRef = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    if (touch.clientX <= EDGE_THRESHOLD) {
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      translateXRef.current = 0;
      setIsSwiping(true);
      setSwipeProgress(0);
    }
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || touchStartX.current === null || touchStartY.current === null) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    
    if (deltaX > 0 && Math.abs(deltaY) < Math.abs(deltaX)) {
      e.preventDefault();
      
      const progress = Math.min(deltaX / SWIPE_THRESHOLD, 1);
      translateXRef.current = deltaX;
      setSwipeProgress(progress);
      
      if (overlayRef.current) {
        overlayRef.current.style.opacity = `${0.1 + progress * 0.4}`;
      }
      
      if (indicatorRef.current) {
        indicatorRef.current.style.transform = `translateX(${deltaX - 40}px) scale(${0.5 + progress * 0.5})`;
        indicatorRef.current.style.opacity = `${0.3 + progress * 0.7}`;
      }
    } else {
      touchStartX.current = null;
      touchStartY.current = null;
      setIsSwiping(false);
      setSwipeProgress(0);
      translateXRef.current = 0;
      
      if (overlayRef.current) {
        overlayRef.current.style.opacity = '0';
      }
      if (indicatorRef.current) {
        indicatorRef.current.style.opacity = '0';
      }
    }
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '0';
      overlayRef.current.style.transition = 'opacity 0.2s ease-out';
    }
    if (indicatorRef.current) {
      indicatorRef.current.style.opacity = '0';
      indicatorRef.current.style.transform = 'translateX(-40px) scale(0.5)';
      indicatorRef.current.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
    }
    
    if (translateXRef.current >= SWIPE_THRESHOLD) {
      onSwipeBack();
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
    setIsSwiping(false);
    setSwipeProgress(0);
    translateXRef.current = 0;
  }, [enabled, onSwipeBack]);

  useEffect(() => {
    if (!enabled) return;
    
    const element = document.documentElement;
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    overlayRef,
    indicatorRef,
    isSwiping,
    swipeProgress,
  };
}
