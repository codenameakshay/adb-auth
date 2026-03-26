interface HeaderProps {
  title: string
  /** One line of context for this screen; keep specific so it doesn’t repeat the title. */
  subtitle: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="ui-page-header">
      <div className="min-w-0">
        <h1 className="ui-heading-page">{title}</h1>
        <p className="ui-subtitle">{subtitle}</p>
      </div>
    </header>
  )
}
