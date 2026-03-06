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
    <aside className="w-16 lg:w-56 bg-neutral-900 border-r border-neutral-800 flex flex-col pt-8 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 mb-8 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
          <Wifi className="w-4 h-4 text-black" />
        </div>
        <span className="hidden lg:block font-semibold text-white text-sm truncate">ADB Auth</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-2 flex-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-neutral-800 text-white font-medium'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              )
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden lg:block">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Version */}
      <div className="hidden lg:block px-4 py-4 text-xs text-neutral-600">
        v1.0.0
      </div>
    </aside>
  )
}
