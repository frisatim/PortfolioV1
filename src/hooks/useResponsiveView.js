import { useState, useEffect, useRef } from 'react';

/**
 * Returns 'globe' or 'map' based on viewport width.
 * Debounced to avoid thrashing on resize / tablet rotation.
 * SSR-safe: defaults to 'globe' when window is unavailable.
 */
export default function useResponsiveView(breakpoint = 768) {
  const [view, setView] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < breakpoint
      ? 'map'
      : 'globe'
  );
  const timerRef = useRef(null);

  useEffect(() => {
    const check = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setView(window.innerWidth < breakpoint ? 'map' : 'globe');
      }, 150); // 150ms debounce — fast enough for UX, avoids layout thrash
    };

    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('resize', check);
      clearTimeout(timerRef.current);
    };
  }, [breakpoint]);

  return view;
}
