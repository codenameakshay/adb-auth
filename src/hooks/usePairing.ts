import { useState, useEffect, useCallback } from 'react'
import type { PairingStatus, StartPairingResult } from '../../shared/types'

type PairingState = {
  status: 'idle' | 'waiting' | 'pairing' | 'connecting' | 'success' | 'error'
  stage?: PairingStatus['stage']
  detail: string | null
  qrDataUrl: string | null
  androidIp: string | null
  error: string | null
}

const INITIAL: PairingState = {
  status: 'idle',
  stage: undefined,
  detail: null,
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
        stage: status.stage,
        detail: status.detail ?? prev.detail,
        androidIp: status.androidIp ?? prev.androidIp,
        error: status.error ?? null,
      }))
    })
    return () => { unsub() }
  }, [])

  const startPairing = useCallback(async () => {
    if (!window.electronAPI) return
    setState({
      status: 'waiting',
      stage: 'waiting_for_scan',
      detail: 'Preparing QR pairing...',
      qrDataUrl: null,
      androidIp: null,
      error: null,
    })
    const result = await window.electronAPI.pairing.start()
    if (result.success && result.data) {
      setState(prev => ({ ...prev, qrDataUrl: result.data!.qrDataUrl }))
    } else {
      setState({
        status: 'error',
        stage: 'error',
        detail: null,
        qrDataUrl: null,
        androidIp: null,
        error: result.error ?? 'Failed to start pairing',
      })
    }
  }, [])

  const cancelPairing = useCallback(async () => {
    if (!window.electronAPI) return
    await window.electronAPI.pairing.cancel()
    setState(INITIAL)
  }, [])

  return { ...state, startPairing, cancelPairing }
}
