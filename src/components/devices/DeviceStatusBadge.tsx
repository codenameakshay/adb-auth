import { cn } from '../../lib/utils'
import type { AdbDevice } from '../../../shared/types'

const STATUS_CONFIG = {
  device: { label: 'Connected', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  offline: { label: 'Offline', className: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30' },
  unauthorized: { label: 'Unauthorized', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  connecting: { label: 'Connecting...', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
}

interface DeviceStatusBadgeProps {
  status: AdbDevice['status']
}

export function DeviceStatusBadge({ status }: DeviceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', config.className)}>
      {config.label}
    </span>
  )
}
