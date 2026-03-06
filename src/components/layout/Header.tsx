import { NetworkBadge } from '../wifi/NetworkBadge'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-12 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-950 flex-shrink-0">
      <h1 className="text-sm font-semibold text-white">{title}</h1>
      <NetworkBadge />
    </header>
  )
}
