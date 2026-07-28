import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delay` milliseconds, so a burst of typing costs one
 * request instead of one per keystroke.
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
