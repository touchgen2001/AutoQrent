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
import type { PanelLead } from '@/lib/panel-types'

type WhatsappTemplateKey = 'price-info' | 'test-drive' | 'call-back'

const LIVE_REFRESH_INTERVAL_MS = 30 * 1000

const whatsappTemplates: Array<{ key: WhatsappTemplateKey; label: string }> = [
  { key: 'price-info', label: 'Fiyat Bilgisi Gönder' },
  { key: 'test-drive', label: 'Test Sürüşü Planla' },
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
  const [selectedLead, setSelectedLead] = useState<PanelLead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')
  const [isUpdatingLeadId, setIsUpdatingLeadId] = useState<string | null>(null)

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

      return true
    })
  }, [leads, searchQuery, statusFilter, sourceFilter])

  const stats = useMemo(
    () => ({
      total: leads.length,
      new: leads.filter((l) => l.status === 'yeni').length,
      inProgress: leads.filter((l) => ['arandi', 'gorusuluyor', 'test-surusu'].includes(l.status)).length,
      converted: leads.filter((l) => l.status === 'satisa-dondu').length,
    }),
    [leads],
  )

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSourceFilter('all')
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || sourceFilter !== 'all'

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

    return `Merhaba ${customerFirstName}, size kısa bir geri dönüş araması yapmak istiyorum. Uygun olduğunuz saat aralığını yazabilir misiniz?`
  }

  const openWhatsAppConversation = (lead: PanelLead, message?: string) => {
    const phone = sanitizePhoneForWhatsApp(lead.customerPhone)

    if (!phone) {
      setErrorMessage('Bu müşteri talebi için geçerli bir telefon numarası bulunamadı.')
      return
    }

    const messageQuery = message ? `?text=${encodeURIComponent(message)}` : ''
    window.open(`https://wa.me/${phone}${messageQuery}`, '_blank', 'noopener,noreferrer')
  }

  const handleWhatsappTemplate = (lead: PanelLead, templateKey: WhatsappTemplateKey) => {
    const message = buildWhatsappTemplateMessage(lead, templateKey)
    openWhatsAppConversation(lead, message)
  }

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
                          <p className="text-sm text-muted-foreground">{lead.customerPhone}</p>
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

      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
