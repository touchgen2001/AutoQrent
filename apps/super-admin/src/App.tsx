import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import type { LazyExoticComponent, ReactElement } from 'react'

import { ProtectedShell } from '@/components/auth/protected-shell'
import { SuperAdminLayout } from '@/components/layout/super-admin-layout'
import { AuthProvider, useAuth } from '@/lib/auth'
import { hasPermission, navigationItems, type Permission } from '@/lib/rbac'
import { ForbiddenPage } from '@/pages/forbidden-page'
import { LoginPage } from '@/pages/login-page'
import { UnauthorizedPage } from '@/pages/unauthorized-page'

type PageComponent = LazyExoticComponent<() => ReactElement>
type PageLoader = () => Promise<{ default: () => ReactElement }>

const loadDashboardPage: PageLoader = () => import('@/pages/dashboard-page').then(({ DashboardPage }) => ({ default: DashboardPage }))
const loadTenantManagementPage: PageLoader = () =>
  import('@/pages/tenant-management-page').then(({ TenantManagementPage }) => ({ default: TenantManagementPage }))
const loadUserManagementPage: PageLoader = () =>
  import('@/pages/user-management-page').then(({ UserManagementPage }) => ({ default: UserManagementPage }))
const loadAccessControlPage: PageLoader = () =>
  import('@/pages/access-control-page').then(({ AccessControlPage }) => ({ default: AccessControlPage }))
const loadAdminAccountsPage: PageLoader = () =>
  import('@/pages/admin-accounts-page').then(({ AdminAccountsPage }) => ({ default: AdminAccountsPage }))
const loadSupportOperationsPage: PageLoader = () =>
  import('@/pages/support-operations-page').then(({ SupportOperationsPage }) => ({ default: SupportOperationsPage }))
const loadFinancePage: PageLoader = () => import('@/pages/finance-page').then(({ FinancePage }) => ({ default: FinancePage }))
const loadAuditLogPage: PageLoader = () => import('@/pages/audit-log-page').then(({ AuditLogPage }) => ({ default: AuditLogPage }))
const loadSettingsPage: PageLoader = () => import('@/pages/settings-page').then(({ SettingsPage }) => ({ default: SettingsPage }))

const DashboardPage = lazy(loadDashboardPage)
const TenantManagementPage = lazy(loadTenantManagementPage)
const UserManagementPage = lazy(loadUserManagementPage)
const AccessControlPage = lazy(loadAccessControlPage)
const AdminAccountsPage = lazy(loadAdminAccountsPage)
const SupportOperationsPage = lazy(loadSupportOperationsPage)
const FinancePage = lazy(loadFinancePage)
const AuditLogPage = lazy(loadAuditLogPage)
const SettingsPage = lazy(loadSettingsPage)

type RouteDefinition = {
  path: string
  title: string
  description: string
  permission: Permission
  Component: PageComponent
  preload: PageLoader
}

const protectedRoutes: RouteDefinition[] = [
  {
    path: '/dashboard',
    title: 'Platform Yönetim Ekranı',
    description: 'Galeri, QR, müşteri talebi, gelir ve sistem sağlığı için komuta merkezi.',
    permission: 'dashboard:view',
    Component: DashboardPage,
    preload: loadDashboardPage,
  },
  {
    path: '/tenants',
    title: 'Galeri Yönetimi',
    description: 'Galeri hesabı yaşam döngüsü, paket durumu ve hesaba geçiş önizlemesi.',
    permission: 'tenants:view',
    Component: TenantManagementPage,
    preload: loadTenantManagementPage,
  },
  {
    path: '/users',
    title: 'Kullanıcı Yönetimi',
    description: 'Galeri kullanıcıları, kimlik doğrulama durumu ve erişim işlemleri.',
    permission: 'users:view',
    Component: UserManagementPage,
    preload: loadUserManagementPage,
  },
  {
    path: '/access-control',
    title: 'Erişim Kontrolü',
    description: 'Rol ve izin matrisi.',
    permission: 'rbac:view',
    Component: AccessControlPage,
    preload: loadAccessControlPage,
  },
  {
    path: '/admin-accounts',
    title: 'Admin Hesapları',
    description: 'Çalışma zamanı admin kimliği, rol kapsamı, oturum güvenliği ve admin denetim olayları.',
    permission: 'admins:view',
    Component: AdminAccountsPage,
    preload: loadAdminAccountsPage,
  },
  {
    path: '/support-console',
    title: 'Operasyon Merkezi',
    description: 'Destek talepleri, moderasyon raporları ve galeri duyuru operasyonları.',
    permission: 'support:view',
    Component: SupportOperationsPage,
    preload: loadSupportOperationsPage,
  },
  {
    path: '/finance',
    title: 'Finans',
    description: 'Abonelik, aylık gelir ve ödeme riski için canlı finans komuta merkezi.',
    permission: 'finance:view',
    Component: FinancePage,
    preload: loadFinancePage,
  },
  {
    path: '/audit',
    title: 'Denetim Kayıtları',
    description: 'Canlı denetim kayıtları, güvenlik olayları ve admin işlem geçmişi.',
    permission: 'audit:view',
    Component: AuditLogPage,
    preload: loadAuditLogPage,
  },
  {
    path: '/settings',
    title: 'Ayarlar',
    description: 'Çalışma zamanı ortamı, güvenlik kilitleri ve operasyon ayarları.',
    permission: 'settings:view',
    Component: SettingsPage,
    preload: loadSettingsPage,
  },
]

const routePreloadCache = new Set<string>()

function normalizePath(pathname: string) {
  if (pathname === '/') return '/dashboard'
  return pathname.replace(/\/$/, '') || '/dashboard'
}

function useBrowserNavigation() {
  const [path, setPath] = useState(() => normalizePath(window.location.hash.replace(/^#/, '') || '/dashboard'))

  useEffect(() => {
    const handleHashChange = () => setPath(normalizePath(window.location.hash.replace(/^#/, '') || '/dashboard'))
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function navigate(nextPath: string) {
    const normalized = normalizePath(nextPath)
    window.location.hash = normalized
    setPath(normalized)
  }

  return {
    path,
    navigate,
  }
}

function RouteLoadingState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/70 p-8 shadow-sm">
      <p className="text-sm font-semibold text-muted-foreground">Modül yükleniyor</p>
      <div className="mt-4 h-2 w-40 overflow-hidden rounded-full bg-black/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-black" />
      </div>
    </div>
  )
}

function preloadRoute(path: string) {
  const route = protectedRoutes.find((item) => item.path === normalizePath(path))
  if (!route || routePreloadCache.has(route.path)) return

  routePreloadCache.add(route.path)
  void route.preload().catch(() => {
    routePreloadCache.delete(route.path)
  })
}

function AppRoutes() {
  const { path, navigate } = useBrowserNavigation()
  const { session, isLoading } = useAuth()
  const route = useMemo(() => protectedRoutes.find((item) => item.path === path) || protectedRoutes[0], [path])
  const RouteComponent = route.Component

  if (isLoading) {
    return <RouteLoadingState />
  }

  if (path === '/login') {
    return <LoginPage onNavigate={navigate} />
  }

  if (path === '/unauthorized') {
    return <UnauthorizedPage onNavigate={navigate} />
  }

  if (path === '/forbidden') {
    return <ForbiddenPage onNavigate={navigate} requiredPermission={route.permission} />
  }

  if (!session) {
    return <UnauthorizedPage onNavigate={navigate} />
  }

  if (!hasPermission(session.user.role, route.permission)) {
    return <ForbiddenPage onNavigate={navigate} requiredPermission={route.permission} />
  }

  return (
    <ProtectedShell>
      <SuperAdminLayout
        currentPath={route.path}
        title={route.title}
        description={route.description}
        navigationItems={navigationItems}
        onNavigate={navigate}
        onNavigateIntent={preloadRoute}
      >
        <Suspense fallback={<RouteLoadingState />}>
          <RouteComponent />
        </Suspense>
      </SuperAdminLayout>
    </ProtectedShell>
  )
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
