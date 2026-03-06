import { cn } from '../../lib/utils'
import type { AdbDevice } from '../../../shared/types'

const STATUS_CONFIG = {
  device: { label: 'Connected', className: 'border-green-300/35 bg-green-500/15 text-green-300' },
  offline: { label: 'Offline', className: 'border-slate-300/20 bg-slate-700/35 text-slate-200' },
  unauthorized: { label: 'Unauthorized', className: 'border-yellow-300/35 bg-yellow-500/15 text-yellow-200' },
  connecting: { label: 'Connecting', className: 'border-blue-300/35 bg-blue-500/15 text-blue-200' },
}

interface DeviceStatusBadgeProps {
  status: AdbDevice['status']
}

export function DeviceStatusBadge({ status }: DeviceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline
  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  )
}
