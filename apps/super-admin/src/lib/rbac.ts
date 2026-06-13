import {
  BarChart3,
  Building2,
  FileClock,
  LifeBuoy,
  LayoutDashboard,
  Settings,
  Shield,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

export const adminRoles = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN'] as const

export type AdminRole = (typeof adminRoles)[number]

export type Permission =
  | 'dashboard:view'
  | 'admins:view'
  | 'admins:manage'
  | 'tenants:view'
  | 'tenants:manage'
  | 'users:view'
  | 'users:manage'
  | 'rbac:view'
  | 'rbac:manage'
  | 'support:view'
  | 'support:manage'
  | 'finance:view'
  | 'audit:view'
  | 'settings:view'

export type RouteKey =
  | 'dashboard'
  | 'tenants'
  | 'users'
  | 'access-control'
  | 'admin-accounts'
  | 'support-console'
  | 'finance'
  | 'audit'
  | 'settings'

export type NavigationItem = {
  key: RouteKey
  title: string
  description: string
  path: string
  icon: LucideIcon
  requiredPermission: Permission
}

export const roleLabels: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Süper Admin',
  PLATFORM_ADMIN: 'Platform Yöneticisi',
  SUPPORT_AGENT: 'Destek Uzmanı',
  FINANCE_ADMIN: 'Finans Yöneticisi',
}

export const roleDescriptions: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Platform genelinde tüm yönetim ve güvenlik ayarlarına erişir.',
  PLATFORM_ADMIN: 'Operasyon panelini yönetir, admin hesaplarını görüntüler.',
  SUPPORT_AGENT: 'Destek ve denetim ekranlarına sınırlı erişim alır.',
  FINANCE_ADMIN: 'Finans alanlarına erişir, platform yönetimini değiştiremez.',
}

export const rolePermissions: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: [
    'dashboard:view',
    'admins:view',
    'admins:manage',
    'tenants:view',
    'tenants:manage',
    'users:view',
    'users:manage',
    'rbac:view',
    'rbac:manage',
    'support:view',
    'support:manage',
    'finance:view',
    'audit:view',
    'settings:view',
  ],
  PLATFORM_ADMIN: [
    'dashboard:view',
    'admins:view',
    'tenants:view',
    'tenants:manage',
    'users:view',
    'users:manage',
    'rbac:view',
    'support:view',
    'support:manage',
    'audit:view',
    'settings:view',
  ],
  SUPPORT_AGENT: ['dashboard:view', 'tenants:view', 'users:view', 'support:view', 'support:manage', 'audit:view'],
  FINANCE_ADMIN: ['dashboard:view', 'tenants:view', 'finance:view', 'audit:view'],
}

export const navigationItems: NavigationItem[] = [
  {
    key: 'dashboard',
    title: 'Genel Bakış',
    description: 'Yönetim paneli özeti',
    path: '/dashboard',
    icon: LayoutDashboard,
    requiredPermission: 'dashboard:view',
  },
  {
    key: 'tenants',
    title: 'Galeriler',
    description: 'Galeri yaşam döngüsü',
    path: '/tenants',
    icon: Building2,
    requiredPermission: 'tenants:view',
  },
  {
    key: 'users',
    title: 'Kullanıcılar',
    description: 'Kullanıcı yönetimi',
    path: '/users',
    icon: UserRound,
    requiredPermission: 'users:view',
  },
  {
    key: 'access-control',
    title: 'Erişim Kontrolü',
    description: 'Rol ve izin matrisi',
    path: '/access-control',
    icon: Shield,
    requiredPermission: 'rbac:view',
  },
  {
    key: 'admin-accounts',
    title: 'Admin Hesapları',
    description: 'Yönetici kimlikleri',
    path: '/admin-accounts',
    icon: Users,
    requiredPermission: 'admins:view',
  },
  {
    key: 'support-console',
    title: 'Operasyon Merkezi',
    description: 'Destek, moderasyon ve duyurular',
    path: '/support-console',
    icon: LifeBuoy,
    requiredPermission: 'support:view',
  },
  {
    key: 'finance',
    title: 'Finans',
    description: 'Finans modülü',
    path: '/finance',
    icon: BarChart3,
    requiredPermission: 'finance:view',
  },
  {
    key: 'audit',
    title: 'Denetim Kayıtları',
    description: 'Denetim kaydı modülü',
    path: '/audit',
    icon: FileClock,
    requiredPermission: 'audit:view',
  },
  {
    key: 'settings',
    title: 'Ayarlar',
    description: 'Platform ayarları',
    path: '/settings',
    icon: Settings,
    requiredPermission: 'settings:view',
  },
]

export function hasPermission(role: AdminRole, permission: Permission) {
  return rolePermissions[role].includes(permission)
}

export function getAllowedNavigation(role: AdminRole) {
  return navigationItems.filter((item) => hasPermission(role, item.requiredPermission))
}
