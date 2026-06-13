import Link from 'next/link'
import { AlertTriangle, Clock, ExternalLink, Mail, Phone, Search, Store } from 'lucide-react'

import {
  firstSearchParam,
  formatAdminDate,
  formatAdminLocation,
  getAdminPageData,
} from '@/app/admin/_lib/page-data'
import { AdminDeleteUserControl, type AdminActionUser } from '@/components/admin/admin-action-controls'
import { AdminLiveRefreshStatus } from '@/components/admin/admin-live-refresh-status'
import { AdminPanelShell } from '@/components/admin/admin-panel-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  adminAccessStatusLabels,
  adminAccountRoleLabels,
  adminSubscriptionPlanLabels,
  adminSubscriptionStatusLabels,
} from '@/lib/admin-user-types'
import type { AdminManagedUser } from '@/lib/server/admin-users-repository'

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function toActionUser(user: AdminManagedUser): AdminActionUser | null {
  if (!user.userId) return null
  return {
    userId: user.userId,
    email: user.email,
    fullName: user.fullName,
    galleryName: user.gallery?.name || null,
    role: user.authorization.role,
    accessStatus: user.authorization.accessStatus,
    subscriptionPlan: user.subscription.plan,
    subscriptionStatus: user.subscription.status,
  }
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const search = firstSearchParam(resolvedSearchParams.q)
  const { session, managedUsers, dataError, shellSummary } = await getAdminPageData({ search })

  return (
    <AdminPanelShell username={session.username} searchValue={search} summary={shellSummary}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kullanıcılar</h1>
            <p className="text-muted-foreground">
              Kayıtlı kimlik kullanıcıları, bağlı galerileri ve operasyon sayıları Supabase verisinden okunur.
            </p>
          </div>
          <AdminLiveRefreshStatus lastUpdatedAt={managedUsers?.generatedAt ?? null} />
        </div>

        <Card id="admin-users-search">
          <CardHeader className="pb-3">
            <CardTitle>Kullanıcı Arama</CardTitle>
            <CardDescription>E-posta, galeri, telefon, rol veya abonelik durumuna göre filtreleyin.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="relative w-full md:max-w-sm">
              <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={search}
                placeholder="E-posta, galeri, telefon ara"
                className="h-10 w-full rounded-md border border-input bg-muted px-3 py-2 pl-9 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </form>
          </CardContent>
        </Card>

        {managedUsers ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px] border-collapse text-left">
                <thead className="bg-sidebar text-sidebar-foreground">
                  <tr>
                    <th className="px-5 py-4 text-sm font-bold">Kullanıcı</th>
                    <th className="px-5 py-4 text-sm font-bold">Galeri</th>
                    <th className="px-5 py-4 text-sm font-bold">İletişim</th>
                    <th className="px-5 py-4 text-sm font-bold">Durum</th>
                    <th className="px-5 py-4 text-sm font-bold">Araç / Müşteri Talebi</th>
                    <th className="px-5 py-4 text-sm font-bold">Tarih</th>
                    <th className="px-5 py-4 text-sm font-bold">Silme</th>
                  </tr>
                </thead>
                <tbody>
                  {managedUsers.users.map((user) => {
                    const actionUser = toActionUser(user)
                    return (
                      <tr key={user.key} className="border-t border-border align-top hover:bg-muted/30">
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{user.fullName || 'İsim yok'}</p>
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail aria-hidden className="h-4 w-4" />
                              {user.email}
                            </p>
                            <p className="text-xs font-medium text-muted-foreground">
                              {user.source === 'auth' ? `Kimlik ID: ${user.userId?.slice(0, 8)}` : 'Sadece galeri kaydı'}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {user.gallery ? (
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{user.gallery.name}</p>
                              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Store aria-hidden className="h-4 w-4" />
                                {formatAdminLocation(user.gallery)}
                              </p>
                              <Link
                                href={`/showroom/${user.gallery.slug}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
                              >
                                Galeri sayfası
                                <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">Galeri yok</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-2 text-sm text-foreground">
                            <p className="flex items-center gap-2">
                              <Phone aria-hidden className="h-4 w-4" />
                              {user.phone || user.gallery?.phone || 'Telefon yok'}
                            </p>
                            <p className="flex items-center gap-2">
                              <Mail aria-hidden className="h-4 w-4" />
                              {user.gallery?.email || 'Galeri e-postası yok'}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <div className="space-y-2">
                            <p>Rol: {adminAccountRoleLabels[user.authorization.role]}</p>
                            <p>Erişim: {adminAccessStatusLabels[user.authorization.accessStatus]}</p>
                            <p>
                              Abonelik: {adminSubscriptionPlanLabels[user.subscription.plan]} /{' '}
                              {adminSubscriptionStatusLabels[user.subscription.status]}
                            </p>
                            <p>E-posta: {user.emailConfirmed ? 'Onaylı' : 'Onaysız'}</p>
                            {user.banned ? <p className="font-semibold text-destructive">Banlı</p> : null}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="font-semibold text-foreground">{user.metrics.vehicleCount}</p>
                              <p className="text-muted-foreground">Araç</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="font-semibold text-foreground">{user.metrics.leadCount}</p>
                              <p className="text-muted-foreground">Müşteri Talebi</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          <div className="space-y-2">
                            <p className="flex items-center gap-2">
                              <Clock aria-hidden className="h-4 w-4" />
                              Kayıt: {formatAdminDate(user.createdAt)}
                            </p>
                            <p>Son giriş: {formatAdminDate(user.lastSignInAt)}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {actionUser ? (
                            <AdminDeleteUserControl user={actionUser} />
                          ) : (
                            <span className="text-sm text-muted-foreground">Kimlik kaydı yok, kullanıcı silme uygulanamaz.</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <section className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
            <div className="flex items-start gap-3">
              <AlertTriangle aria-hidden className="mt-1 h-5 w-5" />
              <div>
                <h2 className="text-xl font-semibold">Kullanıcı verisi alınamadı</h2>
                <p className="mt-2 text-sm font-medium">{dataError}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminPanelShell>
  )
}
