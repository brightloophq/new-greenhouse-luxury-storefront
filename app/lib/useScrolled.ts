import {useEffect, useState} from 'react';

/**
 * Returns true once the window has scrolled past `threshold` pixels.
 * SSR-safe: renders the "top" (false) state on the server, updates after hydration.
 * Used to switch the sticky header from translucent to solid.
 */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}
