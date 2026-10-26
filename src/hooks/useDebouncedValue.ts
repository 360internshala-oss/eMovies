import { useEffect, useState } from 'react'

/** Debounced copy of a value (used for search input). */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
