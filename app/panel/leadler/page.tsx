'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  SlidersHorizontal,
  X,
  Phone,
  MessageCircle,
  MoreHorizontal,
  Calendar,
  User,
  Car,
  Plus,
  ChevronRight,
  FileText,
  RefreshCcw,
  BellRing,
  CheckCircle2,
  Clock3,
  History,
  CalendarPlus,
  Flame,
  AlertTriangle,
  UserCheck,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDateTime } from '@/lib/vehicle-display'
import { LeadStatusBadge, LeadSourceBadge } from '@/components/shared/status-badges'
import { EmptyLeads } from '@/components/shared/empty-state'
import { LeadListSkeleton } from '@/components/shared/loading-skeleton'
import { LiveDataStatus } from '@/components/shared/live-data-status'
import type { PanelLead, PanelLeadActivity } from '@/lib/panel-types'
import { calculateLeadScore } from '@/lib/lead-score'
import { getLeadLossRisk } from '@/lib/sales-intelligence'
import { getPanelAuthSession } from '@/lib/client/panel-auth'
import {
  buildDefaultPanelTeam,
  buildLeadAssignmentNote,
  countUnassignedOpenLeads,
  getLeadAssignment,
  getPanelRoleDefinition,
  type PanelTeamMember,
} from '@/lib/lead-assignment'

type WhatsappTemplateKey = 'price-info' | 'test-drive' | 'call-back' | 'offer' | 'test-drive-reminder'
type WorkView = 'all' | 'today' | 'overdue' | 'risk' | 'unassigned'

const LIVE_REFRESH_INTERVAL_MS = 30 * 1000

const whatsappTemplates: Array<{ key: WhatsappTemplateKey; label: string }> = [
  { key: 'price-info', label: 'Fiyat Bilgisi Gönder' },
  { key: 'test-drive', label: 'Test Sürüşü Planla' },
  { key: 'test-drive-reminder', label: 'Test Sürüşü Hatırlat' },
  { key: 'offer', label: 'Teklif Mesajı Gönder' },
  { key: 'call-back', label: 'Geri Arama Saatini Sor' },
]

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export default function LeadsPage() {
  const fetchInFlightRef = useRef(false)
  const [leads, setLeads] = useState<PanelLead[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [workView, setWorkView] = useState<WorkView>(() => {
    if (typeof window === 'undefined') return 'all'
    const view = new URLSearchParams(window.location.search).get('view')
    return view === 'today' || view === 'overdue' || view === 'risk' || view === 'unassigned' ? view : 'all'
  })
  const [selectedLead, setSelectedLead] = useState<PanelLead | null>(null)
  const [leadActivity, setLeadActivity] = useState<PanelLeadActivity[]>([])
  const [isActivityLoading, setIsActivityLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')
  const [isUpdatingLeadId, setIsUpdatingLeadId] = useState<string | null>(null)
  const [riskNow, setRiskNow] = useState(0)
  const [sessionOwner, setSessionOwner] = useState<{ name: string; email: string } | null>(null)
  const [liveTeamMembers, setLiveTeamMembers] = useState<PanelTeamMember[]>([])

  useEffect(() => {
    let active = true
    void (async () => {
      const session = await getPanelAuthSession()
      if (!active || !session) return
      setSessionOwner({ name: session.fullName, email: session.email })
      const teamResponse = await fetch('/api/panel/team-members', { cache: 'no-store' }).catch(() => null)
      if (!active || !teamResponse) return
      const teamData = await teamResponse.json().catch(() => null) as {
        ok?: boolean
        members?: Array<PanelTeamMember & { status?: string }>
      } | null
      if (!teamResponse.ok || !teamData?.ok || !teamData.members) return
      setLiveTeamMembers(
        teamData.members
          .filter((member) => member.status !== 'suspended' && member.role !== 'viewer')
          .map((member) => ({
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
          })),
      )
    })()
    return () => {
      active = false
    }
  }, [])

  const teamMembers = useMemo<PanelTeamMember[]>(
    () => liveTeamMembers.length > 0
      ? liveTeamMembers
      : buildDefaultPanelTeam({ name: sessionOwner?.name, email: sessionOwner?.email }),
    [liveTeamMembers, sessionOwner?.email, sessionOwner?.name],
  )

  const fetchLeads = useCallback(async (
    options: { background?: boolean; signal?: AbortSignal } = {},
  ) => {
    if (fetchInFlightRef.current) return

    const isBackgroundRefresh = Boolean(options.background)
    fetchInFlightRef.current = true
    if (isBackgroundRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setErrorMessage(null)

    try {
      const response = await fetch('/api/panel/leads', {
        cache: 'no-store',
        signal: options.signal,
      })
      const data = (await response.json()) as {
        ok?: boolean
        message?: string
        items?: PanelLead[]
      }

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message ?? 'Müşteri talebi listesi alınamadı.')
        return
      }

      const nextLeads = data.items || []
      setLeads(nextLeads)
      setRiskNow(Date.now())
      setSelectedLead((current) => {
        if (!current) return current
        return nextLeads.find((lead) => lead.id === current.id) ?? current
      })
      setLastUpdatedAt(new Date().toISOString())
    } catch (error) {
      if (isAbortError(error)) return
      setErrorMessage('Ağ hatası nedeniyle müşteri talebi listesi alınamadı.')
    } finally {
      fetchInFlightRef.current = false
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
      void fetchLeads({ signal: controller.signal })
    }, 0)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void fetchLeads({ background: true })
    }, LIVE_REFRESH_INTERVAL_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
      window.clearInterval(intervalId)
    }
  }, [fetchLeads])

  const fetchLeadActivity = useCallback(async (leadId: string) => {
    setIsActivityLoading(true)
    try {
      const response = await fetch(`/api/panel/leads/${leadId}/activity`, { cache: 'no-store' })
      const data = (await response.json()) as { ok?: boolean; items?: PanelLeadActivity[] }
      setLeadActivity(response.ok && data.ok ? data.items || [] : [])
    } catch {
      setLeadActivity([])
    } finally {
      setIsActivityLoading(false)
    }
  }, [])

  const selectedLeadId = selectedLead?.id
  useEffect(() => {
    if (!selectedLeadId) return
    const timer = window.setTimeout(() => {
      void fetchLeadActivity(selectedLeadId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchLeadActivity, selectedLeadId])

  const todayKey = useMemo(
    () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date()),
    [],
  )

  const followUpStats = useMemo(() => {
    const openStatuses = new Set<PanelLead['status']>(['yeni', 'arandi', 'gorusuluyor', 'test-surusu'])
    return {
      today: leads.filter((lead) => lead.followUpDate === todayKey && openStatuses.has(lead.status)).length,
      overdue: leads.filter(
        (lead) => Boolean(lead.followUpDate) && (lead.followUpDate as string) < todayKey && openStatuses.has(lead.status),
      ).length,
    }
  }, [leads, todayKey])

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          lead.customerName.toLowerCase().includes(query) ||
          lead.customerPhone.includes(query) ||
          lead.vehicleTitle?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      if (statusFilter !== 'all' && lead.status !== statusFilter) return false
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false
      if (workView === 'today' && lead.followUpDate !== todayKey) return false
      if (workView === 'overdue' && (!lead.followUpDate || lead.followUpDate >= todayKey)) return false
      if (workView === 'risk' && getLeadLossRisk(lead, riskNow).tone !== 'high') return false
      if (workView === 'unassigned' && getLeadAssignment(lead).assigneeName) return false

      return true
    })
  }, [leads, riskNow, searchQuery, statusFilter, sourceFilter, todayKey, workView])

  const stats = useMemo(
    () => ({
      total: leads.length,
      new: leads.filter((l) => l.status === 'yeni').length,
      inProgress: leads.filter((l) => ['arandi', 'gorusuluyor', 'test-surusu'].includes(l.status)).length,
      converted: leads.filter((l) => l.status === 'satisa-dondu').length,
    }),
    [leads],
  )

  const highRiskLeadCount = useMemo(
    () => leads.filter((lead) => getLeadLossRisk(lead, riskNow).tone === 'high').length,
    [leads, riskNow],
  )
  const unassignedLeadCount = useMemo(() => countUnassignedOpenLeads(leads), [leads])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSourceFilter('all')
    setWorkView('all')
    window.history.replaceState(null, '', '/panel/leadler')
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || sourceFilter !== 'all' || workView !== 'all'

  const patchLead = async (
    leadId: string,
    payload: {
      status?: PanelLead['status']
      addNote?: string
      followUpDate?: string | null
    },
  ) => {
    setIsUpdatingLeadId(leadId)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/panel/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as {
        ok?: boolean
        message?: string
        item?: PanelLead
      }

      if (!response.ok || !data.ok || !data.item) {
        setErrorMessage(data.message ?? 'Müşteri talebi güncellenemedi.')
        return null
      }

      const updatedItem = data.item

      setLeads((prev) =>
        prev.map((item) =>
          item.id === leadId
            ? {
                ...item,
                ...updatedItem,
                vehicleTitle: updatedItem.vehicleTitle ?? item.vehicleTitle,
                vehicleId: updatedItem.vehicleId ?? item.vehicleId,
              }
            : item,
        ),
      )
      if (selectedLead?.id === leadId) {
        setSelectedLead({
          ...selectedLead,
          ...updatedItem,
          vehicleTitle: updatedItem.vehicleTitle ?? selectedLead.vehicleTitle,
          vehicleId: updatedItem.vehicleId ?? selectedLead.vehicleId,
        })
      }
      setLastUpdatedAt(new Date().toISOString())
      if (selectedLead?.id === leadId) {
        void fetchLeadActivity(leadId)
      }
      return updatedItem
    } catch {
      setErrorMessage('Ağ hatası nedeniyle müşteri talebi güncellenemedi.')
      return null
    } finally {
      setIsUpdatingLeadId(null)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead) return
    const updated = await patchLead(selectedLead.id, { addNote: newNote.trim() })
    if (updated) {
      setNewNote('')
    }
  }

  const handleLeadStatusChange = async (lead: PanelLead, nextStatus: PanelLead['status']) => {
    await patchLead(lead.id, { status: nextStatus })
  }

  const handleAssignLead = async (lead: PanelLead, member: PanelTeamMember) => {
    await patchLead(lead.id, { addNote: buildLeadAssignmentNote(member) })
  }

  const sanitizePhoneForWhatsApp = (phone: string) => phone.replace(/[^0-9]/g, '')

  const buildWhatsappTemplateMessage = (lead: PanelLead, templateKey: WhatsappTemplateKey) => {
    const customerFirstName = lead.customerName.split(' ')[0] || lead.customerName
    const vehicleText = lead.vehicleTitle || 'ilgili araç'

    if (templateKey === 'price-info') {
      return `Merhaba ${customerFirstName}, ${vehicleText} için güncel fiyat ve ödeme seçeneklerini paylaşabilirim. Uygunsanız hemen detayları ileteyim.`
    }

    if (templateKey === 'test-drive') {
      return `Merhaba ${customerFirstName}, ${vehicleText} için test sürüşü planlayabiliriz. Uygun olduğunuz gün ve saat aralığını paylaşır mısınız?`
    }

    if (templateKey === 'test-drive-reminder') {
      return `Merhaba ${customerFirstName}, ${vehicleText} için planladığımız test sürüşünü hatırlatmak istedim. Uygunluğunuzu teyit eder misiniz?`
    }

    if (templateKey === 'offer') {
      return `Merhaba ${customerFirstName}, ${vehicleText} için size özel teklif bilgilerini paylaşmak istiyorum. Fiyat, ödeme ve teslim detayları için müsait olduğunuzda yazabilirsiniz.`
    }

    return `Merhaba ${customerFirstName}, size kısa bir geri dönüş araması yapmak istiyorum. Uygun olduğunuz saat aralığını yazabilir misiniz?`
  }

  const openWhatsAppConversation = (lead: PanelLead, message?: string, templateKey?: WhatsappTemplateKey) => {
    const phone = sanitizePhoneForWhatsApp(lead.customerPhone)

    if (!phone) {
      setErrorMessage('Bu müşteri talebi için geçerli bir telefon numarası bulunamadı.')
      return
    }

    const messageQuery = message ? `?text=${encodeURIComponent(message)}` : ''
    void fetch(`/api/panel/leads/${lead.id}/interactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channel: 'whatsapp',
        direction: 'outbound',
        templateKey,
        messagePreview: message,
      }),
    }).then(() => {
      if (selectedLead?.id === lead.id) void fetchLeadActivity(lead.id)
    }).catch(() => {})
    window.open(`https://wa.me/${phone}${messageQuery}`, '_blank', 'noopener,noreferrer')
  }

  const handleWhatsappTemplate = (lead: PanelLead, templateKey: WhatsappTemplateKey) => {
    const message = buildWhatsappTemplateMessage(lead, templateKey)
    openWhatsAppConversation(lead, message, templateKey)
  }

  const selectedCustomerLeads = useMemo(() => {
    if (!selectedLead) return []
    const selectedPhone = sanitizePhoneForWhatsApp(selectedLead.customerPhone)
    return leads.filter((lead) => sanitizePhoneForWhatsApp(lead.customerPhone) === selectedPhone)
  }, [leads, selectedLead])

  const selectedLeadRisk = useMemo(() => {
    if (!selectedLead) return null
    return getLeadLossRisk(selectedLead, riskNow)
  }, [riskNow, selectedLead])

  const selectedLeadAssignment = useMemo(() => {
    if (!selectedLead) return null
    return getLeadAssignment(selectedLead)
  }, [selectedLead])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Müşteri Talepleri</h1>
        </div>
        <LeadListSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Müşteri Talepleri</h1>
          <p className="text-sm text-muted-foreground mt-1">Araçlarınız için gelen müşteri taleplerini yönetin ve takip edin</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <LiveDataStatus
            lastUpdatedAt={lastUpdatedAt}
            isRefreshing={isRefreshing}
            intervalSeconds={LIVE_REFRESH_INTERVAL_MS / 1000}
          />
          <Button variant="outline" onClick={() => void fetchLeads()} disabled={isLoading || isRefreshing}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border/50">
          <p className="text-sm text-muted-foreground">Toplam Talep</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-blue-500/5 border-blue-500/20">
          <p className="text-sm text-blue-600">Yeni</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.new}</p>
        </Card>
        <Card className="p-4 bg-purple-500/5 border-purple-500/20">
          <p className="text-sm text-purple-600">Görüşmede</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.inProgress}</p>
        </Card>
        <Card className="p-4 bg-green-500/5 border-green-500/20">
          <p className="text-sm text-green-600">Satışa Döndü</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.converted}</p>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setWorkView(workView === 'today' ? 'all' : 'today')}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            workView === 'today' ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-card hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <BellRing className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-foreground">Bugün aranacak müşteriler</p>
              <p className="text-xs text-muted-foreground">Takip tarihi bugün olan açık talepler</p>
            </div>
          </div>
          <strong className="text-2xl text-amber-600">{followUpStats.today}</strong>
        </button>
        <button
          type="button"
          onClick={() => setWorkView(workView === 'overdue' ? 'all' : 'overdue')}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            workView === 'overdue' ? 'border-red-500 bg-red-500/10' : 'border-border bg-card hover:border-red-500/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-foreground">Gecikmiş takipler</p>
              <p className="text-xs text-muted-foreground">Planlanan tarihi geçmiş açık talepler</p>
            </div>
          </div>
          <strong className="text-2xl text-red-600">{followUpStats.overdue}</strong>
        </button>
        <button
          type="button"
          onClick={() => setWorkView(workView === 'risk' ? 'all' : 'risk')}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            workView === 'risk' ? 'border-red-500 bg-red-500/10' : 'border-border bg-card hover:border-red-500/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-foreground">Kayıp riski yüksek</p>
              <p className="text-xs text-muted-foreground">Temas gecikmiş veya plansız talepler</p>
            </div>
          </div>
          <strong className="text-2xl text-red-600">{highRiskLeadCount}</strong>
        </button>
        <button
          type="button"
          onClick={() => setWorkView(workView === 'unassigned' ? 'all' : 'unassigned')}
          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            workView === 'unassigned' ? 'border-sky-500 bg-sky-500/10' : 'border-border bg-card hover:border-sky-500/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700">
              <UserCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-foreground">Atanmamış lead</p>
              <p className="text-xs text-muted-foreground">Sorumlu bekleyen açık müşteri talepleri</p>
            </div>
          </div>
          <strong className="text-2xl text-sky-700">{unassignedLeadCount}</strong>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Müşteri talebi ara... (isim, telefon, araç)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-accent text-accent-foreground' : ''}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-muted/50 rounded-lg border border-border">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="yeni">Yeni</SelectItem>
                <SelectItem value="arandi">Arandı</SelectItem>
                <SelectItem value="gorusuluyor">Görüşülüyor</SelectItem>
                <SelectItem value="test-surusu">Test Sürüşü</SelectItem>
                <SelectItem value="satisa-dondu">Satışa Döndü</SelectItem>
                <SelectItem value="kayip">Kayıp</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Kaynak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                <SelectItem value="qr">QR Kod</SelectItem>
                <SelectItem value="showroom">Galeri Sayfası</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="telefon">Telefon</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="test-surusu">Test Sürüşü</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {filteredLeads.length > 0 ? (
        <Card className="overflow-hidden border-border/50">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Müşteri</TableHead>
                  <TableHead className="text-muted-foreground">İlgilendiği Araç</TableHead>
                  <TableHead className="text-muted-foreground">Kaynak</TableHead>
                  <TableHead className="text-muted-foreground">Durum</TableHead>
                  <TableHead className="text-muted-foreground">Sorumlu</TableHead>
                  <TableHead className="text-muted-foreground">Tarih</TableHead>
                  <TableHead className="text-muted-foreground text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="border-border cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{lead.customerName}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm text-muted-foreground">{lead.customerPhone}</p>
                            {(() => {
                              const score = calculateLeadScore(lead)
                              const risk = getLeadLossRisk(lead, riskNow)
                              return (
                                <>
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    score.tone === 'hot' ? 'bg-red-500/10 text-red-600' : score.tone === 'warm' ? 'bg-amber-500/10 text-amber-700' : 'bg-sky-500/10 text-sky-700'
                                  }`}>
                                    <Flame className="h-3 w-3" /> {score.label} · {score.score}
                                  </span>
                                  {risk.tone === 'high' && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600">
                                      <AlertTriangle className="h-3 w-3" /> Risk
                                    </span>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.vehicleTitle ? (
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground truncate max-w-[200px]">{lead.vehicleTitle}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <LeadSourceBadge source={lead.source} />
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const assignment = getLeadAssignment(lead)
                        return (
                          <div>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              assignment.tone === 'assigned'
                                ? 'bg-emerald-500/10 text-emerald-700'
                                : assignment.tone === 'recommended'
                                  ? 'bg-amber-500/10 text-amber-700'
                                  : 'bg-muted text-muted-foreground'
                            }`}>
                              <UserCheck className="h-3 w-3" />
                              {assignment.label}
                            </span>
                            {assignment.assigneeRole && (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {getPanelRoleDefinition(assignment.assigneeRole).title}
                              </p>
                            )}
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-foreground">{formatDateTime(lead.createdAt)}</p>
                        {lead.followUpDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            Takip: {new Date(lead.followUpDate).toLocaleDateString('tr-TR')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`tel:${lead.customerPhone.replace(/\s/g, '')}`, '_self')
                          }}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openWhatsAppConversation(lead)}>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              WhatsApp Aç
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {whatsappTemplates.map((template) => (
                              <DropdownMenuItem
                                key={`${lead.id}_${template.key}`}
                                onClick={() => handleWhatsappTemplate(lead, template.key)}
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                {template.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Detayları Gör
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-green-600"
                              disabled={isUpdatingLeadId === lead.id}
                              onClick={() => void handleLeadStatusChange(lead, 'satisa-dondu')}
                            >
                              Satışa Döndü
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              disabled={isUpdatingLeadId === lead.id}
                              onClick={() => void handleLeadStatusChange(lead, 'kayip')}
                            >
                              Kayıp Olarak İşaretle
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 border-border/50">
          <EmptyLeads />
        </Card>
      )}

      <Dialog
        open={!!selectedLead}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLead(null)
            setLeadActivity([])
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Müşteri Talebi Detayı</DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{selectedLead.customerName}</h3>
                  <p className="text-sm text-muted-foreground">{selectedLead.customerPhone}</p>
                  {selectedLead.customerEmail && (
                    <p className="text-sm text-muted-foreground">{selectedLead.customerEmail}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`tel:${selectedLead.customerPhone.replace(/\s/g, '')}`, '_self')}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => openWhatsAppConversation(selectedLead)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        Şablon
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {whatsappTemplates.map((template) => (
                        <DropdownMenuItem
                          key={`modal_${selectedLead.id}_${template.key}`}
                          onClick={() => handleWhatsappTemplate(selectedLead, template.key)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {template.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <LeadStatusBadge status={selectedLead.status} />
                <LeadSourceBadge source={selectedLead.source} />
                {(() => {
                  const score = calculateLeadScore(selectedLead)
                  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${score.tone === 'hot' ? 'bg-red-500/10 text-red-600' : score.tone === 'warm' ? 'bg-amber-500/10 text-amber-700' : 'bg-sky-500/10 text-sky-700'}`}>{score.label} müşteri · {score.score}/100</span>
                })()}
              </div>

              {selectedLeadAssignment && (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <UserCheck className="h-4 w-4 text-accent" />
                        Lead Atama
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Mevcut sorumlu: {selectedLeadAssignment.assigneeName || 'Atanmamış'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {teamMembers.map((member) => (
                        <Button
                          key={member.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUpdatingLeadId === selectedLead.id}
                          onClick={() => void handleAssignLead(selectedLead, member)}
                        >
                          {member.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Atama mevcut veritabanı yapısını bozmadan lead notuna yazılır ve müşteri geçmişinde izlenir.
                  </p>
                </div>
              )}

              {selectedLeadRisk && (
                <div className={`rounded-xl border p-4 ${
                  selectedLeadRisk.tone === 'high'
                    ? 'border-red-500/30 bg-red-500/5'
                    : selectedLeadRisk.tone === 'medium'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-border bg-muted/30'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{selectedLeadRisk.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Risk puanı: {selectedLeadRisk.score}/100</p>
                    </div>
                    <AlertTriangle className={selectedLeadRisk.tone === 'high' ? 'h-5 w-5 text-red-600' : 'h-5 w-5 text-muted-foreground'} />
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {selectedLeadRisk.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Müşteri Kartı / CRM Geçmişi</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-lg bg-background p-2"><p className="text-xs text-muted-foreground">Toplam Talep</p><p className="font-bold">{selectedCustomerLeads.length}</p></div>
                  <div className="rounded-lg bg-background p-2"><p className="text-xs text-muted-foreground">Araç</p><p className="font-bold">{new Set(selectedCustomerLeads.map((lead) => lead.vehicleTitle).filter(Boolean)).size}</p></div>
                  <div className="rounded-lg bg-background p-2"><p className="text-xs text-muted-foreground">Not</p><p className="font-bold">{selectedCustomerLeads.reduce((sum, lead) => sum + lead.notes.length, 0)}</p></div>
                </div>
                <div className="mt-3 space-y-2">
                  {selectedCustomerLeads.slice(0, 4).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2 text-sm">
                      <span className="truncate">{lead.vehicleTitle || 'Genel talep'}</span>
                      <LeadStatusBadge status={lead.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/panel/takvim?leadId=${selectedLead.id}&type=appointment`}>
                    <CalendarPlus className="mr-2 h-4 w-4" /> Randevu Planla
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/panel/takvim?leadId=${selectedLead.id}&type=post_sale`}>
                    <CalendarPlus className="mr-2 h-4 w-4" /> Satış Sonrası Takip
                  </Link>
                </Button>
              </div>

              {selectedLead.vehicleTitle && (
                <div className="p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">İlgilendiği Araç</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-accent" />
                      <span className="font-medium text-foreground">{selectedLead.vehicleTitle}</span>
                    </div>
                    {selectedLead.vehicleId && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/panel/araclar/${selectedLead.vehicleId}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Oluşturulma</p>
                  <p className="font-medium text-foreground">{formatDateTime(selectedLead.createdAt)}</p>
                </div>
                {selectedLead.followUpDate && (
                  <div>
                    <p className="text-muted-foreground">Takip Tarihi</p>
                    <p className="font-medium text-foreground">
                      {new Date(selectedLead.followUpDate).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Takip Tarihi</p>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={selectedLead.followUpDate || ''}
                    onChange={(event) => void patchLead(selectedLead.id, { followUpDate: event.target.value || null })}
                    disabled={isUpdatingLeadId === selectedLead.id}
                  />
                  {selectedLead.followUpDate && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void patchLead(selectedLead.id, { followUpDate: null })}
                      disabled={isUpdatingLeadId === selectedLead.id}
                    >
                      Temizle
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Notlar</p>
                {selectedLead.notes.length > 0 ? (
                  <div className="space-y-2">
                    {selectedLead.notes.map((note, index) => (
                      <div key={`${selectedLead.id}_note_${index}`} className="p-3 bg-muted/50 rounded-lg border border-border text-sm">
                        {note}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Henüz not eklenmemiş</p>
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Not ekle..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  size="sm"
                  onClick={() => void handleAddNote()}
                  disabled={!newNote.trim() || isUpdatingLeadId === selectedLead.id}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Not Ekle
                </Button>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Durumu Güncelle</p>
                <Select
                  value={selectedLead.status}
                  onValueChange={(value) => void handleLeadStatusChange(selectedLead, value as PanelLead['status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yeni">Yeni</SelectItem>
                    <SelectItem value="arandi">Arandı</SelectItem>
                    <SelectItem value="gorusuluyor">Görüşülüyor</SelectItem>
                    <SelectItem value="test-surusu">Test Sürüşü</SelectItem>
                    <SelectItem value="satisa-dondu">Satışa Döndü</SelectItem>
                    <SelectItem value="kayip">Kayıp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <History className="h-4 w-4" />
                  Müşteri Aktivite Zaman Çizelgesi
                </p>
                {isActivityLoading ? (
                  <p className="text-sm text-muted-foreground">Aktiviteler yükleniyor...</p>
                ) : leadActivity.length > 0 ? (
                  <div className="space-y-3 border-l border-border pl-4">
                    {leadActivity.map((activity) => (
                      <div key={activity.id} className="relative">
                        <span className="absolute -left-[21px] top-1 flex h-3 w-3 rounded-full border-2 border-background bg-accent" />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">{activity.description}</p>
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatDateTime(activity.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    Henüz kayıtlı aktivite yok.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
