import Link from 'next/link'
import { AlertTriangle, Bell, Car, CreditCard, MessageSquare, ShieldCheck, Store, UserCog, Users } from 'lucide-react'

import { getAdminPageData, formatAdminDate } from '@/app/admin/_lib/page-data'
import { AdminPanelShell } from '@/components/admin/admin-panel-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number | string
  icon: typeof Users
}) {
  return (
    <Card className="transition-all hover:border-accent/30 hover:shadow-md">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span className="rounded-lg bg-accent/10 p-2 text-accent">
            <Icon aria-hidden className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-4 text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}

const categoryCards = [
  {
    title: 'Kullanıcılar',
    description: 'Kimlik kullanıcılarını, galeri bağlantısını ve silme onay akışını yönetin.',
    href: '/admin/kullanicilar',
    icon: Users,
  },
  {
    title: 'Yetkilendirme',
    description: 'Kullanıcı rolünü ve panel erişim durumunu güvenli kayıt bilgisi üzerinden güncelleyin.',
    href: '/admin/yetkilendirme',
    icon: UserCog,
  },
  {
    title: 'Abonelikler',
    description: 'Paket kapsamı ve abonelik durumunu gerçek kimlik kaydına yazın.',
    href: '/admin/abonelikler',
    icon: CreditCard,
  },
  {
    title: 'Bildirimler',
    description: 'Tekil veya toplu panel bildirimi kaydedin; harici kanal yoksa teslimat iddiası olmaz.',
    href: '/admin/bildirimler',
    icon: Bell,
  },
]

export default async function AdminPage() {
  const { session, managedUsers, dataError, shellSummary } = await getAdminPageData()

  return (
    <AdminPanelShell username={session.username} summary={shellSummary}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Yönetim Merkezi</h1>
            <p className="text-muted-foreground">
              Kayıt, yetki, abonelik ve bildirim işlemleri sol menüde ayrı kategorilerden yönetilir.
            </p>
          </div>
        </div>

        {managedUsers ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <StatCard label="Kimlik Kullanıcısı" value={managedUsers.summary.authUsers} icon={Users} />
              <StatCard label="Galeri" value={managedUsers.summary.totalGalleries} icon={Store} />
              <StatCard label="Araç" value={managedUsers.summary.totalVehicles} icon={Car} />
              <StatCard label="Müşteri Talebi" value={managedUsers.summary.totalLeads} icon={MessageSquare} />
            </section>

            <section className="grid gap-4 md:grid-cols-4">
              {categoryCards.map((item) => (
                <Link key={item.href} href={item.href} className="group block">
                  <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-accent/40 group-hover:shadow-lg">
                    <CardHeader>
                      <span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar text-sidebar-foreground">
                        <item.icon aria-hidden className="h-5 w-5" />
                      </span>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </section>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck aria-hidden className="h-5 w-5 text-accent" />
                  Gerçek Veri Kaynağı
                </CardTitle>
                <CardDescription>
                  Son güncelleme: {formatAdminDate(managedUsers.generatedAt)}
                  {managedUsers.capReached ? ` · Kimlik listesi limiti: ${managedUsers.sourceLimit}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                <p>Galeri bağlı kullanıcı: {managedUsers.summary.usersWithGallery}</p>
                <p>Galeri bağsız kullanıcı: {managedUsers.summary.usersWithoutGallery}</p>
                <p>Kimlik kaydı olmayan galeri: {managedUsers.summary.galleriesWithoutAuth}</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <section className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
            <div className="flex items-start gap-3">
              <AlertTriangle aria-hidden className="mt-1 h-5 w-5" />
              <div>
                <h2 className="text-xl font-semibold">Admin verisi alınamadı</h2>
                <p className="mt-2 text-sm font-medium">{dataError}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminPanelShell>
  )
}
