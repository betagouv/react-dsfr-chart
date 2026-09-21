import { useEffect, useRef, useState } from 'react';

export interface Size {
  width: number;
  height: number;
}

/**
 * Measures the element in pixels and keeps the measurement up to date.
 *
 * The chart is drawn at its measured size, not scaled through a `viewBox`, so
 * that the text keeps the size the DSFR gives it. The width is `0` until the
 * component mounts, which makes the first render safe on a server.
 */
export function useSize<T extends HTMLElement>(aspectRatio: number): { ref: React.RefObject<T | null>; width: number; height: number } {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => setWidth(element.getBoundingClientRect().width || element.offsetWidth || 0);
    measure();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width, height: aspectRatio > 0 ? width / aspectRatio : 0 };
}
