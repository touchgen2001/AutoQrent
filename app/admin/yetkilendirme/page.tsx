import { AlertTriangle, ShieldCheck } from 'lucide-react'

import { getAdminPageData } from '@/app/admin/_lib/page-data'
import { AdminAuthorizationControl, type AdminActionUser } from '@/components/admin/admin-action-controls'
import { AdminPanelShell } from '@/components/admin/admin-panel-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdminManagedUser } from '@/lib/server/admin-users-repository'

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

export default async function AdminAuthorizationPage() {
  const { session, managedUsers, dataError, shellSummary } = await getAdminPageData()
  const actionUsers = managedUsers?.users.map(toActionUser).filter((user): user is AdminActionUser => Boolean(user)) || []

  return (
    <AdminPanelShell username={session.username} summary={shellSummary}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Yetkilendirme</h1>
          <p className="text-muted-foreground">
            Roller ve panel erişimi Supabase kimlik kaydındaki güvenli kayıt alanına yazılır. Askıya alınan kullanıcı giriş ve panel API erişimi alamaz.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck aria-hidden className="h-5 w-5 text-accent" />
              Yetki Politikası
            </CardTitle>
            <CardDescription>
              Kullanıcı tarafından değiştirilebilen profil bilgileri yetkilendirme için kullanılmaz.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Rol: galeri sahibi, yönetici veya destek. Erişim: aktif veya askıya alındı.
          </CardContent>
        </Card>

        {managedUsers ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {actionUsers.length > 0 ? (
              actionUsers.map((user) => <AdminAuthorizationControl key={user.userId} user={user} />)
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">Yetkilendirilecek kimlik kullanıcısı yok.</CardContent>
              </Card>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
            <div className="flex items-start gap-3">
              <AlertTriangle aria-hidden className="mt-1 h-5 w-5" />
              <div>
                <h2 className="text-xl font-semibold">Yetki verisi alınamadı</h2>
                <p className="mt-2 text-sm font-medium">{dataError}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminPanelShell>
  )
}
