'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock3, RefreshCw, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { PanelAlertCenterResponse, PanelAlertSeverity } from '@/lib/panel-types'

type AlertApiResponse =
  | ({ ok: true } & PanelAlertCenterResponse)
  | { ok: false; message?: string }

const REFRESH_INTERVAL_MS = 45 * 1000

const severityMeta: Record<
  PanelAlertSeverity,
  {
    label: string
    badgeClassName: string
    cardClassName: string
  }
> = {
  critical: {
    label: 'Kritik',
    badgeClassName: 'bg-red-500/15 text-red-700 border-red-500/30',
    cardClassName: 'border-red-500/30 bg-red-500/[0.04]',
  },
  high: {
    label: 'Yüksek',
    badgeClassName: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
    cardClassName: 'border-orange-500/30 bg-orange-500/[0.04]',
  },
  medium: {
    label: 'Orta',
    badgeClassName: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    cardClassName: 'border-amber-500/30 bg-amber-500/[0.04]',
  },
  low: {
    label: 'Düşük',
    badgeClassName: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
    cardClassName: 'border-blue-500/30 bg-blue-500/[0.04]',
  },
}

function formatRelativeMinutes(isoDate: string | null) {
  if (!isoDate) return 'Henüz güncellenmedi'

  const parsed = Date.parse(isoDate)
  if (!Number.isFinite(parsed)) return 'Henüz güncellenmedi'

  const diffMinutes = Math.max(0, Math.round((Date.now() - parsed) / 60000))
  if (diffMinutes < 1) return 'Az önce'
  if (diffMinutes < 60) return `${diffMinutes} dk önce`

  const hours = Math.floor(diffMinutes / 60)
  return `${hours} saat önce`
}

export function LiveAlertCenter() {
  const [alertsData, setAlertsData] = useState<PanelAlertCenterResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchAlerts = async (manualRefresh = false) => {
    if (manualRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setErrorMessage(null)

    try {
      const response = await fetch('/api/panel/alerts', {
        cache: 'no-store',
      })
      const data = (await response.json()) as AlertApiResponse

      if (!response.ok || !data.ok) {
        const message = 'message' in data ? data.message : undefined
        setAlertsData(null)
        setErrorMessage(message ?? 'Canlı uyarılar alınamadı.')
        return
      }

      setAlertsData(data)
    } catch {
      setAlertsData(null)
      setErrorMessage('Ağ hatası nedeniyle canlı uyarılar alınamadı.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const initialTimeoutId = window.setTimeout(() => {
      void fetchAlerts()
    }, 0)

    const intervalId = window.setInterval(() => {
      void fetchAlerts(true)
    }, REFRESH_INTERVAL_MS)

    return () => {
      window.clearTimeout(initialTimeoutId)
      window.clearInterval(intervalId)
    }
  }, [])

  const lastUpdatedText = useMemo(
    () => formatRelativeMinutes(alertsData?.generatedAt || null),
    [alertsData?.generatedAt],
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" />
              Canlı Uyarı Merkezi
            </CardTitle>
            <CardDescription>
              Yeni müşteri talebi, talep düşüşü, yanıtsız talep ve düşük dönüşüm sinyalleri otomatik izlenir.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchAlerts(true)} disabled={isRefreshing}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
            Yenile
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline">Açık Alarm: {alertsData?.summary.open ?? 0}</Badge>
          <Badge className={severityMeta.critical.badgeClassName}>Kritik: {alertsData?.summary.critical ?? 0}</Badge>
          <Badge className={severityMeta.high.badgeClassName}>Yüksek: {alertsData?.summary.high ?? 0}</Badge>
          <Badge className={severityMeta.medium.badgeClassName}>Orta: {alertsData?.summary.medium ?? 0}</Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Clock3 className="w-3.5 h-3.5" />
          Son güncelleme: {lastUpdatedText}
          {alertsData && <span className="ml-1">({alertsData.source})</span>}
        </div>

        {errorMessage && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {!errorMessage && isLoading && (
          <div className="rounded-md border border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
            Uyarılar yükleniyor...
          </div>
        )}

        {!errorMessage && !isLoading && (alertsData?.alerts.length || 0) === 0 && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700">
            Şu anda kritik bir alarm yok. Operasyon normal görünüyor.
          </div>
        )}

        {!errorMessage && !isLoading && (alertsData?.alerts.length || 0) > 0 && (
          <div className="space-y-3">
            {(alertsData?.alerts || []).map((alert) => {
              const meta = severityMeta[alert.severity]
              return (
                <div key={alert.id} className={cn('rounded-lg border p-3', meta.cardClassName)}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <p className="font-semibold text-foreground">{alert.title}</p>
                        <Badge className={meta.badgeClassName}>{meta.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md border border-border/70 bg-background/70 px-2 py-1">{alert.metricValue}</span>
                        <span className="rounded-md border border-border/70 bg-background/70 px-2 py-1">{alert.threshold}</span>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
                      <Link href={alert.actionHref}>{alert.actionLabel}</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
