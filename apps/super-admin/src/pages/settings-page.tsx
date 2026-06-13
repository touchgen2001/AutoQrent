import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  EyeOff,
  KeyRound,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { platformApi } from '@/lib/platform-api'
import {
  settingsExposureLabels,
  settingsStatusLabels,
  type AdminSettingsItem,
  type AdminSettingsSnapshot,
  type AdminSettingsStatus,
} from '@/lib/platform-settings-types'
import { cn } from '@/lib/utils'

type SettingsStatCardProps = {
  label: string
  value: string
  detail: string
  icon: ReactNode
  tone?: 'default' | 'dark' | 'risk'
}

const numberFormatter = new Intl.NumberFormat('tr-TR')
const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatDate(value: string | null) {
  if (!value) return 'Kayıt yok'
  return dateFormatter.format(new Date(value))
}

function buildEmptySnapshot(): AdminSettingsSnapshot {
  return {
    generatedAt: new Date(0).toISOString(),
    source: 'runtime',
    environment: {
      nodeEnv: 'unknown',
      vercelEnv: 'unknown',
      siteUrl: 'unknown',
      platform: 'unknown',
    },
    stats: {
      total: 0,
      ready: 0,
      watch: 0,
      missing: 0,
      requiredMissing: 0,
    },
    sections: [],
    notes: {
      dataPolicy: 'Canlı ayar özeti bekleniyor.',
      secrets: 'Gizli değerler gösterilmez.',
      writePolicy: 'Gizli değer yazma kapalı.',
    },
  }
}

function SettingsStatCard({ label, value, detail, icon, tone = 'default' }: SettingsStatCardProps) {
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

function statusVariant(status: AdminSettingsStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'MISSING') return 'destructive'
  if (status === 'WATCH') return 'secondary'
  return 'default'
}

function StatusBadge({ status }: { status: AdminSettingsStatus }) {
  return (
    <Badge variant={statusVariant(status)} className="rounded-full px-3 py-1">
      {settingsStatusLabels[status]}
    </Badge>
  )
}

function SettingsItemRow({ item }: { item: AdminSettingsItem }) {
  return (
    <tr className="border-b border-border/70 align-top last:border-0">
      <td className="py-4 pr-4">
        <div className="min-w-[260px]">
          <p className="font-black">{item.label}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{item.key}</p>
          {item.required ? (
            <Badge variant="outline" className="mt-2 rounded-full px-3 py-1">
              Zorunlu
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="py-4 pr-4">
        <StatusBadge status={item.status} />
      </td>
      <td className="py-4 pr-4">
        <p className="font-black">{item.maskedValue}</p>
        <p className="mt-1 text-xs text-muted-foreground">{settingsExposureLabels[item.exposure]}</p>
      </td>
      <td className="py-4 pr-4">
        <p className="max-w-[440px] text-sm leading-6 text-muted-foreground">{item.detail}</p>
      </td>
    </tr>
  )
}

export function SettingsPage() {
  const [snapshot, setSnapshot] = useState<AdminSettingsSnapshot>(() => buildEmptySnapshot())
  const [isLoading, setIsLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [operationLog, setOperationLog] = useState<string[]>(['Canlı platform ayar özeti bekleniyor.'])

  const pushLog = useCallback((message: string) => {
    setOperationLog((current) => [`${new Date().toLocaleTimeString('tr-TR')} - ${message}`, ...current].slice(0, 6))
  }, [])

  const loadSettings = useCallback(async (message?: string) => {
    setIsLoading(true)
    setDataError(null)

    try {
      const nextSnapshot = await platformApi.getSettingsSnapshot()
      setSnapshot(nextSnapshot)
      if (message) pushLog(message)
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Canlı platform ayarları alınamadı.')
      setSnapshot(buildEmptySnapshot())
    } finally {
      setIsLoading(false)
    }
  }, [pushLog])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSettings('Canlı çalışma zamanı ayar özeti yüklendi.')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadSettings])

  const requiredMissingItems = useMemo(
    () => snapshot.sections.flatMap((section) => section.items).filter((item) => item.required && item.status === 'MISSING'),
    [snapshot.sections],
  )

  const stats = [
    {
      label: 'Toplam kontrol',
      value: formatNumber(snapshot.stats.total),
      detail: 'Çalışma zamanı ortam ayarı ve dosya sözleşmesi',
      icon: <SlidersHorizontal />,
      tone: 'dark' as const,
    },
    {
      label: 'Hazır',
      value: formatNumber(snapshot.stats.ready),
      detail: 'Eksiksiz çalışan ayarlar',
      icon: <CheckCircle2 />,
    },
    {
      label: 'İzle',
      value: formatNumber(snapshot.stats.watch),
      detail: 'Canlı ortam için önerilen iyileştirme',
      icon: <AlertTriangle />,
    },
    {
      label: 'Zorunlu eksik',
      value: formatNumber(snapshot.stats.requiredMissing),
      detail: 'Yayın öncesi çözülmeli',
      icon: <KeyRound />,
      tone: snapshot.stats.requiredMissing > 0 ? ('risk' as const) : ('default' as const),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <SettingsStatCard key={stat.label} {...stat} />
        ))}
      </section>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-secondary/40">
        <CardHeader className="border-b border-border pb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                <ShieldCheck />
                Platform ayar politikası
              </CardTitle>
              <CardDescription className="mt-2 max-w-4xl leading-6">
                {snapshot.notes.dataPolicy} {snapshot.notes.secrets} {snapshot.notes.writePolicy}
              </CardDescription>
            </div>
            <Button type="button" onClick={() => void loadSettings('Platform ayar özeti manuel yenilendi.')} disabled={isLoading}>
              <RefreshCw className={cn(isLoading && 'animate-spin')} />
              Yenile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <ServerCog className="size-4" />
              Çalışma zamanı
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {snapshot.environment.nodeEnv} / {snapshot.environment.vercelEnv} / {snapshot.environment.platform}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <Database className="size-4" />
              Site adresi
            </p>
            <p className="mt-2 break-all text-sm leading-6 text-muted-foreground">{snapshot.environment.siteUrl}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <EyeOff className="size-4" />
              Son güncelleme
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{formatDate(snapshot.generatedAt)}</p>
          </div>
        </CardContent>
      </Card>

      {dataError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-0">
            <p className="font-black text-destructive">Canlı ayarlar alınamadı</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{dataError}</p>
          </CardContent>
        </Card>
      ) : null}

      {requiredMissingItems.length > 0 ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="border-b border-destructive/20 pb-5">
            <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-destructive">
              <AlertTriangle />
              Zorunlu eksik ayarlar
            </CardTitle>
            <CardDescription>Bu değerler tamamlanmadan canlı sistem güvenli kabul edilmez.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
            {requiredMissingItems.map((item) => (
              <div key={item.key} className="rounded-2xl border border-destructive/20 bg-background p-4">
                <p className="font-black">{item.label}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{item.key}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          {snapshot.sections.map((section) => (
            <Card key={section.key} className="overflow-hidden">
              <CardHeader className="border-b border-border pb-5">
                <CardTitle className="text-xl font-black tracking-tight">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {section.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm font-medium text-muted-foreground">
                    Bu kategori için canlı ayar kaydı yok. Sahte satır gösterilmiyor.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="pb-4 font-black">Ayar</th>
                          <th className="pb-4 font-black">Durum</th>
                          <th className="pb-4 font-black">Değer</th>
                          <th className="pb-4 font-black">Detay</th>
                        </tr>
                      </thead>
                      <tbody>{section.items.map((item) => <SettingsItemRow key={item.key} item={item} />)}</tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="text-lg font-black tracking-tight">Gizli değer yazma kapalı</CardTitle>
              <CardDescription>Bu panel güvenlik gereği ortam/gizli değerleri değiştirmez.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm leading-6 text-muted-foreground">
              <p>Gizli değer değişiklikleri Vercel, Supabase veya yayınlama gizli değer yöneticisi üzerinden yapılmalıdır.</p>
              <p>Bu ekran sadece canlı durum okur; sahte ayar veya sahte yapılandırma göstermez.</p>
              <p>Hassas değerler açık gösterilmez, sadece maskeli veya ayarlı/eksik olarak sunulur.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="text-lg font-black tracking-tight">İşlem geçmişi</CardTitle>
              <CardDescription>Bu ekranda yapılan özet yenilemeleri.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {operationLog.map((item) => (
                <div key={item} className="rounded-2xl border border-border bg-background p-3 text-xs font-medium text-muted-foreground">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
