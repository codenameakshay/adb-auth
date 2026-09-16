import { useEffect, useRef } from 'react'

/** Polls `callback` every `intervalMs`, but only while the tab is visible; catches up once on return. */
export function usePolling(callback: () => void, intervalMs: number): void {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') callbackRef.current()
    }, intervalMs)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') callbackRef.current()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs])
}
