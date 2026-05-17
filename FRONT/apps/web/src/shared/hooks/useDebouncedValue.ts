import { useEffect, useState } from 'react';

/**
 * Trails the input value by `delayMs` milliseconds. Used by Step 3 to throttle
 * /configurator/price calls while the user is still typing/dragging.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
