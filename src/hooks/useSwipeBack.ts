import { useEffect, useRef, useCallback, useState } from 'react';

const SWIPE_THRESHOLD = 80;
const EDGE_THRESHOLD = 30;

export function useSwipeBack(onSwipeBack: () => void, enabled: boolean = true) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const maxSwipeDistance = useRef(0);
  const isSwipingRef = useRef(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    if (touch.clientX <= EDGE_THRESHOLD) {
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      maxSwipeDistance.current = 0;
      isSwipingRef.current = true;
      setIsSwiping(true);
    }
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isSwipingRef.current || touchStartX.current === null || touchStartY.current === null) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    
    if (Math.abs(deltaY) > Math.abs(deltaX) * 2) {
      isSwipingRef.current = false;
      setIsSwiping(false);
      return;
    }
    
    if (deltaX > 0) {
      e.preventDefault();
      
      maxSwipeDistance.current = Math.max(maxSwipeDistance.current, deltaX);
      
      const progress = Math.min(maxSwipeDistance.current / SWIPE_THRESHOLD, 1);
      
      if (overlayRef.current) {
        overlayRef.current.style.opacity = `${0.1 + progress * 0.4}`;
      }
      
      if (indicatorRef.current) {
        indicatorRef.current.style.transform = `translateX(${Math.min(deltaX, SWIPE_THRESHOLD) - 40}px) scale(${0.5 + progress * 0.5})`;
        indicatorRef.current.style.opacity = `${0.3 + progress * 0.7}`;
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
    
    if (maxSwipeDistance.current >= SWIPE_THRESHOLD) {
      onSwipeBack();
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
    maxSwipeDistance.current = 0;
    isSwipingRef.current = false;
    setIsSwiping(false);
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
  };
}
