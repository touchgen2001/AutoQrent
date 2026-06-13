import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  Database,
  Eye,
  FileClock,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { platformApi } from '@/lib/platform-api'
import {
  auditActionLabels,
  auditEntityLabels,
  auditSeverityLabels,
  type AdminAuditEntry,
  type AdminAuditFilters,
  type AdminAuditSeverity,
  type AdminAuditSnapshot,
  type AdminAuditSummaryRow,
} from '@/lib/platform-audit-types'
import { cn } from '@/lib/utils'

type AuditFilterState = {
  search: string
  action: string
  entityType: string
  source: string
  from: string
  to: string
}

type AuditStatCardProps = {
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

const defaultFilters: AuditFilterState = {
  search: '',
  action: '',
  entityType: '',
  source: '',
  from: '',
  to: '',
}

const actionOptions = [
  'admin_user_delete',
  'admin_user_authorization_update',
  'admin_user_status_update',
  'admin_subscription_update',
  'admin_notification_send',
  'admin_moderation_action',
  'image_reject',
  'contact_form_blocked',
  'public_vehicle_cta_click',
  'public_showroom_cta_click',
  'public_slug_rotation',
  'vehicle_create',
  'vehicle_update',
  'vehicle_delete',
  'lead_status_change',
  'landing_cta_config_update',
]

const entityOptions = ['user', 'subscription', 'notification', 'moderation', 'vehicle', 'lead', 'contact', 'system', 'marketing']

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatDate(value: string | null) {
  if (!value) return 'Kayıt yok'
  return dateFormatter.format(new Date(value))
}

function displayAction(action: string) {
  return auditActionLabels[action] || action
}

function displayEntity(entityType: string) {
  return auditEntityLabels[entityType] || entityType
}

function displaySummaryLabel(value: string) {
  return auditActionLabels[value] || auditEntityLabels[value] || auditSeverityLabels[value as AdminAuditSeverity] || value
}

function isSensitiveMetadataKey(key: string) {
  return /(password|token|secret|authorization|cookie|session|service[_-]?role|api[_-]?key)/i.test(key)
}

function sanitizeAuditMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditMetadata(item))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      isSensitiveMetadataKey(key) ? '[redacted]' : sanitizeAuditMetadata(nestedValue),
    ]),
  )
}

function readAuditReason(metadata: Record<string, unknown>) {
  const reason = metadata.reason
  return typeof reason === 'string' && reason.trim().length > 0 ? reason.trim() : null
}

function stringifyAuditMetadata(metadata: Record<string, unknown>) {
  return JSON.stringify(sanitizeAuditMetadata(metadata), null, 2)
}

function buildEmptySnapshot(): AdminAuditSnapshot {
  return {
    generatedAt: new Date(0).toISOString(),
    source: 'supabase',
    sourceTable: 'audit_logs',
    appliedFilters: {},
    stats: {
      loadedEvents: 0,
      criticalEvents: 0,
      watchEvents: 0,
      adminEvents: 0,
      blockedEvents: 0,
      anonymousActorEvents: 0,
      latestEventAt: null,
    },
    summaries: {
      actions: [],
      entityTypes: [],
      sources: [],
      severities: [],
    },
    entries: [],
    notes: {
      retention: 'Canlı denetim özeti bekleniyor.',
      dataPolicy: 'sahte denetim satırı gösterilmez.',
      security: 'Frontend yalnızca korumalı admin API çağırır.',
    },
  }
}

function toApiFilters(filters: AuditFilterState): AdminAuditFilters {
  return {
    search: filters.search.trim() || undefined,
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    source: filters.source.trim() || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    limit: 200,
  }
}

function AuditStatCard({ label, value, detail, icon, tone = 'default' }: AuditStatCardProps) {
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

function SeverityBadge({ severity }: { severity: AdminAuditSeverity }) {
  const variant = severity === 'CRITICAL' ? 'destructive' : severity === 'WATCH' ? 'secondary' : 'outline'

  return (
    <Badge variant={variant} className="rounded-full px-3 py-1">
      {auditSeverityLabels[severity]}
    </Badge>
  )
}

function SummaryList({ title, rows }: { title: string; rows: AdminAuditSummaryRow[] }) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1)

  return (
    <Card>
      <CardHeader className="border-b border-border pb-5">
        <CardTitle className="text-lg font-black tracking-tight">{title}</CardTitle>
        <CardDescription>Yüklenen gerçek denetim penceresinden hesaplanır.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-5 text-sm font-medium text-muted-foreground">
            Kırılım için canlı kayıt yok.
          </div>
        ) : (
          rows.slice(0, 8).map((row) => (
            <div key={`${title}-${row.key}`} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-black">{displaySummaryLabel(row.label)}</span>
                <span className="font-black">{formatNumber(row.count)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((row.count / maxCount) * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function AuditDetailDrawer({ entry, onClose }: { entry: AdminAuditEntry | null; onClose: () => void }) {
  if (!entry) return null

  const reason = readAuditReason(entry.metadata)
  const metadataJson = stringifyAuditMetadata(entry.metadata)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm">
      <aside
        aria-modal="true"
        role="dialog"
        aria-labelledby="audit-detail-title"
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p id="audit-detail-title" className="text-xl font-black tracking-tight">
              Denetim Detayı
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Gerçek denetim kaydı okunur; hassas teknik detay anahtarları arayüzde maskelenir.
            </p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label="Denetim detayını kapat">
            <X />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">İşlem</p>
              <p className="mt-2 font-black">{displayAction(entry.action)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.action}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Önem</p>
              <div className="mt-2">
                <SeverityBadge severity={entry.severity} />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Kayıt türü</p>
              <p className="mt-2 font-black">{displayEntity(entry.entityType)}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{entry.entityId}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">İşlemi yapan</p>
              <p className="mt-2 font-black">{entry.actorEmail || 'İşlemi yapan yok'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.actorRole || 'Rol yok'} / {entry.source}</p>
            </div>
          </div>

          {reason ? (
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary text-primary-foreground p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">İşlem sebebi</p>
              <p className="mt-2 text-sm font-semibold leading-6">{reason}</p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/35 p-5">
              <p className="font-black">Sebep alanı yok</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Bu kayıt eski bir olay, sistem olayı veya sebep gerektirmeyen operasyon olabilir.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black">Teknik detay</p>
                <p className="mt-1 text-xs text-muted-foreground">Zaman: {formatDate(entry.createdAt)}</p>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                Hassas alanlar maskeli
              </Badge>
            </div>
            <pre className="mt-4 max-h-[46vh] overflow-auto rounded-2xl bg-primary p-4 text-xs leading-5 text-primary-foreground">
              {metadataJson}
            </pre>
          </div>
        </div>
      </aside>
    </div>
  )
}

function AuditEntryRow({ entry, onSelect }: { entry: AdminAuditEntry; onSelect: (entry: AdminAuditEntry) => void }) {
  const reason = readAuditReason(entry.metadata)

  return (
    <tr className="border-b border-border/70 align-top last:border-0">
      <td className="py-4 pr-4">
        <div className="min-w-[240px]">
          <p className="font-black">{displayAction(entry.action)}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{entry.action}</p>
          <div className="mt-2">
            <SeverityBadge severity={entry.severity} />
          </div>
        </div>
      </td>
      <td className="py-4 pr-4">
        <p className="font-black">{displayEntity(entry.entityType)}</p>
        <p className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">{entry.entityId}</p>
      </td>
      <td className="py-4 pr-4">
        <p className="font-black">{entry.actorEmail || 'İşlemi yapan yok'}</p>
        <p className="mt-1 text-xs text-muted-foreground">{entry.actorRole || 'Rol yok'}</p>
      </td>
      <td className="py-4 pr-4">
        <Badge variant="outline" className="rounded-full px-3 py-1">
          {entry.source}
        </Badge>
      </td>
      <td className="py-4 pr-4">
        {reason ? (
          <div className="mb-2 rounded-xl border border-primary/15 bg-secondary px-3 py-2 text-xs font-semibold">
            Sebep: {reason}
          </div>
        ) : null}
        <p className="max-w-[360px] text-xs leading-5 text-muted-foreground">{entry.metadataPreview}</p>
      </td>
      <td className="py-4 pr-4 text-xs font-medium text-muted-foreground">{formatDate(entry.createdAt)}</td>
      <td className="py-4 pr-4">
        <Button type="button" size="sm" variant="outline" onClick={() => onSelect(entry)}>
          Detay
        </Button>
      </td>
    </tr>
  )
}

export function AuditLogPage() {
  const [snapshot, setSnapshot] = useState<AdminAuditSnapshot>(() => buildEmptySnapshot())
  const [filters, setFilters] = useState<AuditFilterState>(() => defaultFilters)
  const [isLoading, setIsLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [operationLog, setOperationLog] = useState<string[]>(['Canlı denetim özeti bekleniyor.'])
  const [selectedEntry, setSelectedEntry] = useState<AdminAuditEntry | null>(null)

  const pushLog = useCallback((message: string) => {
    setOperationLog((current) => [`${new Date().toLocaleTimeString('tr-TR')} - ${message}`, ...current].slice(0, 6))
  }, [])

  const loadAudit = useCallback(async (nextFilters: AuditFilterState, message?: string) => {
    setIsLoading(true)
    setDataError(null)

    try {
      const nextSnapshot = await platformApi.getAuditSnapshot(toApiFilters(nextFilters))
      setSnapshot(nextSnapshot)
      setSelectedEntry(null)
      if (message) pushLog(message)
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Canlı denetim verisi alınamadı.')
      setSnapshot(buildEmptySnapshot())
    } finally {
      setIsLoading(false)
    }
  }, [pushLog])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAudit(defaultFilters, 'Canlı Supabase denetim özeti yüklendi.')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAudit])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void loadAudit(filters, 'Denetim filtreleri canlı veriye uygulandı.')
  }

  function resetFilters() {
    setFilters(defaultFilters)
    void loadAudit(defaultFilters, 'Denetim filtreleri temizlendi.')
  }

  const criticalEntries = useMemo(
    () => snapshot.entries.filter((entry) => entry.severity === 'CRITICAL').slice(0, 5),
    [snapshot.entries],
  )

  const stats = [
    {
      label: 'Yüklenen olay',
      value: formatNumber(snapshot.stats.loadedEvents),
      detail: 'Son canlı denetim penceresi',
      icon: <FileClock />,
      tone: 'dark' as const,
    },
    {
      label: 'Kritik olay',
      value: formatNumber(snapshot.stats.criticalEvents),
      detail: 'Silme, reject, blok ve slug rotasyonu',
      icon: <AlertTriangle />,
      tone: snapshot.stats.criticalEvents > 0 ? ('risk' as const) : ('default' as const),
    },
    {
      label: 'Admin işlemi',
      value: formatNumber(snapshot.stats.adminEvents),
      detail: 'Yetki, abonelik, bildirim ve moderasyon',
      icon: <UserRound />,
    },
    {
      label: 'İşlemi yapan yok',
      value: formatNumber(snapshot.stats.anonymousActorEvents),
      detail: 'Sistem veya anonim kaynaklı olay',
      icon: <Eye />,
    },
  ]

  return (
    <>
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <AuditStatCard key={stat.label} {...stat} />
        ))}
      </section>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-secondary/40">
        <CardHeader className="border-b border-border pb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                <ShieldCheck />
                Denetim veri politikası
              </CardTitle>
              <CardDescription className="mt-2 max-w-4xl leading-6">
                {snapshot.notes.retention} {snapshot.notes.dataPolicy} {snapshot.notes.security}
              </CardDescription>
            </div>
            <Button type="button" onClick={() => void loadAudit(filters, 'Denetim özeti manuel yenilendi.')} disabled={isLoading}>
              <RefreshCw className={cn(isLoading && 'animate-spin')} />
              Yenile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <Database className="size-4" />
              Kaynak tablo
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Canlı Supabase denetim kayıtları</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <CalendarClock className="size-4" />
              Son olay
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{formatDate(snapshot.stats.latestEventAt)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <Filter className="size-4" />
              Filtre limiti
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Her istek en fazla 500 gerçek denetim kaydı okur.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border pb-5">
          <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
            <Search />
            Denetim filtresi
          </CardTitle>
          <CardDescription>İşlem, kayıt türü, kaynak, işlemi yapan kişi veya tarih aralığına göre canlı denetim kaydı okuması.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={applyFilters} className="grid gap-3 lg:grid-cols-6">
            <Input
              className="lg:col-span-2"
              placeholder="İşlem, yapan kişi veya kayıt türü ara"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.action}
              onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
            >
              <option value="">Tüm işlemler</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {displayAction(action)}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.entityType}
              onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value }))}
            >
              <option value="">Tüm kayıt türleri</option>
              {entityOptions.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {displayEntity(entityType)}
                </option>
              ))}
            </select>
            <Input
              placeholder="Kaynak: admin, web..."
              value={filters.source}
              onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3 lg:col-span-6 xl:col-span-1">
              <Input
                type="date"
                value={filters.from}
                onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
              />
              <Input
                type="date"
                value={filters.to}
                onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
              />
            </div>
            <div className="flex gap-2 lg:col-span-6">
              <Button type="submit" disabled={isLoading}>
                <Filter />
                Filtrele
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters} disabled={isLoading}>
                Temizle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {dataError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-0">
            <p className="font-black text-destructive">Canlı denetim verisi alınamadı</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{dataError}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border pb-5">
            <CardTitle className="text-xl font-black tracking-tight">Canlı denetim kayıtları</CardTitle>
            <CardDescription>Servis anahtarı frontend’e çıkmadan korumalı admin API üzerinden okunur.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {snapshot.entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm font-medium text-muted-foreground">
                Filtreye uygun canlı denetim kaydı bulunmadı. Sahte satır gösterilmiyor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="pb-4 font-black">İşlem</th>
                      <th className="pb-4 font-black">Kayıt Türü</th>
                      <th className="pb-4 font-black">İşlemi Yapan</th>
                      <th className="pb-4 font-black">Kaynak</th>
                      <th className="pb-4 font-black">Teknik Detay</th>
                      <th className="pb-4 font-black">Zaman</th>
                      <th className="pb-4 font-black">Detay</th>
                    </tr>
                  </thead>
                  <tbody>{snapshot.entries.map((entry) => <AuditEntryRow key={entry.id} entry={entry} onSelect={setSelectedEntry} />)}</tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="text-lg font-black tracking-tight">Kritik olaylar</CardTitle>
              <CardDescription>İlk bakılması gereken yüksek riskli denetim kayıtları.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {criticalEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm font-medium text-muted-foreground">
                  Kritik canlı denetim olayı yok.
                </div>
              ) : (
                criticalEntries.map((entry) => (
                  <div key={`critical-${entry.id}`} className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{displayAction(entry.action)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{entry.actorEmail || entry.source}</p>
                      </div>
                      <SeverityBadge severity={entry.severity} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">{entry.metadataPreview}</p>
                    <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setSelectedEntry(entry)}>
                      Detay aç
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <SummaryList title="İşlem kırılımı" rows={snapshot.summaries.actions} />
          <SummaryList title="Kaynak kırılımı" rows={snapshot.summaries.sources} />

          <Card>
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="text-lg font-black tracking-tight">İşlem geçmişi</CardTitle>
              <CardDescription>Bu ekranda yapılan yükleme ve filtre işlemleri.</CardDescription>
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
    <AuditDetailDrawer entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </>
  )
}
