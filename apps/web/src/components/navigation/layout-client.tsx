'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '../theme-toggle'
import { NAV_ITEMS } from './nav-items'

function NavList({ onItemClick }: { onItemClick?: () => void }): React.JSX.Element {
  const pathname = usePathname()

  return (
    <ul className="flex flex-col gap-1 p-4" role="list">
      {NAV_ITEMS.map(({ href, label, icon: Icon, ariaLabel }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        const linkProps = onItemClick !== undefined ? { onClick: onItemClick } : {}
        return (
          <li key={href}>
            <Link
              href={href}
              aria-label={ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              {...linkProps}
              className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-[var(--transition-fast)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-[var(--color-border)]/40 hover:text-foreground'
              }`}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function MobileTabItem({
  href,
  label,
  icon: Icon,
  ariaLabel,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>
  ariaLabel: string
}): React.JSX.Element {
  const pathname = usePathname()
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={isActive ? 'page' : undefined}
      className={`flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors duration-[var(--transition-fast)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${
        isActive ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon size={20} aria-hidden />
      <span>{label}</span>
    </Link>
  )
}

/** Client layout shell — manages tablet drawer open/close state. */
export function LayoutClient({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = (): void => setDrawerOpen(false)
  const toggleDrawer = (): void => setDrawerOpen((prev) => !prev)

  return (
    <>
      {/* ── Sticky glassmorphism header ── */}
      <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-border backdrop-blur-md bg-background/70">
        <div className="flex h-full items-center gap-3 px-4">
          {/* Brand */}
          <Link
            href="/"
            className="shrink-0 text-base font-bold text-foreground transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
            aria-label="Autoridade Política — ir para o início"
          >
            Autoridade Política
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Hamburger — tablet only (sm to lg) */}
          <button
            type="button"
            onClick={toggleDrawer}
            aria-label={drawerOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={drawerOpen}
            aria-controls="tablet-nav-drawer"
            className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:flex lg:hidden"
          >
            {drawerOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>

          {/* Theme toggle — always visible */}
          <ThemeToggle />
        </div>
      </header>

      {/* ── Page layout ── */}
      <div className="flex min-h-screen pt-16">
        {/* Desktop sidebar — 1024px+ */}
        <aside
          aria-label="Navegação principal"
          className="fixed bottom-0 left-0 top-16 hidden w-[280px] flex-col overflow-y-auto border-r border-border bg-[var(--color-surface)] z-40 lg:flex"
        >
          <NavList />
        </aside>

        {/* Tablet drawer — 640–1024px */}
        <aside
          id="tablet-nav-drawer"
          aria-label="Menu de navegação"
          aria-hidden={!drawerOpen}
          className={`fixed bottom-0 left-0 top-16 z-40 flex w-[280px] flex-col overflow-y-auto border-r border-border bg-[var(--color-surface)] transition-transform duration-[var(--transition-slow)] ease-in-out lg:hidden ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <NavList onItemClick={closeDrawer} />
        </aside>

        {/* Drawer backdrop */}
        {drawerOpen && (
          <div
            role="button"
            tabIndex={-1}
            className="fixed inset-0 top-16 z-30 bg-black/40 lg:hidden"
            onClick={closeDrawer}
            onKeyDown={(e) => e.key === 'Escape' && closeDrawer()}
            aria-label="Fechar menu"
          />
        )}

        {/* Main content area */}
        <div className="min-w-0 flex-1 pb-20 sm:pb-0 lg:ml-[280px]">{children}</div>
      </div>

      {/* ── Mobile bottom tab bar — < 640px ── */}
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-border backdrop-blur-sm bg-[var(--color-surface)]/90 sm:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <MobileTabItem key={item.href} {...item} />
        ))}
      </nav>
    </>
  )
}
