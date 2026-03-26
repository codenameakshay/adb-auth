import { cn } from '../../lib/utils'
import type { AdbDevice } from '../../../shared/types'

const STATUS_CONFIG = {
  device: { label: 'Connected', variant: 'success' as const },
  offline: { label: 'Offline', variant: 'neutral' as const },
  unauthorized: { label: 'Unauthorized', variant: 'warning' as const },
  connecting: { label: 'Connecting', variant: 'accent-blue' as const },
}

interface DeviceStatusBadgeProps {
  status: AdbDevice['status']
}

export function DeviceStatusBadge({ status }: DeviceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline
  return (
    <span className={cn('ui-badge', `ui-badge--${config.variant}`)}>
      {config.label}
    </span>
  )
}
