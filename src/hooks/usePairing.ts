import { useState, useEffect, useCallback } from 'react'
import type { PairingStatus, StartPairingResult } from '../../shared/types'

type PairingState = {
  status: 'idle' | 'waiting' | 'pairing' | 'success' | 'error'
  qrDataUrl: string | null
  androidIp: string | null
  error: string | null
}

const INITIAL: PairingState = {
  status: 'idle',
  qrDataUrl: null,
  androidIp: null,
  error: null,
}

export function usePairing() {
  const [state, setState] = useState<PairingState>(INITIAL)

  useEffect(() => {
    if (!window.electronAPI) return
    const unsub = window.electronAPI.pairing.onStatus((status: PairingStatus) => {
      setState(prev => ({
        ...prev,
        status: status.status,
        androidIp: status.androidIp ?? prev.androidIp,
        error: status.error ?? null,
      }))
    })
    return () => { unsub() }
  }, [])

  const startPairing = useCallback(async () => {
    if (!window.electronAPI) return
    setState({ status: 'waiting', qrDataUrl: null, androidIp: null, error: null })
    const result = await window.electronAPI.pairing.start()
    if (result.success && result.data) {
      setState(prev => ({ ...prev, qrDataUrl: result.data!.qrDataUrl }))
    } else {
      setState({ status: 'error', qrDataUrl: null, androidIp: null, error: result.error ?? 'Failed to start pairing' })
    }
  }, [])

  const cancelPairing = useCallback(async () => {
    if (!window.electronAPI) return
    await window.electronAPI.pairing.cancel()
    setState(INITIAL)
  }, [])

  return { ...state, startPairing, cancelPairing }
}
