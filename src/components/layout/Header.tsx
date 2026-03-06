import { NetworkBadge } from '../wifi/NetworkBadge'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="border-b border-white/10 bg-slate-950/45 px-6 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
          <p className="text-xs text-[var(--text-muted)]">Manage Android wireless debugging securely.</p>
        </div>
        <NetworkBadge />
      </div>
    </header>
  )
}
