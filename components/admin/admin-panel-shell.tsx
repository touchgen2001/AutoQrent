'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Send,
  UserCog,
  Users,
} from 'lucide-react'

import { BrandLogo, BrandMark } from '@/components/brand/brand-logo'
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
import { clearAdminAuthSession } from '@/lib/client/admin-auth'
import { cn } from '@/lib/utils'

type AdminPanelShellProps = {
  children: React.ReactNode
  username: string
  searchValue?: string
  summary?: {
    authUsers: number
    totalGalleries: number
    totalVehicles: number
    totalLeads: number
  } | null
}

const navItems = [
  {
    title: 'Yönetim',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Kullanıcılar',
    href: '/admin/kullanicilar',
    icon: Users,
  },
  {
    title: 'Yetkilendirme',
    href: '/admin/yetkilendirme',
    icon: UserCog,
  },
  {
    title: 'Abonelikler',
    href: '/admin/abonelikler',
    icon: CreditCard,
  },
  {
    title: 'Bildirimler',
    href: '/admin/bildirimler',
    icon: Send,
  },
]

export function AdminPanelShell({
  children,
  username,
  searchValue = '',
  summary,
}: AdminPanelShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const initials = username
    .split(' ')
    .map((part) => part.trim()[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AD'

  async function handleLogout() {
    await clearAdminAuthSession()
    setIsMobileOpen(false)
    router.replace('/admin/giris')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Admin menüyü kapat"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300',
          isCollapsed ? 'w-[70px]' : 'w-[260px]',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          <div
            className={cn(
              'flex h-16 items-center border-b border-sidebar-border px-4',
              isCollapsed ? 'justify-center' : 'justify-between',
            )}
          >
            <BrandLogo href="/admin" tone="sidebar" className={cn('[&_span:first-child]:size-9', isCollapsed && 'hidden')} />
            {isCollapsed ? (
              <BrandMark tone="sidebar" className="[&_span]:size-9" />
            ) : null}
            <button
              type="button"
              onClick={() => setIsCollapsed((value) => !value)}
              className={cn(
                'hidden h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent lg:flex',
                isCollapsed && 'absolute -right-3 top-6 border border-sidebar-border bg-sidebar',
              )}
              aria-label={isCollapsed ? 'Admin menüyü genişlet' : 'Admin menüyü daralt'}
            >
              <ChevronLeft className={cn('h-4 w-4 text-sidebar-muted transition-transform', isCollapsed && 'rotate-180')} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
              return (
                <Link
                  key={`${item.title}-${item.href}`}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground font-semibold ring-1 ring-sidebar-border shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary [&_svg]:text-sidebar-primary'
                      : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    isCollapsed && 'justify-center px-0',
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0 transition-colors" />
                  {!isCollapsed ? <span className="text-sm">{item.title}</span> : null}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            {!isCollapsed ? (
              <div className="mb-3 rounded-lg bg-sidebar-accent p-3">
                <p className="mb-1 text-xs text-sidebar-muted">Canlı Yönetim Özeti</p>
                <p className="text-sm font-medium text-sidebar-foreground">
                  {summary ? `${summary.authUsers} kullanıcı · ${summary.totalGalleries} galeri` : 'Veri bekleniyor'}
                </p>
                {summary ? (
                  <p className="mt-1 text-xs text-sidebar-muted">
                    {summary.totalVehicles} araç · {summary.totalLeads} müşteri talebi
                  </p>
                ) : null}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sidebar-border">
                  <div className="h-full rounded-full bg-sidebar-primary" style={{ width: summary ? '100%' : '0%' }} />
                </div>
              </div>
            ) : null}
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
                isCollapsed && 'justify-center px-0',
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed ? <span className="ml-3 text-sm">Çıkış Yap</span> : null}
            </Button>
          </div>
        </div>
      </aside>

      <div className={cn('transition-all duration-300', isCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[260px]')}>
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background">
          <div className="flex h-full items-center justify-between px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Admin menü"
                onClick={() => setIsMobileOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <form action="/admin/kullanicilar" className="relative hidden items-center sm:flex">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  name="q"
                  defaultValue={searchValue}
                  placeholder="Kullanıcı, galeri veya telefon ara..."
                  className="h-9 w-64 border-0 bg-muted pl-9 lg:w-80"
                />
              </form>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild className="sm:hidden" aria-label="Admin arama">
                <Link href="/admin/kullanicilar#admin-users-search">
                  <Search className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
                <Link href="/" target="_blank">
                  Siteyi Aç
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                      {initials}
                    </div>
                    <div className="hidden text-left md:block">
                      <p className="text-sm font-medium">Admin</p>
                      <p className="text-xs text-muted-foreground">{username}</p>
                    </div>
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Admin Hesabı</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Yönetim paneli</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/kullanicilar">Kullanıcılar</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
