import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  CircleCheck,
  CreditCard,
  Database,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { platformApi } from '@/lib/platform-api'
import {
  financePlanLabels,
  financeRiskLabels,
  financeStatusLabels,
  type AdminFinanceAccount,
  type AdminFinanceBreakdownRow,
  type AdminFinanceRiskLevel,
  type AdminFinanceSnapshot,
} from '@/lib/platform-finance-types'
import { cn } from '@/lib/utils'

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('tr-TR')
const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type FinanceStatCardProps = {
  label: string
  value: string
  detail: string
  icon: ReactNode
  tone?: 'default' | 'dark' | 'risk'
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatDate(value: string | null) {
  if (!value) return 'Kayıt yok'
  return dateFormatter.format(new Date(value))
}

function buildEmptySnapshot(): AdminFinanceSnapshot {
  return {
    generatedAt: new Date(0).toISOString(),
    source: 'supabase',
    widgets: {
      monthlyRevenue: 0,
      billableAccounts: 0,
      activeAccounts: 0,
      trialAccounts: 0,
      pastDueAccounts: 0,
      cancelledAccounts: 0,
      unpricedActiveAccounts: 0,
      galleriesWithOwner: 0,
    },
    planBreakdown: [],
    statusBreakdown: [],
    accounts: [],
    auditEvents: [],
    notes: {
      revenue: 'Canlı finans özeti bekleniyor.',
      paymentProvider: 'Ödeme sağlayıcısı durumu henüz okunmadı.',
      dataPolicy: 'Sahte veri gösterilmez.',
    },
  }
}

function FinanceStatCard({ label, value, detail, icon, tone = 'default' }: FinanceStatCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md',
        tone === 'dark' && 'bg-primary text-primary-foreground',
        tone === 'risk' && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <CardContent className="pt-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={cn('truncate text-sm font-semibold text-muted-foreground', tone === 'dark' && 'text-white/65')}>
              {label}
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{value}</p>
            <p className={cn('mt-2 text-xs font-medium leading-5 text-muted-foreground', tone === 'dark' && 'text-white/60')}>
              {detail}
            </p>
          </div>
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground',
              tone === 'dark' && 'bg-white text-primary',
              tone === 'risk' && 'bg-destructive text-destructive-foreground',
            )}
          >
            {icon}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function RiskBadge({ riskLevel }: { riskLevel: AdminFinanceRiskLevel }) {
  const variant = riskLevel === 'RISK' ? 'destructive' : riskLevel === 'WATCH' ? 'secondary' : 'default'

  return (
    <Badge variant={variant} className="rounded-full px-3 py-1">
      {financeRiskLabels[riskLevel]}
    </Badge>
  )
}

function BreakdownTable({
  title,
  description,
  rows,
}: {
  title: string
  description: string
  rows: AdminFinanceBreakdownRow[]
}) {
  const maxRevenue = Math.max(...rows.map((row) => row.monthlyRevenue), 1)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border pb-5">
        <CardTitle className="text-xl font-black tracking-tight">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm font-medium text-muted-foreground">
            Canlı kırılım verisi henüz yüklenmedi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="pb-4 font-black">Kırılım</th>
                  <th className="pb-4 font-black">Hesap</th>
                  <th className="pb-4 font-black">Aktif</th>
                  <th className="pb-4 font-black">Deneme</th>
                  <th className="pb-4 font-black">Ödeme bekliyor</th>
                  <th className="pb-4 font-black">Aylık gelir</th>
                  <th className="pb-4 font-black">Tutarı eksik</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-border/70 last:border-0">
                    <td className="py-4 font-black">{row.label}</td>
                    <td className="py-4">{formatNumber(row.totalAccounts)}</td>
                    <td className="py-4">{formatNumber(row.activeAccounts)}</td>
                    <td className="py-4">{formatNumber(row.trialAccounts)}</td>
                    <td className="py-4">{formatNumber(row.pastDueAccounts)}</td>
                    <td className="py-4">
                      <div className="min-w-[150px]">
                        <p className="font-black">{formatCurrency(row.monthlyRevenue)}</p>
                        <div className="mt-2 h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${Math.round((row.monthlyRevenue / maxRevenue) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4">{formatNumber(row.unpricedAccounts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AccountRow({ account }: { account: AdminFinanceAccount }) {
  return (
    <tr className="border-b border-border/70 align-top last:border-0">
      <td className="py-4 pr-4">
        <div className="min-w-[220px]">
          <p className="font-black">{account.galleryName || 'Galeri eşleşmedi'}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{account.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">{account.fullName || 'İsim kaydı yok'}</p>
        </div>
      </td>
      <td className="py-4 pr-4">
        <Badge variant="outline" className="rounded-full px-3 py-1">
          {financePlanLabels[account.plan]}
        </Badge>
      </td>
      <td className="py-4 pr-4">
        <Badge variant={account.status === 'past_due' ? 'destructive' : 'secondary'} className="rounded-full px-3 py-1">
          {financeStatusLabels[account.status]}
        </Badge>
      </td>
      <td className="py-4 pr-4">
        <p className="font-black">{formatCurrency(account.monthlyRevenue)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{account.revenueSource || 'Doğrulanmış tutar yok'}</p>
      </td>
      <td className="py-4 pr-4">
        <RiskBadge riskLevel={account.riskLevel} />
        <p className="mt-2 max-w-[260px] text-xs leading-5 text-muted-foreground">{account.riskReason}</p>
      </td>
      <td className="py-4 pr-4 text-xs leading-5 text-muted-foreground">
        <p>Son giriş: {formatDate(account.lastSignInAt)}</p>
        <p>Güncelleme: {formatDate(account.subscriptionUpdatedAt)}</p>
      </td>
    </tr>
  )
}

export function FinancePage() {
  const [snapshot, setSnapshot] = useState<AdminFinanceSnapshot>(() => buildEmptySnapshot())
  const [isLoading, setIsLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [operationLog, setOperationLog] = useState<string[]>(['Canlı finans özeti bekleniyor.'])

  const pushLog = useCallback((message: string) => {
    setOperationLog((current) => [`${new Date().toLocaleTimeString('tr-TR')} - ${message}`, ...current].slice(0, 6))
  }, [])

  const loadFinance = useCallback(async (message?: string) => {
    setIsLoading(true)
    setDataError(null)

    try {
      const nextSnapshot = await platformApi.getFinanceSnapshot()
      setSnapshot(nextSnapshot)
      if (message) pushLog(message)
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Canlı finans verisi alınamadı.')
      setSnapshot(buildEmptySnapshot())
    } finally {
      setIsLoading(false)
    }
  }, [pushLog])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFinance('Canlı Supabase finans özeti yüklendi.')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadFinance])

  const riskAccounts = useMemo(
    () => snapshot.accounts.filter((account) => account.riskLevel !== 'OK').slice(0, 16),
    [snapshot.accounts],
  )

  const stats = [
    {
      label: 'Aylık tekrar eden gelir',
      value: formatCurrency(snapshot.widgets.monthlyRevenue),
      detail: 'Sadece doğrulanmış kullanıcı kayıt tutarları',
      icon: <BadgeDollarSign />,
      tone: 'dark' as const,
    },
    {
      label: 'Faturalı hesap',
      value: formatNumber(snapshot.widgets.billableAccounts),
      detail: 'Aktif ve tutarı girilmiş hesaplar',
      icon: <CreditCard />,
    },
    {
      label: 'Aktif / deneme',
      value: `${formatNumber(snapshot.widgets.activeAccounts)} / ${formatNumber(snapshot.widgets.trialAccounts)}`,
      detail: 'Canlı kimlik abonelik durumu',
      icon: <WalletCards />,
    },
    {
      label: 'Ödeme riski',
      value: formatNumber(snapshot.widgets.pastDueAccounts + snapshot.widgets.unpricedActiveAccounts),
      detail: 'Gecikmiş veya tutarsız aktif abonelik',
      icon: <AlertTriangle />,
      tone: snapshot.widgets.pastDueAccounts + snapshot.widgets.unpricedActiveAccounts > 0 ? ('risk' as const) : ('default' as const),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <FinanceStatCard key={stat.label} {...stat} />
        ))}
      </section>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-secondary/40">
        <CardHeader className="border-b border-border pb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                <ShieldCheck />
                Finans veri politikası
              </CardTitle>
              <CardDescription className="mt-2 max-w-4xl leading-6">
                Bu modül sabit paket fiyatı, tahmini gelir veya sahte finans satırı üretmez. Ödeme entegrasyonu bağlanana kadar aylık tekrar eden gelir
                sadece kullanıcı kaydında açıkça tanımlı sayısal tutarlardan okunur.
              </CardDescription>
            </div>
            <Button type="button" onClick={() => void loadFinance('Finans özeti manuel yenilendi.')} disabled={isLoading}>
              <RefreshCw className={cn(isLoading && 'animate-spin')} />
              Yenile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <Database className="size-4" />
              Kaynak
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{snapshot.notes.revenue}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <CreditCard className="size-4" />
              Ödeme sağlayıcısı
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{snapshot.notes.paymentProvider}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <CalendarClock className="size-4" />
              Son güncelleme
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{formatDate(snapshot.generatedAt)}</p>
          </div>
        </CardContent>
      </Card>

      {dataError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-0">
            <p className="font-black text-destructive">Canlı finans verisi alınamadı</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{dataError}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <BreakdownTable
          title="Paket kırılımı"
          description="Başlangıç / Pro / Premium / Kurumsal kapsamındaki gerçek hesap dağılımı."
          rows={snapshot.planBreakdown}
        />
        <BreakdownTable
          title="Abonelik durumu"
          description="Aktif, deneme, ödeme bekleyen ve iptal aboneliklerin canlı dağılımı."
          rows={snapshot.statusBreakdown}
        />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border pb-5">
            <CardTitle className="text-xl font-black tracking-tight">Finans risk hesabı</CardTitle>
            <CardDescription>
              Ödeme bekleyen, askıda olan veya aktif olduğu halde doğrulanmış tutarı bulunmayan hesaplar.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {riskAccounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm font-medium text-muted-foreground">
                Riskli finans hesabı bulunmadı. Sahte satır gösterilmiyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="pb-4 font-black">Galeri / kullanıcı</th>
                      <th className="pb-4 font-black">Paket</th>
                      <th className="pb-4 font-black">Durum</th>
                      <th className="pb-4 font-black">Aylık Gelir</th>
                      <th className="pb-4 font-black">Risk</th>
                      <th className="pb-4 font-black">Zaman</th>
                    </tr>
                  </thead>
                  <tbody>{riskAccounts.map((account) => <AccountRow key={account.userId} account={account} />)}</tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="flex items-center gap-2 text-lg font-black tracking-tight">
                <CircleCheck />
                İşlem geçmişi
              </CardTitle>
              <CardDescription>Bu ekranda yapılan yükleme ve yenileme işlemleri.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {operationLog.map((item) => (
                <div key={item} className="rounded-2xl border border-border bg-background p-3 text-xs font-medium text-muted-foreground">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="text-lg font-black tracking-tight">Finans denetim geçmişi</CardTitle>
              <CardDescription>Abonelik ve finansla ilişkili son canlı denetim kayıtları.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {snapshot.auditEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm font-medium text-muted-foreground">
                  Finans denetim kaydı bulunmadı.
                </div>
              ) : (
                snapshot.auditEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{event.action}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{event.target}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        Denetim
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.detail}</p>
                    <p className="mt-3 text-xs font-medium text-muted-foreground">
                      {event.actor} - {formatDate(event.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
