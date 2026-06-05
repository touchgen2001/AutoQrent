import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlatformDashboardSnapshot, PlatformDashboardTrendPoint } from '@/lib/platform-dashboard-types'

const numberFormatter = new Intl.NumberFormat('tr-TR')

type TrendCardProps = {
  title: string
  description: string
  data: PlatformDashboardTrendPoint[]
  kind: 'area' | 'bar' | 'line'
  valueSuffix?: string
}

type DashboardTrendGridProps = {
  trends: PlatformDashboardSnapshot['trends']
}

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function ChartFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="min-h-[320px] overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-lg font-black tracking-tight">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-60 pt-2">{children}</CardContent>
    </Card>
  )
}

function TrendChart({ title, description, data, kind, valueSuffix }: TrendCardProps) {
  const chartId = title.replace(/\s+/g, '-').toLowerCase()
  const tooltipStyle = {
    border: '1px solid var(--border)',
    borderRadius: '14px',
    boxShadow: '0 18px 45px rgb(0 0 0 / 0.12)',
    color: 'var(--foreground)',
    background: 'var(--card)',
  }

  const tooltipFormatter = (value: number | string) => [`${formatNumber(Number(value))}${valueSuffix || ''}`, title]

  if (kind === 'bar') {
    return (
      <ChartFrame title={title} description={description}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 8, left: -18, bottom: 4 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <YAxis hide />
            <Tooltip cursor={{ fill: 'rgb(0 0 0 / 0.04)' }} contentStyle={tooltipStyle} formatter={tooltipFormatter} />
            <Bar dataKey="value" fill="var(--primary)" radius={[10, 10, 0, 0]} maxBarSize={42} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    )
  }

  if (kind === 'line') {
    return (
      <ChartFrame title={title} description={description}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 18, right: 14, left: -18, bottom: 4 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: 'var(--card)' }}
              activeDot={{ r: 6, fill: 'var(--primary)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    )
  }

  return (
    <ChartFrame title={title} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 18, right: 14, left: -18, bottom: 4 }}>
          <defs>
            <linearGradient id={`gradient-${chartId}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
          <YAxis hide />
          <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter} />
          <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fill={`url(#gradient-${chartId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function DashboardTrendGrid({ trends }: DashboardTrendGridProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <TrendChart title="Günlük kayıt" description="Son 7 günlük galeri kayıt ivmesi." data={trends.registrations} kind="bar" />
      <TrendChart title="Abonelik büyümesi" description="Aylık aktif abonelik artışı." data={trends.subscriptions} kind="area" />
      <TrendChart title="QR kullanım trendi" description="QR tarama trafiğinin günlük seyri." data={trends.qrUsage} kind="line" />
      <TrendChart title="Müşteri talebi trendi" description="Araç vitrini ve iletişim akışından gelen müşteri talebi hareketi." data={trends.leads} kind="area" />
    </section>
  )
}
