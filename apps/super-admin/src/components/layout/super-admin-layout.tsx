import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, Menu, Search, ShieldCheck, X } from 'lucide-react'

import { SuperAdminLogo } from '@/components/brand/super-admin-logo'
import { NotificationBellPanel } from '@/components/operations/notification-bell-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { getAllowedNavigation, roleLabels, type NavigationItem } from '@/lib/rbac'

type SuperAdminLayoutProps = {
  children: ReactNode
  currentPath: string
  title: string
  description: string
  navigationItems: NavigationItem[]
  onNavigate: (path: string) => void
  onNavigateIntent?: (path: string) => void
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function SuperAdminLayout({
  children,
  currentPath,
  title,
  description,
  navigationItems,
  onNavigate,
  onNavigateIntent,
}: SuperAdminLayoutProps) {
  const { session, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = session!.user
  const allowedItems = useMemo(() => getAllowedNavigation(user.role), [user.role])
  const visibleKeys = new Set(allowedItems.map((item) => item.key))
  const sidebarItems = navigationItems.filter((item) => visibleKeys.has(item.key))

  function navigate(path: string) {
    setMobileOpen(false)
    onNavigate(path)
  }

  async function handleLogout() {
    await logout()
    onNavigate('/login')
  }

  const sidebar = (
    <aside className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <SuperAdminLogo tone="dark" subtitle="Süper Admin" onClick={() => navigate('/dashboard')} />
        <Button variant="ghost" size="icon" className="text-sidebar-foreground lg:hidden" onClick={() => setMobileOpen(false)}>
          <X />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.24em] text-sidebar-muted">Kontrol</div>
        <div className="flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const active = currentPath === item.path
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.path)}
                onFocus={() => onNavigateIntent?.(item.path)}
                onPointerEnter={() => onNavigateIntent?.(item.path)}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200',
                  active
                    ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary [&_svg]:text-sidebar-primary'
                    : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                <item.icon />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="block truncate text-xs opacity-70">{item.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sidebar-muted">
            <ShieldCheck />
            Rol yetkisi aktif
          </div>
          <p className="mt-3 text-sm font-semibold text-sidebar-foreground">{roleLabels[user.role]}</p>
          <p className="mt-1 text-xs leading-5 text-sidebar-muted">Sayfa erişimi tanımlı izinlerle sınırlandırılır.</p>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-background">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 lg:hidden"
          aria-label="Süper admin menüsünü kapat"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72">{sidebar}</div>

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transition-transform lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebar}
      </div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-background/92 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
                <Menu />
              </Button>
              <div className="hidden min-w-[280px] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-xs md:flex">
                <Search className="text-muted-foreground" />
                <Input
                  aria-label="Arama devre dışı"
                  disabled
                  placeholder="Aramayı Galeriler, Kullanıcılar ve Operasyon içinde kullanın"
                  className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden rounded-full px-3 py-1.5 md:inline-flex">
                {roleLabels[user.role]}
              </Badge>
              <NotificationBellPanel />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-11 gap-3 rounded-xl px-2">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                      {getInitials(user.name)}
                    </span>
                    <span className="hidden text-left sm:block">
                      <span className="block text-sm font-semibold">{user.name}</span>
                      <span className="block text-xs text-muted-foreground">{user.email}</span>
                    </span>
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>
                    <span className="block">Admin Profili</span>
                    <span className="block text-xs font-normal text-muted-foreground">{roleLabels[user.role]}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void handleLogout()}>Çıkış yap</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-6">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            <Badge variant="secondary" className="w-fit rounded-full px-3 py-1.5">
              Kurumsal Kontrol Merkezi
            </Badge>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
