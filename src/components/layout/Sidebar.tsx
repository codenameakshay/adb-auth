import { NavLink } from 'react-router-dom'
import { Smartphone, QrCode, Settings, Wifi } from 'lucide-react'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Devices', icon: Smartphone },
  { to: '/pair', label: 'Pair Device', icon: QrCode },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="relative z-10 flex w-20 flex-shrink-0 flex-col overflow-hidden lg:w-64">
      <div className="glass-panel-strong flex h-full flex-col p-3 pt-10">
        <div className="mb-7 flex items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-green-300/30 bg-green-500/20">
            <Wifi className="h-4 w-4 text-green-300" />
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">ADB Auth</p>
            <p className="truncate text-xs text-[var(--text-muted)]">Wireless Device Manager</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'group relative flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-200',
                  isActive
                    ? 'border-blue-300/35 bg-blue-500/15 text-white shadow-[0_8px_18px_rgba(59,130,246,0.2)]'
                    : 'border-transparent text-[var(--text-muted)] hover:border-white/15 hover:bg-slate-800/45 hover:text-[var(--text-secondary)]'
                )
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden rounded-xl border border-white/10 bg-slate-900/45 px-3 py-2 text-xs text-[var(--text-faint)] lg:block">
          v1.0.0
        </div>
      </div>
    </aside>
  )
}
