import { createContext, useContext, type ReactNode } from 'react'
import { useDevices } from '../hooks/useDevices'

type DevicesContextValue = ReturnType<typeof useDevices>

const DevicesContext = createContext<DevicesContextValue | null>(null)

export function DevicesProvider({
  refreshInterval,
  children,
}: {
  refreshInterval: number
  children: ReactNode
}) {
  const value = useDevices(refreshInterval)
  return <DevicesContext.Provider value={value}>{children}</DevicesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with DevicesProvider
export function useDevicesContext(): DevicesContextValue {
  const ctx = useContext(DevicesContext)
  if (!ctx) {
    throw new Error('useDevicesContext must be used within DevicesProvider')
  }
  return ctx
}
