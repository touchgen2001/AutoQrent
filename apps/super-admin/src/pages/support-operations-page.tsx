import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Archive,
  CheckCircle2,
  Clock3,
  Database,
  Flag,
  Megaphone,
  PauseCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  Ticket,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth'
import { platformApi } from '@/lib/platform-api'
import {
  broadcastTargetLabels,
  broadcastTargets,
  moderationActionStatuses,
  moderationKindLabels,
  moderationKinds,
  moderationStatusLabels,
  priorityLabels,
  ticketStatusLabels,
  ticketStatuses,
  type AdminOperationsSnapshot,
  type BroadcastInput,
  type BroadcastRecord,
  type BroadcastTarget,
  type ModerationActionStatus,
  type ModerationKind,
  type ModerationReport,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/platform-operations-types'
import { hasPermission } from '@/lib/rbac'

const statusIcons: Record<TicketStatus, typeof Ticket> = {
  OPEN: Ticket,
  PENDING: Clock3,
  SOLVED: CheckCircle2,
  CLOSED: Archive,
}

const priorityVariant: Record<TicketPriority, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOW: 'outline',
  MEDIUM: 'secondary',
  HIGH: 'default',
  URGENT: 'destructive',
}

const moderationActionCopy: Record<ModerationActionStatus, string> = {
  WARNED: 'Uyarı talebini kaydet',
  SUSPENDED: 'Askıya alma talebini kaydet',
  CONTENT_REMOVED: 'İçerik kaldırma talebini kaydet',
  DISMISSED: 'Reddedildi olarak kaydet',
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value: string | null | undefined) {
  if (!value) return 'Tarih yok'
  return dateFormatter.format(new Date(value))
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant={priorityVariant[priority]} className="rounded-full px-3 py-1">
      {priorityLabels[priority]}
    </Badge>
  )
}

function StatCard({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <Card>
      <CardContent className="pt-0">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function buildEmptySnapshot(): AdminOperationsSnapshot {
  return {
    generatedAt: new Date(0).toISOString(),
    source: 'supabase',
    supportSource: {
      connected: false,
      tableName: 'support_tickets',
      message: 'Canlı operasyon verisi henüz yüklenmedi.',
    },
    tickets: [],
    moderationReports: [],
    broadcasts: [],
    notifications: [],
    stats: {
      openTickets: 0,
      pendingTickets: 0,
      highPriorityTickets: 0,
      newModerationReports: 0,
      recentBroadcasts: 0,
      auditEvents: 0,
    },
    notes: {
      support: 'Destek kaynağı bekleniyor.',
      moderation: 'Moderasyon kaynağı bekleniyor.',
      broadcast: 'Bildirim kaynağı bekleniyor.',
    },
  }
}

export function SupportOperationsPage() {
  const { session } = useAuth()
  const canManage = hasPermission(session!.user.role, 'support:manage')
  const [snapshot, setSnapshot] = useState<AdminOperationsSnapshot>(() => buildEmptySnapshot())
  const [isLoading, setIsLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [ticketSearch, setTicketSearch] = useState('')
  const [moderationFilter, setModerationFilter] = useState<ModerationKind | 'ALL'>('ALL')
  const [busyReportId, setBusyReportId] = useState<string | null>(null)
  const [operationLog, setOperationLog] = useState<string[]>(['Canlı operasyon özeti bekleniyor.'])
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([])
  const [broadcastForm, setBroadcastForm] = useState<BroadcastInput>({
    target: 'ALL_TENANTS',
    subject: '',
    body: '',
    channels: {
      email: true,
      sms: false,
      panel: false,
      push: false,
    },
  })

  const pushLog = useCallback((message: string) => {
    setOperationLog((current) => [`${new Date().toLocaleTimeString('tr-TR')} - ${message}`, ...current].slice(0, 8))
  }, [])

  const loadOperations = useCallback(async (message?: string) => {
    setIsLoading(true)
    setDataError(null)

    try {
      const nextSnapshot = await platformApi.getOperationsSnapshot()
      setSnapshot(nextSnapshot)
      setBroadcasts(nextSnapshot.broadcasts)
      if (message) pushLog(message)
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Canlı operasyon verisi alınamadı.')
    } finally {
      setIsLoading(false)
    }
  }, [pushLog])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOperations('Canlı denetim kayıtlarına bağlı operasyon özeti yüklendi.')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadOperations])

  const filteredTickets = useMemo(() => {
    const normalized = ticketSearch.trim().toLowerCase()
    return snapshot.tickets.filter((ticketItem) => {
      if (!normalized) return true
      return (
        ticketItem.id.toLowerCase().includes(normalized) ||
        ticketItem.subject.toLowerCase().includes(normalized) ||
        ticketItem.gallery.toLowerCase().includes(normalized) ||
        ticketItem.requester.toLowerCase().includes(normalized)
      )
    })
  }, [snapshot.tickets, ticketSearch])

  const filteredModerationReports = useMemo(
    () =>
      snapshot.moderationReports.filter((report) => {
        if (moderationFilter === 'ALL') return true
        return report.kind === moderationFilter
      }),
    [moderationFilter, snapshot.moderationReports],
  )

  async function applyModerationAction(report: ModerationReport, status: ModerationActionStatus) {
    if (!canManage) return
    setBusyReportId(report.id)

    try {
      const result = await platformApi.recordModerationAction({
        reportId: report.id,
        status,
        targetGallery: report.targetGallery,
        reason: report.reason,
      })
      pushLog(result.message)
      await loadOperations('Moderasyon işlemi sonrası canlı özet yenilendi.')
    } catch (error) {
      pushLog(error instanceof Error ? error.message : 'Moderasyon işlemi kaydedilemedi.')
    } finally {
      setBusyReportId(null)
    }
  }

  async function sendBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage) return
    if (!broadcastForm.subject.trim() || !broadcastForm.body.trim()) return

    try {
      const result = await platformApi.sendBroadcast({
        ...broadcastForm,
        subject: broadcastForm.subject.trim(),
        body: broadcastForm.body.trim(),
      })
      pushLog(result.message)
      setBroadcastForm((current) => ({ ...current, subject: '', body: '' }))
      await loadOperations('Bildirim talebi sonrası canlı toplu bildirim geçmişi yenilendi.')
    } catch (error) {
      pushLog(error instanceof Error ? error.message : 'Bildirim talebi kaydedilemedi.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Açık talepler" value={snapshot.stats.openTickets} detail="Sadece bağlı destek kaynağından okunur" />
        <StatCard label="Bekleyen talepler" value={snapshot.stats.pendingTickets} detail="Sahte destek talebi gösterilmez" />
        <StatCard label="Yeni moderasyon" value={snapshot.stats.newModerationReports} detail="Canlı denetim risk olayları" />
        <StatCard label="Denetim olayı" value={snapshot.stats.auditEvents} detail="Son canlı operasyon kaydı" />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_430px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border pb-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                  <Ticket />
                  Destek talepleri akışı
                </CardTitle>
                <CardDescription className="mt-2 leading-6">
                  {snapshot.supportSource.message}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={ticketSearch}
                  aria-label="Destek taleplerinde ara"
                  placeholder="Talep, galeri veya talep sahibi ara"
                  className="max-w-sm rounded-xl"
                  onChange={(event) => setTicketSearch(event.target.value)}
                />
                <Button variant="outline" onClick={() => void loadOperations('Operasyon özeti manuel yenilendi.')} disabled={isLoading}>
                  <RefreshCw />
                  Yenile
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 py-5">
            <div className="grid gap-4 xl:grid-cols-4">
              {ticketStatuses.map((status) => {
                const Icon = statusIcons[status]
                const columnTickets = filteredTickets.filter((ticketItem) => ticketItem.status === status)
                return (
                  <div key={status} className="rounded-2xl border border-border bg-secondary/40 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-card text-foreground">
                          <Icon />
                        </span>
                        <div>
                          <p className="text-sm font-black">{ticketStatusLabels[status]}</p>
                          <p className="text-xs text-muted-foreground">{columnTickets.length} talep</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex min-h-[260px] flex-col gap-3">
                      {columnTickets.length === 0 ? (
                        <div className="flex min-h-[220px] items-center rounded-xl border border-dashed border-border bg-card/70 p-4 text-sm text-muted-foreground">
                          {snapshot.supportSource.connected ? 'Bu durumda canlı talep yok.' : 'Destek talebi kaynağı bağlı değil; sahte kayıt gösterilmiyor.'}
                        </div>
                      ) : (
                        columnTickets.map((ticketItem) => (
                          <div key={ticketItem.id} className="rounded-xl border border-border bg-card p-4 text-left shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black text-muted-foreground">{ticketItem.id}</p>
                                <p className="mt-2 text-sm font-bold leading-5 text-foreground">{ticketItem.subject}</p>
                              </div>
                              <PriorityBadge priority={ticketItem.priority} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">{ticketItem.gallery}</Badge>
                              <Badge variant="secondary">{ticketItem.channel}</Badge>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">{formatDate(ticketItem.updatedAt)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database />
              Canlı veri politikası
            </CardTitle>
            <CardDescription>
              Operasyon ekranında doğrulanmamış destek talebi, dosya eki veya müşteri cevabı üretilmez.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border bg-card p-3">{snapshot.notes.support}</div>
            <div className="rounded-xl border border-border bg-card p-3">{snapshot.notes.moderation}</div>
            <div className="rounded-xl border border-border bg-card p-3">{snapshot.notes.broadcast}</div>
            <div className="rounded-xl border border-border bg-card p-3">
              Son güncelleme: {snapshot.generatedAt === new Date(0).toISOString() ? 'Bekleniyor' : formatDate(snapshot.generatedAt)}
            </div>
            {dataError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 font-semibold text-destructive">
                {dataError}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <Card>
          <CardHeader className="border-b border-border pb-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                  <ShieldAlert />
                  Moderasyon kuyruğu
                </CardTitle>
                <CardDescription className="mt-2">
                  Şüpheli galeri, istenmeyen içerik ve kötüye kullanım incelemeleri canlı denetim kayıtlarındaki risk olaylarından türetilir.
                </CardDescription>
              </div>
              <select
                value={moderationFilter}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
                onChange={(event) => setModerationFilter(event.target.value as ModerationKind | 'ALL')}
              >
                <option value="ALL">Tüm rapor türleri</option>
                {moderationKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {moderationKindLabels[kind]}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 lg:grid-cols-3">
            {filteredModerationReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground lg:col-span-3">
                Canlı denetim kayıtları içinde bu filtreye uygun moderasyon riski bulunamadı.
              </div>
            ) : (
              filteredModerationReports.map((report) => (
                <article key={report.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-muted-foreground">{report.id}</p>
                      <h3 className="mt-2 text-base font-black text-foreground">{report.targetGallery}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{moderationKindLabels[report.kind]}</p>
                    </div>
                    <PriorityBadge priority={report.severity} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{report.reason}</p>
                  <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                    Kanıt: <span className="font-semibold text-foreground">{report.evidence}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant={report.status === 'NEW' ? 'default' : 'outline'}>{moderationStatusLabels[report.status]}</Badge>
                    <Badge variant="secondary">{report.reporter}</Badge>
                  </div>
                  {report.history.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-border bg-secondary/35 p-3 text-xs text-muted-foreground">
                      Son işlem: {report.history[0].event} · {formatDate(report.history[0].at)}
                    </div>
                  ) : null}
                  <div className="mt-5 grid gap-2">
                    {moderationActionStatuses.slice(0, 3).map((status) => (
                      <Button
                        key={status}
                        variant={status === 'CONTENT_REMOVED' ? 'destructive' : 'outline'}
                        size="sm"
                        disabled={!canManage || busyReportId === report.id}
                        onClick={() => void applyModerationAction(report, status)}
                      >
                        {status === 'WARNED' ? <Flag /> : status === 'SUSPENDED' ? <PauseCircle /> : <Trash2 />}
                        {moderationActionCopy[status]}
                      </Button>
                    ))}
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone />
              Bildirim merkezi
            </CardTitle>
            <CardDescription>
              Bildirim talepleri canlı denetim kaydına yazılır. Harici e-posta/SMS/uygulama bildirimi sağlayıcısı bağlı değilse teslim edildi denmez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={sendBroadcast}>
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Hedef segment
                <select
                  value={broadcastForm.target}
                  disabled={!canManage}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) =>
                    setBroadcastForm((current) => ({ ...current, target: event.target.value as BroadcastTarget }))
                  }
                >
                  {broadcastTargets.map((target) => (
                    <option key={target} value={target}>
                      {broadcastTargetLabels[target]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Konu
                <Input
                  value={broadcastForm.subject}
                  disabled={!canManage}
                  placeholder="Bakım bilgilendirmesi"
                  onChange={(event) => setBroadcastForm((current) => ({ ...current, subject: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Mesaj
                <Textarea
                  value={broadcastForm.body}
                  disabled={!canManage}
                  placeholder="Galerilere gönderilecek net bildirimi yazın..."
                  onChange={(event) => setBroadcastForm((current) => ({ ...current, body: event.target.value }))}
                />
              </label>
              <div className="grid gap-2">
                <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/35 px-3 py-2 text-sm font-semibold">
                  <span>E-posta talebi</span>
                  <input
                    type="checkbox"
                    checked={broadcastForm.channels.email}
                    disabled={!canManage}
                    onChange={(event) =>
                      setBroadcastForm((current) => ({
                        ...current,
                        channels: { ...current.channels, email: event.target.checked },
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-dashed border-border bg-secondary/20 px-3 py-2 text-sm font-semibold text-muted-foreground">
                  <span>SMS alanı</span>
                  <input type="checkbox" disabled />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-dashed border-border bg-secondary/20 px-3 py-2 text-sm font-semibold text-muted-foreground">
                  <span>Uygulama bildirimi alanı</span>
                  <input type="checkbox" disabled />
                </label>
              </div>
              <Button type="submit" disabled={!canManage || !broadcastForm.subject.trim() || !broadcastForm.body.trim() || !broadcastForm.channels.email}>
                <Send />
                Bildirim talebini denetim kaydına yaz
              </Button>
            </form>

            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold">Canlı bildirim geçmişi</p>
              <div className="flex flex-col gap-2">
                {broadcasts.length === 0 ? (
                  <div className="rounded-xl border border-border bg-secondary/35 p-3 text-sm text-muted-foreground">
                    Canlı denetim kayıtları içinde admin bildirim talebi yok.
                  </div>
                ) : (
                  broadcasts.map((broadcast) => (
                    <div key={broadcast.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold">{broadcast.subject}</p>
                        <Badge variant="outline">Sadece denetim kaydı</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {broadcastTargetLabels[broadcast.target]} · Teslimat sağlayıcısı bağlı değil
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>İşlem kayıtları</CardTitle>
          <CardDescription>Bu ekranda yapılan canlı operasyon işlemleri ve hata mesajları.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {operationLog.map((item) => (
            <div key={item} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      {!canManage ? (
        <div className="rounded-2xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
          Mevcut rol destek operasyonlarını görüntüleyebilir; ancak moderasyon işlemi veya bildirim talebi kaydedemez.
        </div>
      ) : null}
    </div>
  )
}
