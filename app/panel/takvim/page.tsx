'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, Plus, RefreshCcw, RotateCcw, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { PanelCustomerTask, PanelLead } from '@/lib/panel-types'

const emptyForm = {
  type: 'appointment' as PanelCustomerTask['type'],
  title: '',
  date: '',
  time: '10:00',
  customerName: '',
  customerPhone: '',
  leadId: '',
  vehicleId: '',
  vehicleTitle: '',
  note: '',
}

function formatTaskDate(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TaskList({
  items,
  empty,
  onUpdateStatus,
}: {
  items: PanelCustomerTask[]
  empty: string
  onUpdateStatus: (id: string, status: PanelCustomerTask['status']) => void
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <div className="space-y-3">
      {items.map((task) => (
        <div key={task.id} className="rounded-xl border border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={task.type === 'appointment' ? 'default' : 'secondary'}>
                  {task.type === 'appointment' ? 'Randevu' : 'Satış Sonrası'}
                </Badge>
                <p className="font-semibold">{task.title}</p>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4" /> {formatTaskDate(task.scheduledAt)}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" /> {task.customerName} · {task.customerPhone}
              </p>
              {task.vehicleTitle && <p className="mt-1 text-sm text-muted-foreground">{task.vehicleTitle}</p>}
              {task.note && <p className="mt-2 text-sm">{task.note}</p>}
            </div>
            <div className="flex gap-2">
              {task.status !== 'completed' && (
                <Button size="sm" variant="outline" onClick={() => onUpdateStatus(task.id, 'completed')}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Tamamla
                </Button>
              )}
              {task.status === 'completed' && (
                <Button size="sm" variant="outline" onClick={() => onUpdateStatus(task.id, 'open')}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Yeniden Aç
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<PanelCustomerTask[]>([])
  const [leads, setLeads] = useState<PanelLead[]>([])
  const [refreshedAt, setRefreshedAt] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const [tasksResponse, leadsResponse] = await Promise.all([
        fetch('/api/panel/tasks', { cache: 'no-store' }),
        fetch('/api/panel/leads', { cache: 'no-store' }),
      ])
      const tasksData = (await tasksResponse.json()) as { ok?: boolean; items?: PanelCustomerTask[]; message?: string }
      const leadsData = (await leadsResponse.json()) as { ok?: boolean; items?: PanelLead[] }
      if (!tasksResponse.ok || !tasksData.ok) {
        setMessage(tasksData.message || 'Takvim kayıtları alınamadı.')
        return
      }
      setTasks(tasksData.items || [])
      setLeads(leadsResponse.ok && leadsData.ok ? leadsData.items || [] : [])
      setRefreshedAt(Date.now())
    } catch {
      setMessage('Ağ hatası nedeniyle takvim kayıtları alınamadı.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const leadId = params.get('leadId')
    const type = params.get('type')
    if (!leadId) return
    const lead = leads.find((item) => item.id === leadId)
    if (!lead) return
    const timer = window.setTimeout(() => {
      setForm((current) => ({
        ...current,
        type: type === 'post_sale' ? 'post_sale' : 'appointment',
        title: type === 'post_sale' ? 'Satış sonrası müşteri takibi' : 'Test sürüşü randevusu',
        leadId: lead.id,
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        vehicleId: lead.vehicleId || '',
        vehicleTitle: lead.vehicleTitle || '',
      }))
      setIsOpen(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [leads])

  const groups = useMemo(() => {
    const open = tasks.filter((task) => task.status === 'open')
    return {
      overdue: open.filter((task) => Date.parse(task.scheduledAt) < refreshedAt),
      upcoming: open.filter((task) => Date.parse(task.scheduledAt) >= refreshedAt),
      completed: tasks.filter((task) => task.status === 'completed'),
    }
  }, [refreshedAt, tasks])

  const selectLead = (leadId: string) => {
    const lead = leads.find((item) => item.id === leadId)
    setForm((current) => ({
      ...current,
      leadId,
      customerName: lead?.customerName || current.customerName,
      customerPhone: lead?.customerPhone || current.customerPhone,
      vehicleId: lead?.vehicleId || '',
      vehicleTitle: lead?.vehicleTitle || '',
    }))
  }

  const createTask = async () => {
    if (!form.title.trim() || !form.date || !form.time || !form.customerName.trim() || !form.customerPhone.trim()) {
      setMessage('Başlık, tarih, saat ve müşteri bilgilerini tamamlayın.')
      return
    }
    setIsSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/panel/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          scheduledAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          leadId: form.leadId || undefined,
          vehicleId: form.vehicleId || undefined,
          vehicleTitle: form.vehicleTitle || undefined,
          note: form.note || undefined,
        }),
      })
      const data = (await response.json()) as { ok?: boolean; message?: string }
      if (!response.ok || !data.ok) {
        setMessage(data.message || 'Takip kaydı oluşturulamadı.')
        return
      }
      setForm(emptyForm)
      setIsOpen(false)
      await refresh()
    } catch {
      setMessage('Ağ hatası nedeniyle takip kaydı oluşturulamadı.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateStatus = async (id: string, status: PanelCustomerTask['status']) => {
    const response = await fetch('/api/panel/tasks', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (response.ok) await refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Takvim & Takip</h1>
          <p className="mt-1 text-sm text-muted-foreground">Test sürüşü randevularını ve satış sonrası müşteri takiplerini yönetin.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refresh()}><RefreshCcw className="mr-2 h-4 w-4" />Yenile</Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Yeni Kayıt</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Randevu veya Takip Oluştur</DialogTitle>
                <DialogDescription>Müşteriyle yapılacak sonraki işlemi planlayın.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Tür</Label>
                  <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as PanelCustomerTask['type'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="appointment">Test Sürüşü / Randevu</SelectItem><SelectItem value="post_sale">Satış Sonrası Takip</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Müşteri Talebinden Seç</Label>
                  <Select value={form.leadId || '__none__'} onValueChange={(value) => selectLead(value === '__none__' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Opsiyonel" /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">Elle gir</SelectItem>{leads.map((lead) => <SelectItem key={lead.id} value={lead.id}>{lead.customerName} · {lead.vehicleTitle || 'Genel'}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2"><Label>Başlık</Label><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Örn: BMW 320i test sürüşü" /></div>
                <div className="space-y-2"><Label>Tarih</Label><Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Saat</Label><Input type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Müşteri</Label><Input value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Telefon</Label><Input value={form.customerPhone} onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Not</Label><Textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} /></div>
                <Button className="sm:col-span-2" disabled={isSaving} onClick={() => void createTask()}>{isSaving ? 'Kaydediliyor...' : 'Takvime Ekle'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {message && <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{message}</p>}
      {isLoading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Takvim yükleniyor...</CardContent></Card> : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-red-600">Gecikenler ({groups.overdue.length})</CardTitle><CardDescription>Tarihi geçmiş açık işlemler</CardDescription></CardHeader><CardContent><TaskList items={groups.overdue} empty="Geciken işlem yok." onUpdateStatus={(id, status) => void updateStatus(id, status)} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-accent" />Yaklaşanlar ({groups.upcoming.length})</CardTitle><CardDescription>Planlanan randevu ve takipler</CardDescription></CardHeader><CardContent><TaskList items={groups.upcoming} empty="Yaklaşan işlem yok." onUpdateStatus={(id, status) => void updateStatus(id, status)} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-emerald-600">Tamamlananlar ({groups.completed.length})</CardTitle><CardDescription>Sonuçlandırılan işlemler</CardDescription></CardHeader><CardContent><TaskList items={groups.completed.slice(0, 20)} empty="Tamamlanan işlem yok." onUpdateStatus={(id, status) => void updateStatus(id, status)} /></CardContent></Card>
        </div>
      )}
    </div>
  )
}
