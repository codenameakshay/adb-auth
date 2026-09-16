import { useCallback, useEffect, useRef, useState } from 'react'

/** State that resets to null `ms` after being set; clears any pending timer on the way. */
export function useTransient<T>(ms: number): [T | null, (value: T) => void] {
  const [value, setValue] = useState<T | null>(null)
  const timerRef = useRef<number | null>(null)

  const show = useCallback(
    (next: T) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      setValue(next)
      timerRef.current = window.setTimeout(() => setValue(null), ms)
    },
    [ms]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  return [value, show]
}
