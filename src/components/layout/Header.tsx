import { NetworkBadge } from '../wifi/NetworkBadge'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="border-b border-white/10 bg-slate-950/45 px-5 py-4 md:px-7 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">Manage Android wireless debugging securely.</p>
        </div>
        <NetworkBadge />
      </div>
    </header>
  )
}
