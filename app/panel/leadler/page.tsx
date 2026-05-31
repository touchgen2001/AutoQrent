'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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
  Clock,
  Plus,
  ChevronRight,
  FileText
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  mockLeads, 
  formatDateTime,
  getLeadStatusLabel,
  getLeadSourceLabel
} from '@/lib/mock-data'
import { LeadStatusBadge, LeadSourceBadge } from '@/components/shared/status-badges'
import { EmptyLeads } from '@/components/shared/empty-state'
import { LeadListSkeleton } from '@/components/shared/loading-skeleton'
import type { Lead } from '@/lib/mock-data'

export default function LeadsPage() {
  const [leads] = useState<Lead[]>(mockLeads)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isLoading] = useState(false)
  const [newNote, setNewNote] = useState('')

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          lead.customerName.toLowerCase().includes(query) ||
          lead.customerPhone.includes(query) ||
          lead.vehicleTitle?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false

      // Source filter
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false

      return true
    })
  }, [leads, searchQuery, statusFilter, sourceFilter])

  // Stats
  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === 'yeni').length,
    inProgress: leads.filter(l => ['arandi', 'gorusuluyor', 'test-surusu'].includes(l.status)).length,
    converted: leads.filter(l => l.status === 'satisa-dondu').length
  }), [leads])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSourceFilter('all')
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || sourceFilter !== 'all'

  const handleAddNote = () => {
    if (!newNote.trim() || !selectedLead) return
    // Mock action - would save to backend
    console.log('[v0] Adding note:', newNote, 'to lead:', selectedLead.id)
    setNewNote('')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Leadler</h1>
        </div>
        <LeadListSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leadler</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Müşteri ilgilerini yönetin ve takip edin
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border/50">
          <p className="text-sm text-muted-foreground">Toplam Lead</p>
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

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Lead ara... (isim, telefon, araç)"
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
                <SelectItem value="showroom">Showroom</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="telefon">Telefon</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="test-surusu">Test Sürüşü</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Leads Table */}
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
                  <TableHead className="text-muted-foreground text-right">Aksiyonlar</TableHead>
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
                          <span className="text-sm text-foreground truncate max-w-[200px]">
                            {lead.vehicleTitle}
                          </span>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`https://wa.me/${lead.customerPhone.replace(/[^0-9]/g, '')}`, '_blank')
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
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
                            <DropdownMenuItem>
                              <Calendar className="h-4 w-4 mr-2" />
                              Takip Tarihi Ekle
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-green-600">
                              Satışa Döndü
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
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

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Detayı</DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6">
              {/* Customer Info */}
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
                    onClick={() => window.open(`https://wa.me/${selectedLead.customerPhone.replace(/[^0-9]/g, '')}`, '_blank')}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Status & Source */}
              <div className="flex items-center gap-3">
                <LeadStatusBadge status={selectedLead.status} />
                <LeadSourceBadge source={selectedLead.source} />
              </div>

              {/* Vehicle */}
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

              {/* Dates */}
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

              {/* Notes */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Notlar</p>
                {selectedLead.notes.length > 0 ? (
                  <div className="space-y-2">
                    {selectedLead.notes.map((note, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg border border-border text-sm">
                        {note}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Henüz not eklenmemiş</p>
                )}
              </div>

              {/* Add Note */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Not ekle..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button 
                  size="sm" 
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Not Ekle
                </Button>
              </div>

              {/* Update Status */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Durumu Güncelle</p>
                <Select defaultValue={selectedLead.status}>
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
