import { useState, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { Smartphone, QrCode, Settings, Wifi, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { isSidebarCollapsed, setSidebarCollapsed } from '../../lib/sidebarStorage'

const NAV_ITEMS = [
  { to: '/', label: 'Devices', icon: Smartphone },
  { to: '/pair', label: 'Pair', icon: QrCode },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => isSidebarCollapsed())

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      setSidebarCollapsed(next)
      return next
    })
  }, [])

  return (
    <aside
      className={cn(
        'relative z-10 flex flex-shrink-0 flex-col overflow-hidden select-none',
        'w-[4.5rem] transition-[width] duration-200 [transition-timing-function:var(--ease-out-quart)]',
        !collapsed && 'sm:w-60'
      )}
    >
      <div className="glass-panel-strong flex h-full flex-col p-2.5 pt-10 sm:p-3">
        <div
          className={cn(
            'ui-sidebar-brand',
            collapsed && 'justify-center sm:justify-center sm:gap-0 sm:px-2'
          )}
        >
          <div className="ui-icon-tile ui-icon-tile--sm ui-icon-tile--success shrink-0">
            <Wifi className="h-4 w-4" aria-hidden />
          </div>
          <div className={cn('hidden min-w-0 sm:block', collapsed && 'sm:hidden')}>
            <p className="truncate text-sm font-semibold text-app-text-primary">ADB Auth</p>
            <p className="truncate text-xs text-app-text-muted">Wi‑Fi pairing &amp; devices</p>
          </div>
        </div>

        <nav className="mt-1 flex flex-1 flex-col gap-1 sm:mt-1.5 sm:gap-1.5" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={label}
              className={({ isActive }) =>
                cn(
                  'ui-nav-link',
                  collapsed ? 'justify-center' : 'justify-center sm:justify-start',
                  isActive ? 'ui-nav-link-active' : 'text-app-text-muted'
                )
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
              <span className={cn('truncate', collapsed ? 'hidden' : 'hidden sm:inline')}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden shrink-0 flex-col gap-1.5 pt-2 sm:flex">
          <button
            type="button"
            onClick={toggle}
            className="ui-nav-link justify-center text-app-text-muted hover:text-app-text-secondary"
            title={
              collapsed
                ? 'Expand sidebar — ADB Auth v1.0.0'
                : 'Collapse sidebar to icon-only (saves horizontal space)'
            }
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <ChevronsLeft className="h-4 w-4 shrink-0" aria-hidden />
            )}
          </button>
          <div className={cn('ui-sidebar-foot', collapsed && 'hidden')}>v1.0.0</div>
        </div>
      </div>
    </aside>
  )
}
