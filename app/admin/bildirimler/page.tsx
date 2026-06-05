import { AlertTriangle, Bell, Send } from 'lucide-react'

import { getAdminPageData } from '@/app/admin/_lib/page-data'
import { AdminNotificationComposer, type AdminActionUser } from '@/components/admin/admin-action-controls'
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

export default async function AdminNotificationsPage() {
  const { session, managedUsers, dataError, shellSummary } = await getAdminPageData()
  const actionUsers = managedUsers?.users.map(toActionUser).filter((user): user is AdminActionUser => Boolean(user)) || []

  return (
    <AdminPanelShell username={session.username} summary={shellSummary}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bildirimler</h1>
          <p className="text-muted-foreground">
            Tekil veya toplu bildirim kaydı oluşturun. Panel bildirimleri denetim kaydı üzerinden galeri paneli uyarı merkezinde görünür.
          </p>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send aria-hidden className="h-5 w-5 text-accent" />
                Bildirim Oluştur
              </CardTitle>
              <CardDescription>
                Toplu seçim tüm kimlik kullanıcılarını hedefler. Tekil seçim sadece seçilen kullanıcıya kayıt açar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {managedUsers ? (
                <AdminNotificationComposer users={actionUsers} />
              ) : (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive">
                  {dataError}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell aria-hidden className="h-5 w-5 text-accent" />
                Gerçek Teslimat Durumu
              </CardTitle>
              <CardDescription>Sahte gönderim sonucu gösterilmez.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Panel bildirimi: denetim kaydı üzerinden panel uyarı merkezinde görünür.</p>
              <p>E-posta/SMS/WhatsApp: sağlayıcı entegrasyonu bağlanana kadar sadece kayıt altına alınır.</p>
              <p>Hedef kullanıcı sayısı canlı kimlik kayıtlarından hesaplanır.</p>
            </CardContent>
          </Card>
        </section>

        {!managedUsers ? (
          <section className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
            <div className="flex items-start gap-3">
              <AlertTriangle aria-hidden className="mt-1 h-5 w-5" />
              <div>
                <h2 className="text-xl font-semibold">Bildirim hedefleri alınamadı</h2>
                <p className="mt-2 text-sm font-medium">{dataError}</p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </AdminPanelShell>
  )
}
