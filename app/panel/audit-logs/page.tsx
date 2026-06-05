'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  ShieldCheck,
  Filter,
  RefreshCcw,
  CalendarDays,
  UserRound,
  Database,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import type { PanelAuditAction, PanelAuditEntityType, PanelAuditLog } from '@/lib/panel-types'
import { cn } from '@/lib/utils'

type AuditFilters = {
  search: string
  action: 'all' | PanelAuditAction
  entityType: 'all' | PanelAuditEntityType
  source: string
  from: string
  to: string
}

const defaultFilters: AuditFilters = {
  search: '',
  action: 'all',
  entityType: 'all',
  source: 'all',
  from: '',
  to: '',
}

const actionLabelMap: Record<PanelAuditAction, string> = {
  vehicle_create: 'Araç Oluşturma',
  vehicle_delete: 'Araç Silme',
  vehicle_update: 'Araç Güncelleme',
  lead_status_change: 'Müşteri Talebi Durum Güncelleme',
  lead_note_add: 'Müşteri Talebi Not Ekleme',
  contact_form_submit: 'İletişim Formu',
  contact_form_blocked: 'İletişim Engelleme',
  public_vehicle_cta_click: 'Herkese Açık Araç Butonu',
  public_showroom_cta_click: 'Herkese Açık Galeri Butonu',
  image_upload: 'Görsel Yükleme',
  image_delete: 'Görsel Silme',
  image_reject: 'Görsel Reddetme',
  landing_cta_impression: 'Ana Sayfa Buton Gösterimi',
  landing_cta_click: 'Ana Sayfa Buton Tıklama',
  landing_cta_config_update: 'Ana Sayfa Buton Ayar Güncelleme',
  public_slug_rotation: 'Herkese Açık Link Yenileme',
  admin_user_delete: 'Admin Kullanıcı Silme',
  admin_user_authorization_update: 'Admin Yetki Güncelleme',
  admin_user_status_update: 'Admin Kullanıcı Durum Güncelleme',
  admin_user_email_verify: 'Admin E-posta Doğrulama',
  admin_user_password_reset: 'Admin Şifre Sıfırlama',
  admin_moderation_action: 'Admin Moderasyon İşlemi',
  admin_subscription_update: 'Admin Abonelik Güncelleme',
  admin_notification_send: 'Admin Bildirim Talebi',
  admin_account_create: 'Admin Hesabı Oluşturma',
  admin_account_update: 'Admin Hesabı Güncelleme',
  admin_account_status_update: 'Admin Hesabı Durum Güncelleme',
  admin_account_password_reset: 'Admin Hesabı Şifre Sıfırlama',
  admin_account_soft_delete: 'Admin Hesabı Geri Alınabilir Silme',
  admin_account_login: 'Admin Hesabı Giriş',
}

const actionBadgeMap: Record<PanelAuditAction, string> = {
  vehicle_create: 'bg-green-500/10 text-green-700 border-green-500/30',
  vehicle_delete: 'bg-red-500/10 text-red-700 border-red-500/30',
  vehicle_update: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  lead_status_change: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30',
  lead_note_add: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  contact_form_submit: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  contact_form_blocked: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  public_vehicle_cta_click: 'bg-teal-500/10 text-teal-700 border-teal-500/30',
  public_showroom_cta_click: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
  image_upload: 'bg-lime-500/10 text-lime-700 border-lime-500/30',
  image_delete: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
  image_reject: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  landing_cta_impression: 'bg-sky-500/10 text-sky-700 border-sky-500/30',
  landing_cta_click: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
  landing_cta_config_update: 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30',
  public_slug_rotation: 'bg-slate-500/10 text-slate-700 border-slate-500/30',
  admin_user_delete: 'bg-red-500/10 text-red-700 border-red-500/30',
  admin_user_authorization_update: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  admin_user_status_update: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/30',
  admin_user_email_verify: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  admin_user_password_reset: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  admin_moderation_action: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  admin_subscription_update: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  admin_notification_send: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  admin_account_create: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  admin_account_update: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  admin_account_status_update: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/30',
  admin_account_password_reset: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
  admin_account_soft_delete: 'bg-red-500/10 text-red-700 border-red-500/30',
  admin_account_login: 'bg-green-500/10 text-green-700 border-green-500/30',
}

const entityLabelMap: Record<PanelAuditEntityType, string> = {
  vehicle: 'Araç',
  lead: 'Müşteri Talebi',
  contact: 'İletişim',
  system: 'Sistem',
  marketing: 'Pazarlama',
  user: 'Kullanıcı',
  subscription: 'Abonelik',
  notification: 'Bildirim',
  moderation: 'Moderasyon',
  admin_account: 'Admin Hesabı',
}

function formatAuditSourceLabel(source: string) {
  if (source.toLowerCase() === 'supabase') return 'Canlı Supabase'
  if (source.toLowerCase() === 'server') return 'Sunucu'
  if (source.toLowerCase() === 'panel') return 'Panel'
  return source
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilters>(defaultFilters)
  const [logs, setLogs] = useState<PanelAuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sourceType, setSourceType] = useState<'supabase' | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.search.trim()) params.set('search', filters.search.trim())
    if (filters.action !== 'all') params.set('action', filters.action)
    if (filters.entityType !== 'all') params.set('entityType', filters.entityType)
    if (filters.source !== 'all') params.set('source', filters.source)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    params.set('limit', '200')
    return params.toString()
  }, [filters])

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/panel/audit-logs?${queryString}`, { cache: 'no-store' })
      const data = (await response.json()) as {
        ok?: boolean
        message?: string
        source?: 'supabase'
        items?: PanelAuditLog[]
      }

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message ?? 'Denetim kayıtları alınamadı.')
        return
      }

      setLogs(data.items || [])
      setSourceType(data.source || null)
    } catch {
      setErrorMessage('Ağ hatası nedeniyle denetim kayıtları alınamadı.')
    } finally {
      setIsLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchLogs()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [fetchLogs])

  const distinctSources = useMemo(() => {
    const set = new Set<string>()
    for (const log of logs) {
      if (log.source) set.add(log.source)
    }
    return Array.from(set).sort()
  }, [logs])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Denetim Kayıtları</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kritik işlemlerin güvenlik kaydı ve filtrelenebilir denetim geçmişi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sourceType && (
            <Badge
              variant="outline"
              className={cn('border-green-500/40 bg-green-500/10 text-green-700')}
            >
              Canlı Supabase
            </Badge>
          )}
          <Button variant="outline" onClick={() => void fetchLogs()} disabled={isLoading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
        </div>
      </div>

      <Card className="p-4 border-border/60">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="İşlem, yapan kişi veya kayıt ara..."
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="pl-9"
            />
          </div>

          <Select
            value={filters.action}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, action: value as AuditFilters['action'] }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="İşlem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm İşlemler</SelectItem>
              {Object.entries(actionLabelMap).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.entityType}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, entityType: value as AuditFilters['entityType'] }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Kayıt Türü" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Varlıklar</SelectItem>
              <SelectItem value="vehicle">Araç</SelectItem>
              <SelectItem value="lead">Müşteri Talebi</SelectItem>
              <SelectItem value="contact">İletişim</SelectItem>
              <SelectItem value="system">Sistem</SelectItem>
              <SelectItem value="marketing">Pazarlama</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.source}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, source: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Kaynak" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kaynaklar</SelectItem>
              {distinctSources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 md:col-span-2">
            <Input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
            <Input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
            <Button variant="ghost" onClick={() => setFilters(defaultFilters)}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <Card className="overflow-hidden border-border/60">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Denetim kayıtları yükleniyor...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">Seçili filtrelere uygun kayıt bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Kayıt Türü</TableHead>
                  <TableHead>İşlemi Yapan</TableHead>
                  <TableHead>Kaynak</TableHead>
                  <TableHead>Detay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(log.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('font-normal', actionBadgeMap[log.action])}>
                        {actionLabelMap[log.action]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium text-foreground">{entityLabelMap[log.entityType]}</p>
                        <p className="text-xs text-muted-foreground">{log.entityId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="inline-flex items-center gap-1 text-foreground">
                          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                          {log.actorEmail || 'Sistem'}
                        </p>
                        <p className="text-xs text-muted-foreground">{log.actorRole || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Database className="h-3.5 w-3.5" />
                        {formatAuditSourceLabel(log.source)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <details>
                        <summary className="cursor-pointer text-xs text-accent hover:text-accent/80">Teknik Detay</summary>
                        <pre className="mt-2 max-w-[320px] overflow-auto rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
