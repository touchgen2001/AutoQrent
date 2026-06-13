import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BadgeDollarSign,
  Building2,
  Car,
  CircleAlert,
  CircleCheck,
  HeartPulse,
  MessageSquareText,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { platformApi } from '@/lib/platform-api'
import type {
  PlatformDashboardActivity,
  PlatformDashboardHealthStatus,
  PlatformDashboardSnapshot,
} from '@/lib/platform-dashboard-types'
import { cn } from '@/lib/utils'

const DashboardTrendGrid = lazy(() =>
  import('@/components/platform/dashboard-trend-grid').then(({ DashboardTrendGrid }) => ({ default: DashboardTrendGrid })),
)

const numberFormatter = new Intl.NumberFormat('tr-TR')
const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})

type DashboardWidget = {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone?: 'default' | 'dark' | 'watch'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function statusCopy(status: PlatformDashboardHealthStatus) {
  if (status === 'OPERATIONAL') return 'Operasyonel'
  if (status === 'WATCH') return 'İzlemede'
  return 'Sorun'
}

function statusIcon(status: PlatformDashboardHealthStatus) {
  if (status === 'ISSUE') return CircleAlert
  return CircleCheck
}

function statusClass(status: PlatformDashboardHealthStatus) {
  if (status === 'OPERATIONAL') return 'bg-primary text-primary-foreground'
  if (status === 'WATCH') return 'bg-secondary text-secondary-foreground'
  return 'bg-destructive text-destructive-foreground'
}

function activityStatusClass(status: PlatformDashboardHealthStatus) {
  if (status === 'ISSUE') return 'bg-destructive/10 text-destructive'
  if (status === 'WATCH') return 'bg-secondary text-secondary-foreground'
  return 'bg-primary text-primary-foreground'
}

function activityTypeCopy(type: PlatformDashboardActivity['type']) {
  if (type === 'gallery') return 'Galeri'
  if (type === 'lead') return 'Müşteri Talebi'
  if (type === 'qr') return 'QR'
  return 'Denetim'
}

function DashboardStatCard({ widget }: { widget: DashboardWidget }) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md',
        widget.tone === 'dark' && 'bg-primary text-primary-foreground',
        widget.tone === 'watch' && 'border-primary/30 bg-secondary/60',
      )}
    >
      <CardContent className="pt-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className={cn(
                'truncate text-sm font-semibold text-muted-foreground',
                widget.tone === 'dark' && 'text-white/65',
              )}
            >
              {widget.label}
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{widget.value}</p>
            <p
              className={cn(
                'mt-2 text-xs font-medium leading-5 text-muted-foreground',
                widget.tone === 'dark' && 'text-white/60',
              )}
            >
              {widget.detail}
            </p>
          </div>
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground',
              widget.tone === 'dark' && 'bg-white text-primary',
              widget.tone === 'watch' && 'bg-primary text-primary-foreground',
            )}
          >
            <widget.icon />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-0">
        <div className="h-4 w-28 rounded-full bg-muted" />
        <div className="mt-4 h-9 w-20 rounded-full bg-muted" />
        <div className="mt-3 h-3 w-40 rounded-full bg-muted" />
      </CardContent>
    </Card>
  )
}

function ChartsLoadingGrid() {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      {['Günlük kayıt', 'Abonelik büyümesi', 'QR kullanım trendi', 'Müşteri talebi trendi'].map((title) => (
        <Card key={title} className="min-h-[320px] overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-black tracking-tight">{title}</CardTitle>
            <CardDescription>Grafik modülü yükleniyor.</CardDescription>
          </CardHeader>
          <CardContent className="h-60 pt-2">
            <div className="flex h-full items-end gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-5">
              {[42, 68, 54, 88, 72, 94, 63].map((height, index) => (
                <div key={`${title}-${height}-${index}`} className="flex-1 rounded-t-xl bg-primary/20" style={{ height: `${height}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

function buildWidgets(snapshot: PlatformDashboardSnapshot): DashboardWidget[] {
  const { widgets } = snapshot

  return [
    {
      label: 'Toplam galeri sayısı',
      value: formatNumber(widgets.totalGalleries),
      detail: 'Geri alınabilir silme dahil tüm galeri kayıtları',
      icon: Building2,
    },
    {
      label: 'Aktif / pasif galeriler',
      value: `${formatNumber(widgets.activeGalleries)} / ${formatNumber(widgets.passiveGalleries)}`,
      detail: 'Aktif ve askıda/silinmiş galeriler',
      icon: Activity,
      tone: 'dark',
    },
    {
      label: 'Toplam araç',
      value: formatNumber(widgets.totalVehicles),
      detail: 'Silinmiş galeri araçları hariç',
      icon: Car,
    },
    {
      label: 'Toplam QR',
      value: formatNumber(widgets.totalQr),
      detail: 'Araç vitrini ve basılı QR havuzu',
      icon: QrCode,
    },
    {
      label: 'Günlük QR tarama',
      value: formatNumber(widgets.dailyQrScans),
      detail: 'Bugünkü QR tarama olayı toplamı',
      icon: ScanLine,
      tone: 'watch',
    },
    {
      label: 'Toplam müşteri talebi',
      value: formatNumber(widgets.totalLeads),
      detail: 'Panel müşteri talebi kayıt havuzu',
      icon: MessageSquareText,
    },
    {
      label: 'Aylık tekrar eden gelir',
      value: formatCurrency(widgets.monthlyRevenue),
      detail: 'Aktif ücretli galeri toplamı',
      icon: BadgeDollarSign,
      tone: 'dark',
    },
    {
      label: 'Bugün yeni kayıt',
      value: formatNumber(widgets.todayRegistrations),
      detail: 'Bugün oluşturulan galeri kayıtları',
      icon: UserPlus,
    },
    {
      label: 'Trial kullanıcılar',
      value: formatNumber(widgets.trialUsers),
      detail: 'Deneme durumundaki galeriler',
      icon: Users,
    },
    {
      label: 'Sistem sağlığı',
      value: `${widgets.systemHealthScore}%`,
      detail: widgets.systemHealthLabel,
      icon: HeartPulse,
      tone: 'watch',
    },
  ]
}

export function DashboardPage() {
  const [snapshot, setSnapshot] = useState<PlatformDashboardSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(true)

  async function loadDashboard() {
    setRefreshing(true)
    setError(null)

    try {
      const nextSnapshot = await platformApi.getDashboardSnapshot()
      setSnapshot(nextSnapshot)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Dashboard verisi alınamadı.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let active = true

    platformApi
      .getDashboardSnapshot()
      .then((nextSnapshot) => {
        if (active) {
          setSnapshot(nextSnapshot)
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Dashboard verisi alınamadı.')
        }
      })
      .finally(() => {
        if (active) {
          setRefreshing(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const widgets = useMemo(() => (snapshot ? buildWidgets(snapshot) : []), [snapshot])

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Dashboard verisi alınamadı</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void loadDashboard()}>Tekrar Dene</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
          <h2 className="text-xl font-black tracking-tight md:text-2xl">Platform Yönetim Ekranı</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Galeri hesapları, QR kullanımı, müşteri talebi akışı, abonelik büyümesi ve sistem sağlığı canlı Supabase verisiyle izlenir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {snapshot ? (
              <Badge variant="outline" className="rounded-full px-3 py-1.5">
                Son güncelleme: {formatDateTime(snapshot.generatedAt)}
              </Badge>
            ) : null}
            <Button variant="outline" className="gap-2" onClick={() => void loadDashboard()} disabled={refreshing}>
              <RefreshCw className={cn(refreshing && 'animate-spin')} />
              Yenile
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {snapshot ? widgets.map((widget) => <DashboardStatCard key={widget.label} widget={widget} />) : Array.from({ length: 10 }, (_, index) => <LoadingCard key={index} />)}
      </section>

      {snapshot ? (
        <>
          <Suspense fallback={<ChartsLoadingGrid />}>
            <DashboardTrendGrid trends={snapshot.trends} />
          </Suspense>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <HeartPulse />
                  Sistem sağlığı
                </CardTitle>
                <CardDescription>Temel servislerin durum özeti.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.healthChecks.map((check) => {
                  const Icon = statusIcon(check.status)
                  return (
                    <div key={check.label} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', statusClass(check.status))}>
                          <Icon />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{check.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{check.detail}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant={check.status === 'ISSUE' ? 'destructive' : 'secondary'}>{statusCopy(check.status)}</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">{check.latencyMs} ms</p>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-lg font-black">Komuta merkezi notu</CardTitle>
                <CardDescription className="text-white/65">Bu ekran doğrulanabilir canlı veri standardıyla çalışır.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm text-white/72 md:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                  <p className="font-bold text-white">Veri kaynağı</p>
                  <p className="mt-2 leading-6">{snapshot.sourceLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                  <p className="font-bold text-white">Veri politikası</p>
                  <p className="mt-2 leading-6">{snapshot.notes.dataPolicy}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                  <p className="font-bold text-white">Aylık gelir kuralı</p>
                  <p className="mt-2 leading-6">{snapshot.notes.revenue}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                  <p className="font-bold text-white">QR hesabı</p>
                  <p className="mt-2 leading-6">{snapshot.notes.qr}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <Activity />
                  Son canlı hareketler
                </CardTitle>
                <CardDescription>Galeri, müşteri talebi, QR ve denetim kayıtlarından üretilen son gerçek olaylar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.recentActivity.length > 0 ? (
                  snapshot.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className={cn('rounded-full px-2.5 py-1 text-[11px]', activityStatusClass(activity.status))}>
                            {activityTypeCopy(activity.type)}
                          </Badge>
                          <p className="truncate text-sm font-black">{activity.title}</p>
                        </div>
                        <p className="mt-2 truncate text-sm text-muted-foreground">{activity.detail}</p>
                      </div>
                      <time className="shrink-0 text-xs font-semibold text-muted-foreground" dateTime={activity.at}>
                        {formatDateTime(activity.at)}
                      </time>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                    Henüz gösterilecek canlı aktivite yok.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <ShieldCheck />
                  Güvenli canlı veri
                </CardTitle>
                <CardDescription>Admin yönetim ekranı okuma modeli.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>Servis yetki anahtarı yalnızca Next.js admin API içinde kullanılır; süper admin tarayıcı paketine girmez.</p>
                <p>Trendler sabit sayı değil, Supabase galeri, araç, QR tarama, müşteri talebi ve denetim kayıtlarından hesaplanır.</p>
                <p>Ödeme sağlayıcısı bağlanana kadar aylık gelir tahmini yapılmaz; doğrulanabilir kayıt bilgisi yoksa değer `0` kalır.</p>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  )
}
