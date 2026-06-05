'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  QrCode,
  Users,
  MessageCircle,
  MousePointerClick,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  ArrowUpRight,
  RefreshCcw,
  Car,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { MetricCard } from '@/components/shared/metric-card'
import { VehicleImageFrame } from '@/components/shared/vehicle-image-frame'
import { LiveDataStatus } from '@/components/shared/live-data-status'
import type {
  PanelLandingCtaAnalyticsResponse,
  PanelLandingCtaConfig,
  PanelLeadFunnelResponse,
  PanelShowroomCtaAnalyticsResponse,
} from '@/lib/panel-types'

type AnalyticsRange = PanelLeadFunnelResponse['range']

type FunnelApiResponse =
  | ({ ok: true } & PanelLeadFunnelResponse)
  | { ok: false; message?: string }

type OverviewResponse =
  | {
      ok: true
      source: 'supabase'
      range: AnalyticsRange
      metrics: {
        totalScans: number
        uniqueVisitors: number
        totalLeads: number
        totalVehicles: number
      }
      dailyStats: Array<{ date: string; scans: number; leads: number }>
      hourlyStats: Array<{ hour: number; scans: number }>
      vehiclePerformance: Array<{
        vehicleId: string
        vehicleTitle: string
        image: string | null
        scans: number
        leads: number
        conversionRate: number
      }>
    }
  | { ok: false; message?: string }

type LandingApiResponse =
  | ({ ok: true } & PanelLandingCtaAnalyticsResponse)
  | { ok: false; message?: string }

type ShowroomApiResponse =
  | ({ ok: true } & PanelShowroomCtaAnalyticsResponse)
  | { ok: false; message?: string }

type LandingConfigApiResponse =
  | {
      ok: true
      source: 'supabase'
      config: PanelLandingCtaConfig
    }
  | { ok: false; message?: string }

type LandingRolloutApiResponse =
  | {
      ok: true
      source: 'supabase'
      action: 'apply_winner'
      appliedVariant: 'A' | 'B'
      confidence: 'low' | 'medium' | 'high'
      range: AnalyticsRange
      config: PanelLandingCtaConfig | null
    }
  | {
      ok: true
      source: 'supabase'
      action: 'set_auto'
      config: PanelLandingCtaConfig | null
    }
  | {
      ok: false
      message?: string
      reason?: string
      summary?: PanelLandingCtaAnalyticsResponse['summary']
    }

type SubscriptionLockedApiResponse = {
  ok: false
  code?: string
  message?: string
  redirectTo?: string
}

function formatSignedValue(value: number) {
  return value > 0 ? `+${value}` : `${value}`
}

const LANDING_VARIANT_LABELS: Record<'A' | 'B', string> = {
  A: 'Varyant A',
  B: 'Varyant B',
}

const LANDING_CONFIDENCE_LABELS: Record<'low' | 'medium' | 'high', string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
}

const RECOMMENDATION_TONE_CLASS: Record<'info' | 'warning' | 'success', string> = {
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-700',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
}

const LIVE_REFRESH_INTERVAL_MS = 30 * 1000

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function isSubscriptionLockedResponse(response: Response, data: unknown): data is SubscriptionLockedApiResponse {
  if (response.status !== 402 && response.status !== 403) return false
  if (!data || typeof data !== 'object') return false
  const payload = data as { ok?: unknown; code?: unknown }
  return payload.ok === false && typeof payload.code === 'string'
}

export default function AnalyticsPage() {
  const refreshInFlightRef = useRef(false)
  const [dateRange, setDateRange] = useState<AnalyticsRange>('7days')
  const [funnel, setFunnel] = useState<PanelLeadFunnelResponse | null>(null)
  const [overview, setOverview] = useState<Extract<OverviewResponse, { ok: true }> | null>(null)
  const [landing, setLanding] = useState<PanelLandingCtaAnalyticsResponse | null>(null)
  const [showroom, setShowroom] = useState<PanelShowroomCtaAnalyticsResponse | null>(null)
  const [landingConfig, setLandingConfig] = useState<PanelLandingCtaConfig | null>(null)
  const [isConfigSaving, setIsConfigSaving] = useState(false)
  const [isRolloutSaving, setIsRolloutSaving] = useState(false)
  const [configMessage, setConfigMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [advancedAnalyticsMessage, setAdvancedAnalyticsMessage] = useState<string | null>(null)

  const refresh = useCallback(async (
    range: AnalyticsRange,
    options: { background?: boolean; signal?: AbortSignal } = {},
  ) => {
    if (refreshInFlightRef.current) return

    const isBackgroundRefresh = Boolean(options.background)
    refreshInFlightRef.current = true
    if (isBackgroundRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setErrorMessage(null)
    setAdvancedAnalyticsMessage(null)

    try {
      const funnelResponse = await fetch(`/api/panel/analytics/funnel?range=${range}`, {
        cache: 'no-store',
        signal: options.signal,
      })
      const funnelData = (await funnelResponse.json()) as FunnelApiResponse

      if (!funnelResponse.ok || !funnelData.ok) {
        const message = 'message' in funnelData ? funnelData.message : undefined
        setErrorMessage(message ?? 'Müşteri talebi hunisi verisi alınamadı.')
        return
      }

      const overviewResponse = await fetch(`/api/panel/analytics/overview?range=${range}`, {
        cache: 'no-store',
        signal: options.signal,
      })
      const overviewData = (await overviewResponse.json()) as OverviewResponse

      if (!overviewResponse.ok || !overviewData.ok) {
        const message = 'message' in overviewData ? overviewData.message : undefined
        setErrorMessage(message ?? 'Analitik özet verisi alınamadı.')
        return
      }

      const showroomResponse = await fetch(`/api/panel/analytics/showroom?range=${range}`, {
        cache: 'no-store',
        signal: options.signal,
      })
      const showroomData = (await showroomResponse.json()) as ShowroomApiResponse

      const showroomLocked = isSubscriptionLockedResponse(showroomResponse, showroomData)
      if (!showroomLocked && (!showroomResponse.ok || !showroomData.ok)) {
        const message = 'message' in showroomData ? showroomData.message : undefined
        setErrorMessage(message ?? 'Galeri sayfası dönüşüm verisi alınamadı.')
        return
      }

      const landingResponse = await fetch(`/api/panel/analytics/landing?range=${range}`, {
        cache: 'no-store',
        signal: options.signal,
      })
      const landingData = (await landingResponse.json()) as LandingApiResponse

      const landingLocked = isSubscriptionLockedResponse(landingResponse, landingData)
      if (!landingLocked && (!landingResponse.ok || !landingData.ok)) {
        const message = 'message' in landingData ? landingData.message : undefined
        setErrorMessage(message ?? 'Ana sayfa buton analitiği alınamadı.')
        return
      }

      const landingConfigResponse = await fetch('/api/panel/analytics/landing-config', {
        cache: 'no-store',
        signal: options.signal,
      })
      const landingConfigData = (await landingConfigResponse.json()) as LandingConfigApiResponse

      setFunnel(funnelData)
      setOverview(overviewData)
      setLanding(landingLocked ? null : landingData)
      setShowroom(showroomLocked ? null : showroomData)

      if (showroomLocked || landingLocked || isSubscriptionLockedResponse(landingConfigResponse, landingConfigData)) {
        const lockedPayload = (landingLocked ? landingData : showroomLocked ? showroomData : landingConfigData) as SubscriptionLockedApiResponse
        setAdvancedAnalyticsMessage(
          lockedPayload.message ?? 'Gelişmiş analitik mevcut planınızda kapalı. Kullanmak için planınızı yükseltin.',
        )
      }

      if (landingConfigResponse.ok && landingConfigData.ok) {
        setLandingConfig(landingConfigData.config)
      } else {
        setLandingConfig(null)
      }
      setLastUpdatedAt(new Date().toISOString())
    } catch (error) {
      if (isAbortError(error)) return
      setErrorMessage('Ağ hatası nedeniyle analitik verileri alınamadı.')
    } finally {
      refreshInFlightRef.current = false
      if (isBackgroundRefresh) {
        setIsRefreshing(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void refresh(dateRange, { signal: controller.signal })
    }, 0)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void refresh(dateRange, { background: true })
    }, LIVE_REFRESH_INTERVAL_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
      window.clearInterval(intervalId)
    }
  }, [dateRange, refresh])

  const updateLandingDistribution = async (
    mode: 'auto' | 'forced',
    forcedVariant: 'A' | 'B' | null,
  ) => {
    if (mode === 'forced' && !forcedVariant) {
      setConfigMessage('Forced mod için varyant seçilmesi gerekiyor.')
      return
    }

    setIsConfigSaving(true)
    setConfigMessage(null)

    try {
      const response = await fetch('/api/panel/analytics/landing-config', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          forcedVariant: mode === 'forced' ? forcedVariant : null,
        }),
      })

      const data = (await response.json()) as LandingConfigApiResponse

      if (!response.ok || !data.ok) {
        const message = 'message' in data ? data.message : undefined
        setConfigMessage(message ?? 'Ana sayfa buton ayarı kaydedilemedi.')
        return
      }

      setLandingConfig(data.config)
      setLastUpdatedAt(new Date().toISOString())
      setConfigMessage(
        mode === 'auto'
          ? 'Dağıtım otomatik A/B moduna alındı.'
          : `${forcedVariant} varyanti landing trafigine zorunlu atandi.`,
      )
    } catch {
      setConfigMessage('Ayar kaydı sırasında ağ hatası oluştu.')
    } finally {
      setIsConfigSaving(false)
    }
  }

  const runLandingRollout = async (
    action: 'apply_winner' | 'set_auto',
  ) => {
    setIsRolloutSaving(true)
    setConfigMessage(null)

    try {
      const response = await fetch('/api/panel/analytics/landing-rollout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action,
          range: dateRange,
        }),
      })

      const data = (await response.json()) as LandingRolloutApiResponse
      if (!response.ok || !data.ok) {
        const message = 'message' in data ? data.message : undefined
        setConfigMessage(message ?? 'Rollout işlemi tamamlanamadı.')
        return
      }

      setLandingConfig(data.config)
      if (data.action === 'apply_winner') {
        setConfigMessage(
          `${data.appliedVariant} varyanti canliya alindi. Guven: ${LANDING_CONFIDENCE_LABELS[data.confidence]}.`,
        )
      } else {
        setConfigMessage('Canlı dağıtım otomatik A/B moduna alındı.')
      }

      await refresh(dateRange)
    } catch {
      setConfigMessage('Rollout sırasında ağ hatası oluştu.')
    } finally {
      setIsRolloutSaving(false)
    }
  }

  const activeConversionRate = funnel?.current.conversionRate ?? 0
  const conversionTrendValue = funnel?.trend.conversionRateDelta ?? 0
  const wonLeadTrendValue = funnel?.trend.wonLeadDelta ?? 0
  const landingCtr = landing?.current.ctr ?? 0
  const landingCtrTrendValue = landing?.trend.ctrDelta ?? 0
  const landingVariantRows = (() => {
    const previousMap = new Map(
      (landing?.previous.variantStats ?? []).map((variant) => [variant.variant, variant]),
    )

    return [...(landing?.current.variantStats ?? [])]
      .map((variant) => {
        const previous = previousMap.get(variant.variant)
        const ctrDelta = previous ? Number((variant.ctr - previous.ctr).toFixed(1)) : 0
        return {
          ...variant,
          ctrDelta,
        }
      })
      .sort((left, right) => {
        if (right.ctr !== left.ctr) return right.ctr - left.ctr
        return right.clicks - left.clicks
      })
  })()

  const bestLandingVariant = landingVariantRows[0] ?? null
  const runnerLandingVariant = landingVariantRows[1] ?? null
  const bestVariantCtrGap =
    bestLandingVariant && runnerLandingVariant
      ? Number((bestLandingVariant.ctr - runnerLandingVariant.ctr).toFixed(1))
      : 0
  const bestVariantClickGap =
    bestLandingVariant && runnerLandingVariant
      ? bestLandingVariant.clicks - runnerLandingVariant.clicks
      : 0
  const maxVariantCtr = landingVariantRows.reduce(
    (accumulator, item) => Math.max(accumulator, item.ctr),
    0,
  )
  const landingDistributionMode = landingConfig?.mode ?? 'auto'
  const landingForcedVariant =
    landingDistributionMode === 'forced'
      ? landingConfig?.forcedVariant ?? null
      : null
  const canApplyWinnerRollout = Boolean(
    landing?.summary.rolloutEligible,
  )
  const showroomCtaRate = showroom?.current.ctaToLeadRate ?? 0
  const showroomCtaRateTrendValue = showroom?.trend.ctaToLeadRateDelta ?? 0
  const showroomEventRows = (showroom?.current.eventStats ?? []).filter((event) => event.clicks > 0)
  const maxShowroomEventClicks = showroomEventRows.reduce(
    (accumulator, event) => Math.max(accumulator, event.clicks),
    0,
  )
  const showroomHasActivity = Boolean(showroom && showroom.current.totalClicks > 0)

  const visitorsPerLead = useMemo(() => {
    const scans = overview?.metrics.totalScans ?? 0
    const leads = overview?.metrics.totalLeads ?? 0
    if (scans <= 0 || leads <= 0) return null
    return Math.max(1, Math.round(scans / leads))
  }, [overview])

  const busiestDay = useMemo(() => {
    if (!overview || overview.dailyStats.length === 0) return null

    return [...overview.dailyStats].sort((left, right) => right.scans - left.scans)[0] || null
  }, [overview])

  const peakHour = useMemo(() => {
    if (!overview || overview.hourlyStats.length === 0) return null

    return [...overview.hourlyStats].sort((left, right) => right.scans - left.scans)[0] || null
  }, [overview])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analitik</h1>
          <p className="text-sm text-muted-foreground mt-1">QR taramaları, ziyaretçiler ve müşteri talebi performansı</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <LiveDataStatus
            lastUpdatedAt={lastUpdatedAt}
            isRefreshing={isRefreshing}
            intervalSeconds={LIVE_REFRESH_INTERVAL_MS / 1000}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void refresh(dateRange)} disabled={isLoading || isRefreshing}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as AnalyticsRange)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Son 7 Gün</SelectItem>
                <SelectItem value="30days">Son 30 Gün</SelectItem>
                <SelectItem value="90days">Son 90 Gün</SelectItem>
                <SelectItem value="year">Bu Yıl</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {advancedAnalyticsMessage && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
          {advancedAnalyticsMessage}{' '}
          <Link href="/panel/ayarlar?tab=subscription" className="font-semibold underline">
            Planları görüntüle
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Toplam QR Tarama"
          value={(overview?.metrics.totalScans ?? 0).toLocaleString('tr-TR')}
          icon={QrCode}
          trend={{ value: conversionTrendValue, isPositive: conversionTrendValue >= 0 }}
        />
        <MetricCard
          title="Benzersiz Ziyaretçi"
          value={(overview?.metrics.uniqueVisitors ?? 0).toLocaleString('tr-TR')}
          icon={Users}
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Toplam Müşteri Talebi"
          value={(overview?.metrics.totalLeads ?? 0).toLocaleString('tr-TR')}
          icon={MessageCircle}
          trend={{ value: wonLeadTrendValue, isPositive: wonLeadTrendValue >= 0 }}
        />
        <MetricCard
          title="Aktif Araç"
          value={(overview?.metrics.totalVehicles ?? 0).toLocaleString('tr-TR')}
          icon={Car}
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Müşteri Talebi Dönüşümü"
          value={`%${activeConversionRate}`}
          icon={TrendingUp}
          trend={{ value: conversionTrendValue, isPositive: conversionTrendValue >= 0 }}
        />
        <MetricCard
          title="Tarama / Talep"
          value={visitorsPerLead ? `${visitorsPerLead}:1` : '-'}
          icon={QrCode}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-border/50">
          <div className="mb-6">
            <h3 className="font-semibold text-foreground">Günlük Taramalar</h3>
            <p className="text-sm text-muted-foreground">Seçili tarih aralığı QR ve müşteri talebi trendi</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.dailyStats || []}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
                  }
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area type="monotone" dataKey="scans" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorScans)" name="Tarama" />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fillOpacity={0.08} fill="hsl(var(--primary))" name="Müşteri Talebi" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Saatlik Dağılım</h3>
              <p className="text-sm text-muted-foreground">Taramaların saat bazlı yoğunluğu</p>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.hourlyStats || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(hour) => `${hour}:00 - ${hour}:59`}
                />
                <Bar dataKey="scans" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Tarama" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6 border-border/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h3 className="font-semibold text-foreground">Herkese Açık Galeri Sayfası Dönüşümü</h3>
            <p className="text-sm text-muted-foreground">
              {showroom
                ? `${showroom.current.periodLabel} herkese açık galeri sayfası buton ve müşteri talebi performansı`
                : 'Galeri sayfası dönüşüm verisi yükleniyor...'}
            </p>
          </div>
          <Badge
            variant="outline"
            className={showroomCtaRateTrendValue >= 0 ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : 'bg-rose-500/10 text-rose-700 border-rose-500/30'}
          >
            {showroomCtaRateTrendValue >= 0 ? <TrendingUp className="mr-1 h-3.5 w-3.5" /> : <TrendingDown className="mr-1 h-3.5 w-3.5" />}
            Buton → Talep {formatSignedValue(showroomCtaRateTrendValue)}%
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-6">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Toplam Buton Tıklaması</p>
            <p className="text-lg font-semibold text-foreground">{(showroom?.current.totalClicks ?? 0).toLocaleString('tr-TR')}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Direkt İletişim</p>
            <p className="text-lg font-semibold text-foreground">{(showroom?.current.directContactClicks ?? 0).toLocaleString('tr-TR')}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Araç Detayı</p>
            <p className="text-lg font-semibold text-foreground">{(showroom?.current.vehicleDetailClicks ?? 0).toLocaleString('tr-TR')}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Galeri Sayfası Talebi</p>
            <p className="text-lg font-semibold text-foreground">{(showroom?.current.showroomLeads ?? 0).toLocaleString('tr-TR')}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Buton → Talep</p>
            <p className="text-lg font-semibold text-foreground">%{showroomCtaRate}</p>
          </div>
        </div>

        {!showroomHasActivity ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5">
            <div className="flex items-start gap-3">
              <MousePointerClick className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">Henüz galeri sayfası buton verisi yok</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sahte veri gösterilmiyor. Herkese açık galeri sayfasından WhatsApp, arama, konum, sosyal kanal veya araç detayı tıklanınca burada otomatik görünecek.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">Buton Dağılımı</h4>
                <Badge variant="outline" className="text-[11px]">
                  {showroom?.current.uniqueTargets ?? 0} hedef
                </Badge>
              </div>
              <div className="space-y-3">
                {showroomEventRows.map((event) => {
                  const width = maxShowroomEventClicks > 0
                    ? Math.max((event.clicks / maxShowroomEventClicks) * 100, 8)
                    : 8

                  return (
                    <div key={event.eventType} className="rounded-lg border border-border/60 bg-background/70 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-foreground">{event.label}</span>
                        <span className="text-muted-foreground">
                          {event.clicks.toLocaleString('tr-TR')} tıklama
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Toplam CTA içindeki payı %{event.share}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <h4 className="mb-3 text-sm font-semibold text-foreground">En Çok Tıklanan Hedefler</h4>
                <div className="space-y-2">
                  {(showroom?.current.topTargets ?? []).map((target) => (
                    <div key={target.target} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm">
                      <span className="truncate text-foreground">{target.target}</span>
                      <Badge variant="secondary">{target.clicks}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <h4 className="mb-3 text-sm font-semibold text-foreground">Gerçek Veri İçgörüleri</h4>
                <div className="space-y-2">
                  {(showroom?.recommendations ?? []).map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className={`rounded-lg border px-3 py-2 ${RECOMMENDATION_TONE_CLASS[item.level]}`}
                    >
                      <div className="flex items-start gap-2">
                        {item.level === 'warning' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                        {item.level === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                        {item.level === 'info' && <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />}
                        <div>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="text-xs opacity-90">{item.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 border-border/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h3 className="font-semibold text-foreground">Ana Sayfa Buton Dönüşümü</h3>
            <p className="text-sm text-muted-foreground">
              {landing ? `${landing.current.periodLabel} buton görünüm ve tıklama performansı` : 'Ana sayfa buton verisi yükleniyor...'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={landingCtrTrendValue >= 0 ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : 'bg-rose-500/10 text-rose-700 border-rose-500/30'}
            >
              {landingCtrTrendValue >= 0 ? <TrendingUp className="mr-1 h-3.5 w-3.5" /> : <TrendingDown className="mr-1 h-3.5 w-3.5" />}
              Tıklama oranı {formatSignedValue(landingCtrTrendValue)}%
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Toplam Gösterim</p>
            <p className="text-lg font-semibold text-foreground">{(landing?.current.impressions ?? 0).toLocaleString('tr-TR')}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Toplam Tıklama</p>
            <p className="text-lg font-semibold text-foreground">{(landing?.current.clicks ?? 0).toLocaleString('tr-TR')}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Tıklama Oranı</p>
            <p className="text-lg font-semibold text-foreground">%{landingCtr}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Tekil Oturum</p>
            <p className="text-lg font-semibold text-foreground">{(landing?.current.uniqueSessions ?? 0).toLocaleString('tr-TR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(landing?.current.surfaceStats ?? []).map((surface) => (
            <div key={surface.surface} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">{surface.label}</span>
                <Badge variant="secondary" className="gap-1">
                  <MousePointerClick className="h-3.5 w-3.5" />
                  %{surface.ctr}
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{surface.impressions.toLocaleString('tr-TR')} gösterim</span>
                <span>{surface.clicks.toLocaleString('tr-TR')} tıklama</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-border/60 bg-muted/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-foreground">Faz 6: A/B Varyant Kıyas</h4>
            <Badge variant="outline" className="text-[11px]">
              {bestLandingVariant
                ? `${LANDING_VARIANT_LABELS[bestLandingVariant.variant]} önde`
                : 'Veri bekleniyor'}
            </Badge>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">En İyi Varyant</p>
              <p className="text-sm font-semibold text-foreground">
                {bestLandingVariant
                  ? `${LANDING_VARIANT_LABELS[bestLandingVariant.variant]} • %${bestLandingVariant.ctr}`
                  : '-'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Tıklama Oranı Farkı</p>
              <p className="text-sm font-semibold text-foreground">%{bestVariantCtrGap}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Tıklama Farkı</p>
              <p className="text-sm font-semibold text-foreground">
                {bestVariantClickGap >= 0 ? '+' : ''}
                {bestVariantClickGap}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {landingVariantRows.map((variant) => {
              const width = maxVariantCtr > 0 ? Math.max((variant.ctr / maxVariantCtr) * 100, 8) : 8
              const toneClass =
                variant.variant === 'A'
                  ? 'bg-blue-500/80'
                  : 'bg-emerald-500/80'

              return (
                <div key={variant.variant} className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {LANDING_VARIANT_LABELS[variant.variant]}
                    </span>
                    <span className="text-muted-foreground">
                      {variant.clicks.toLocaleString('tr-TR')} tıklama / {variant.impressions.toLocaleString('tr-TR')} gösterim
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${toneClass}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Tıklama oranı %{variant.ctr}</span>
                    <span>
                      Önceki döneme göre {formatSignedValue(variant.ctrDelta)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border/60 bg-muted/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-foreground">Faz 7: Otomatik İşlem Katmanı</h4>
            <Badge variant="outline" className="text-[11px]">
              Güven: {LANDING_CONFIDENCE_LABELS[landing?.summary.confidence ?? 'low']}
            </Badge>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Önerilen Kazanan</p>
              <p className="text-sm font-semibold text-foreground">
                {landing?.summary.winnerVariant
                  ? LANDING_VARIANT_LABELS[landing.summary.winnerVariant]
                  : 'Yok'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Kazanan Tıklama Oranı Farkı</p>
              <p className="text-sm font-semibold text-foreground">%{landing?.summary.winnerCtrGap ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Örneklem Durumu</p>
              <p className="text-sm font-semibold text-foreground">
                {landing?.summary.minimumSampleReached ? 'Yeterli' : 'Yetersiz'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Süre Durumu</p>
              <p className="text-sm font-semibold text-foreground">
                {landing?.summary.minimumDurationReached
                  ? 'Yeterli'
                  : `${landing?.summary.observedDays ?? 0}/${landing?.summary.requiredDurationDays ?? 14} gün`}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Oturum Durumu</p>
              <p className="text-sm font-semibold text-foreground">
                {landing?.summary.minimumSessionReached
                  ? 'Yeterli'
                  : `${landing?.summary.observedUniqueSessions ?? 0}/${landing?.summary.requiredUniqueSessions ?? 300}`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {(landing?.recommendations ?? []).map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className={`rounded-lg border px-3 py-2 ${RECOMMENDATION_TONE_CLASS[item.level]}`}
              >
                <div className="flex items-start gap-2">
                  {item.level === 'warning' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                  {item.level === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                  {item.level === 'info' && <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />}
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs opacity-90">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border/60 bg-muted/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-foreground">Faz 8: Canlı Dağıtım Kontrolü</h4>
            <Badge variant="outline" className="text-[11px]">
              {landingDistributionMode === 'forced'
                ? `Canlı: ${landingForcedVariant || '-'}`
                : 'Canlı: Otomatik A/B'}
            </Badge>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Dağıtım Modu</p>
              <p className="text-sm font-semibold text-foreground">
                {landingDistributionMode === 'forced' ? 'Sabit' : 'Otomatik'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Aktif Varyant</p>
              <p className="text-sm font-semibold text-foreground">
                {landingForcedVariant || 'A/B rastgele'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Son Güncelleme</p>
              <p className="text-sm font-semibold text-foreground">
                {landingConfig?.updatedAt
                  ? new Date(landingConfig.updatedAt).toLocaleString('tr-TR')
                  : '-'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void runLandingRollout('apply_winner')}
              disabled={isRolloutSaving || !canApplyWinnerRollout}
            >
              Kazananı Otomatik Canlıya Al
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runLandingRollout('set_auto')}
              disabled={isRolloutSaving}
            >
              Dağıtımı Otomatik Moda Al
            </Button>
            <Button
              size="sm"
              variant={landingDistributionMode === 'auto' ? 'default' : 'outline'}
              onClick={() => void updateLandingDistribution('auto', null)}
              disabled={isConfigSaving || isRolloutSaving || !landingConfig}
            >
              Otomatik A/B
            </Button>
            <Button
              size="sm"
              variant={landingDistributionMode === 'forced' && landingForcedVariant === 'A' ? 'default' : 'outline'}
              onClick={() => void updateLandingDistribution('forced', 'A')}
              disabled={isConfigSaving || isRolloutSaving || !landingConfig}
            >
              A Varyantını Canlıya Al
            </Button>
            <Button
              size="sm"
              variant={landingDistributionMode === 'forced' && landingForcedVariant === 'B' ? 'default' : 'outline'}
              onClick={() => void updateLandingDistribution('forced', 'B')}
              disabled={isConfigSaving || isRolloutSaving || !landingConfig}
            >
              B Varyantını Canlıya Al
            </Button>
          </div>

          {configMessage && (
            <p className="mt-3 text-xs text-muted-foreground">{configMessage}</p>
          )}
        </div>
      </Card>

      <Card className="p-6 border-border/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h3 className="font-semibold text-foreground">Müşteri Talebi Dönüşüm Hunisi</h3>
            <p className="text-sm text-muted-foreground">{funnel ? `${funnel.current.periodLabel} durumu` : 'Müşteri talebi hunisi verisi yükleniyor...'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={conversionTrendValue >= 0 ? 'bg-green-500/10 text-green-600 border-green-500/30' : 'bg-red-500/10 text-red-600 border-red-500/30'}
            >
              {conversionTrendValue >= 0 ? <TrendingUp className="mr-1 h-3.5 w-3.5" /> : <TrendingDown className="mr-1 h-3.5 w-3.5" />}
              Dönüşüm {formatSignedValue(conversionTrendValue)}%
            </Badge>
            <Badge
              variant="outline"
              className={wonLeadTrendValue >= 0 ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' : 'bg-amber-500/10 text-amber-700 border-amber-500/30'}
            >
              {wonLeadTrendValue >= 0 ? <TrendingUp className="mr-1 h-3.5 w-3.5" /> : <TrendingDown className="mr-1 h-3.5 w-3.5" />}
              Satışa Dönen Talep {formatSignedValue(wonLeadTrendValue)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Toplam Müşteri Talebi</p>
            <p className="text-lg font-semibold text-foreground">{funnel?.current.totalLeads ?? '-'}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Satışa Dönen</p>
            <p className="text-lg font-semibold text-foreground">{funnel?.current.totalWon ?? '-'}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Kayıp</p>
            <p className="text-lg font-semibold text-foreground">{funnel?.current.totalLost ?? '-'}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Dönüşüm</p>
            <p className="text-lg font-semibold text-foreground">%{activeConversionRate}</p>
          </div>
        </div>

        <div className="space-y-3">
          {(funnel?.current.stages ?? []).map((stage) => (
            <div key={stage.key} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">{stage.label}</span>
                <span className="text-muted-foreground">{stage.count} müşteri talebi</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(stage.rateFromTotal, stage.count > 0 ? 2 : 0)}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Toplamın %{stage.rateFromTotal}</span>
                <span>Önceki adımdan %{stage.rateFromPrevious}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-border/50">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Araç Performansı</h3>
              <p className="text-sm text-muted-foreground">En çok etkileşim alan araçlar</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/panel/araclar">
                Tümünü Gör
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Araç</TableHead>
                <TableHead className="text-muted-foreground text-center">QR Tarama</TableHead>
                <TableHead className="text-muted-foreground text-center">Müşteri Talebi</TableHead>
                <TableHead className="text-muted-foreground text-center">Dönüşüm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(overview?.vehiclePerformance || []).map((vehicle, index) => (
                <TableRow key={vehicle.vehicleId} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-9 rounded overflow-hidden bg-muted flex-shrink-0">
                        <VehicleImageFrame
                          src={vehicle.image}
                          alt={vehicle.vehicleTitle}
                          sizes="48px"
                          placeholderLabel="Yok"
                          placeholderClassName="[&_svg]:h-4 [&_svg]:w-4 [&_span]:sr-only"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm truncate max-w-[200px]">{vehicle.vehicleTitle}</p>
                        <p className="text-xs text-muted-foreground">#{index + 1} sırada</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">{vehicle.scans}</TableCell>
                  <TableCell className="text-center font-medium">{vehicle.leads}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        vehicle.conversionRate >= 15
                          ? 'bg-green-500/10 text-green-600 border-green-500/20'
                          : vehicle.conversionRate >= 10
                            ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
                            : 'bg-muted text-muted-foreground'
                      }
                    >
                      %{vehicle.conversionRate}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En Yoğun Gün</p>
              <p className="font-semibold text-foreground">
                {busiestDay
                  ? new Date(busiestDay.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '-'}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tarama</span>
              <span className="font-medium text-foreground">{busiestDay?.scans ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Müşteri Talebi</span>
              <span className="font-medium text-foreground">{busiestDay?.leads ?? 0}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En Yoğun Saat</p>
              <p className="font-semibold text-foreground">
                {peakHour ? `${peakHour.hour}:00 - ${peakHour.hour}:59` : '-'}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {peakHour ? (
              <>
                Ortalama <span className="font-medium text-foreground">{peakHour.scans} tarama</span> bu saat aralığında gerçekleşiyor.
              </>
            ) : (
              <>Saatlik veri henüz oluşmadı.</>
            )}
          </p>
        </Card>

        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tarama Verimliliği</p>
              <p className="font-semibold text-foreground">%{activeConversionRate}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {visitorsPerLead ? (
              <>
                Her <span className="font-medium text-foreground">{visitorsPerLead} taramadan 1&apos;i</span> müşteri talebi üretiyor.
              </>
            ) : (
              <>Dönüşüm verisi oluştuğunda burada otomatik içgörü gösterilecek.</>
            )}
          </p>
        </Card>
      </div>
    </div>
  )
}
