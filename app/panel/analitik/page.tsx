'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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
  Phone,
  Car,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Eye,
  ArrowUpRight
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
import { 
  mockQRStats, 
  mockDailyStats, 
  mockHourlyStats,
  mockVehiclePerformance
} from '@/lib/mock-data'
import { MetricCard } from '@/components/shared/metric-card'
import type { PanelLeadFunnelResponse } from '@/lib/panel-types'

type AnalyticsRange = PanelLeadFunnelResponse['range']

type FunnelApiResponse =
  | ({ ok: true } & PanelLeadFunnelResponse)
  | { ok: false; message?: string }

function formatSignedValue(value: number) {
  return value > 0 ? `+${value}` : `${value}`
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<AnalyticsRange>('7days')
  const [funnel, setFunnel] = useState<PanelLeadFunnelResponse | null>(null)
  const [isFunnelLoading, setIsFunnelLoading] = useState(true)
  const [funnelError, setFunnelError] = useState<string | null>(null)
  const stats = mockQRStats
  const dailyStats = mockDailyStats
  const hourlyStats = mockHourlyStats
  const vehiclePerformance = mockVehiclePerformance
  const activeConversionRate = funnel?.current.conversionRate ?? stats.leadConversionRate
  const conversionTrendValue = funnel?.trend.conversionRateDelta ?? 0
  const wonLeadTrendValue = funnel?.trend.wonLeadDelta ?? 0
  const visitorsPerLead = activeConversionRate > 0 ? Math.max(1, Math.round(100 / activeConversionRate)) : null

  useEffect(() => {
    const controller = new AbortController()
    let isDisposed = false

    const fetchFunnel = async () => {
      setIsFunnelLoading(true)
      setFunnelError(null)

      try {
        const response = await fetch(`/api/panel/analytics/funnel?range=${dateRange}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const data = (await response.json()) as FunnelApiResponse

        if (!response.ok || !data.ok) {
          if (!isDisposed) {
            const errorMessage = 'message' in data ? data.message : undefined
            setFunnel(null)
            setFunnelError(errorMessage ?? 'Lead funnel verisi alınamadı.')
          }
          return
        }

        if (!isDisposed) {
          setFunnel(data)
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        if (!isDisposed) {
          setFunnel(null)
          setFunnelError('Ağ hatası nedeniyle lead funnel verisi alınamadı.')
        }
      } finally {
        if (!isDisposed) {
          setIsFunnelLoading(false)
        }
      }
    }

    void fetchFunnel()

    return () => {
      isDisposed = true
      controller.abort()
    }
  }, [dateRange])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analitik</h1>
          <p className="text-sm text-muted-foreground mt-1">
            QR taramaları, ziyaretçiler ve lead performansı
          </p>
        </div>
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

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Toplam QR Tarama"
          value={stats.totalScans.toLocaleString('tr-TR')}
          icon={QrCode}
          trend={{ value: 12.5, isPositive: true }}
        />
        <MetricCard
          title="Benzersiz Ziyaretçi"
          value={stats.uniqueVisitors.toLocaleString('tr-TR')}
          icon={Users}
          trend={{ value: 8.3, isPositive: true }}
        />
        <MetricCard
          title="WhatsApp Tıklama"
          value={stats.whatsappClicks.toLocaleString('tr-TR')}
          icon={MessageCircle}
          trend={{ value: 15.2, isPositive: true }}
        />
        <MetricCard
          title="Telefon Tıklama"
          value={stats.phoneClicks.toLocaleString('tr-TR')}
          icon={Phone}
          trend={{ value: 5.8, isPositive: true }}
        />
        <MetricCard
          title="Test Sürüşü Talebi"
          value={stats.testDriveRequests.toLocaleString('tr-TR')}
          icon={Car}
          trend={{ value: 22.1, isPositive: true }}
        />
        <MetricCard
          title="Lead Dönüşüm"
          value={`%${activeConversionRate}`}
          icon={TrendingUp}
          trend={{ value: conversionTrendValue, isPositive: conversionTrendValue >= 0 }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Scans Chart */}
        <Card className="p-6 border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Günlük Taramalar</h3>
              <p className="text-sm text-muted-foreground">Son 7 günlük QR tarama verileri</p>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyStats}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                />
                <Area 
                  type="monotone" 
                  dataKey="scans" 
                  stroke="hsl(var(--accent))" 
                  fillOpacity={1} 
                  fill="url(#colorScans)" 
                  name="Tarama"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Hourly Distribution Chart */}
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
              <BarChart data={hourlyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(hour) => `${hour}:00`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(hour) => `${hour}:00 - ${hour}:59`}
                />
                <Bar 
                  dataKey="scans" 
                  fill="hsl(var(--accent))" 
                  radius={[4, 4, 0, 0]}
                  name="Tarama"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Lead Funnel */}
      <Card className="p-6 border-border/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h3 className="font-semibold text-foreground">Lead Dönüşüm Hunisi</h3>
            <p className="text-sm text-muted-foreground">
              {funnel ? `${funnel.current.periodLabel} durumu` : 'Lead funnel verisi yükleniyor...'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={
                conversionTrendValue >= 0
                  ? 'bg-green-500/10 text-green-600 border-green-500/30'
                  : 'bg-red-500/10 text-red-600 border-red-500/30'
              }
            >
              {conversionTrendValue >= 0 ? (
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="mr-1 h-3.5 w-3.5" />
              )}
              Dönüşüm {formatSignedValue(conversionTrendValue)}%
            </Badge>
            <Badge
              variant="outline"
              className={
                wonLeadTrendValue >= 0
                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                  : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
              }
            >
              {wonLeadTrendValue >= 0 ? (
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="mr-1 h-3.5 w-3.5" />
              )}
              Satış Lead {formatSignedValue(wonLeadTrendValue)}
            </Badge>
          </div>
        </div>

        {funnelError && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {funnelError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Toplam Lead</p>
            <p className="text-lg font-semibold text-foreground">
              {funnel?.current.totalLeads ?? '-'}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Satışa Dönen</p>
            <p className="text-lg font-semibold text-foreground">
              {funnel?.current.totalWon ?? '-'}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Kayıp</p>
            <p className="text-lg font-semibold text-foreground">
              {funnel?.current.totalLost ?? '-'}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Dönüşüm</p>
            <p className="text-lg font-semibold text-foreground">
              %{activeConversionRate}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(funnel?.current.stages ?? []).map((stage) => (
            <div key={stage.key} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">{stage.label}</span>
                <span className="text-muted-foreground">{stage.count} lead</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${Math.max(stage.rateFromTotal, stage.count > 0 ? 2 : 0)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Toplamın %{stage.rateFromTotal}</span>
                <span>Önceki adımdan %{stage.rateFromPrevious}</span>
              </div>
            </div>
          ))}
        </div>

        {isFunnelLoading && (
          <p className="text-xs text-muted-foreground mt-4">Lead funnel verisi güncelleniyor...</p>
        )}
      </Card>

      {/* Vehicle Performance Table */}
      <Card className="border-border/50">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Araç Performansı</h3>
              <p className="text-sm text-muted-foreground">En çok etkileşim alan araçlar</p>
            </div>
            <Button variant="outline" size="sm">
              Tümünü Gör
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Araç</TableHead>
                <TableHead className="text-muted-foreground text-center">QR Tarama</TableHead>
                <TableHead className="text-muted-foreground text-center">Lead</TableHead>
                <TableHead className="text-muted-foreground text-center">WhatsApp</TableHead>
                <TableHead className="text-muted-foreground text-center">Telefon</TableHead>
                <TableHead className="text-muted-foreground text-center">Dönüşüm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehiclePerformance.map((vehicle, index) => (
                <TableRow key={vehicle.vehicleId} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-9 rounded overflow-hidden bg-muted flex-shrink-0">
                        <Image
                          src={vehicle.image || '/placeholder.jpg'}
                          alt={vehicle.vehicleTitle}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm truncate max-w-[200px]">
                          {vehicle.vehicleTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">#{index + 1} sırada</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{vehicle.scans}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{vehicle.leads}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{vehicle.whatsappClicks}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{vehicle.phoneClicks}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline"
                      className={
                        vehicle.conversionRate >= 15 
                          ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                          : vehicle.conversionRate >= 10
                          ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
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

      {/* Additional Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Performing Day */}
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En Yoğun Gün</p>
              <p className="font-semibold text-foreground">14 Mart 2024</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tarama</span>
              <span className="font-medium text-foreground">223</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ziyaretçi</span>
              <span className="font-medium text-foreground">167</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lead</span>
              <span className="font-medium text-foreground">18</span>
            </div>
          </div>
        </Card>

        {/* Peak Hour */}
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En Yoğun Saat</p>
              <p className="font-semibold text-foreground">16:00 - 17:00</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Ortalama <span className="font-medium text-foreground">62 tarama</span> bu saat aralığında gerçekleşiyor.
          </p>
        </Card>

        {/* Conversion Insight */}
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dönüşüm Oranı</p>
              <p className="font-semibold text-foreground">%{activeConversionRate}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {visitorsPerLead ? (
              <>
                Her <span className="font-medium text-foreground">{visitorsPerLead} ziyaretçiden 1&apos;i</span> sizinle
                iletişime geçiyor.
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
