'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck2, CheckCircle2, RefreshCcw, WalletCards, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type {
  VehicleReservation,
  VehicleReservationPaymentStatus,
  VehicleReservationStatus,
} from '@/lib/server/panel-operations-repository'

const statusLabels: Record<VehicleReservationStatus, string> = {
  pending: 'Onay Bekliyor',
  approved: 'Onaylandı',
  declined: 'Reddedildi',
  cancelled: 'İptal Edildi',
  completed: 'Satış Tamamlandı',
}

const paymentLabels: Record<VehicleReservationPaymentStatus, string> = {
  unpaid: 'Kapora Alınmadı',
  pending: 'Kapora Bekleniyor',
  paid: 'Kapora Alındı',
  refunded: 'Kapora İade Edildi',
}

export default function ReservationsPage() {
  const [items, setItems] = useState<VehicleReservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [depositValues, setDepositValues] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setIsLoading(true)
    const response = await fetch('/api/panel/reservations', { cache: 'no-store' })
    const data = await response.json().catch(() => ({})) as { ok?: boolean; items?: VehicleReservation[]; message?: string }
    if (response.ok && data.ok) {
      setItems(data.items || [])
      setDepositValues(Object.fromEntries((data.items || []).map((item) => [item.id, String(item.depositAmount || '')])))
    } else setMessage(data.message || 'Rezervasyonlar alınamadı.')
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const pendingCount = useMemo(() => items.filter((item) => item.status === 'pending').length, [items])

  const update = async (reservationId: string, changes: Record<string, unknown>) => {
    setUpdatingId(reservationId)
    setMessage(null)
    const response = await fetch('/api/panel/reservations', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reservationId, ...changes }),
    })
    const data = await response.json().catch(() => ({})) as { ok?: boolean; items?: VehicleReservation[]; message?: string }
    if (response.ok && data.ok) {
      setItems(data.items || [])
      setMessage('Rezervasyon güncellendi.')
    } else setMessage(data.message || 'Rezervasyon güncellenemedi.')
    setUpdatingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Online Rezervasyonlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Müşteri rezervasyonlarını, araç durumunu ve kapora kaydını yönetin.</p>
        </div>
        <Button variant="outline" onClick={() => void load()}><RefreshCcw className="mr-2 h-4 w-4" /> Yenile</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5"><CalendarCheck2 className="h-5 w-5 text-accent" /><p className="mt-3 text-2xl font-bold">{pendingCount}</p><p className="text-sm text-muted-foreground">Onay bekleyen talep</p></Card>
        <Card className="p-5"><WalletCards className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-2xl font-bold">{items.filter((item) => item.paymentStatus === 'paid').length}</p><p className="text-sm text-muted-foreground">Kapora kaydı tamamlanan</p></Card>
      </div>
      {message && <p className="rounded-lg border border-border px-4 py-3 text-sm">{message}</p>}
      <div className="grid gap-4">
        {isLoading ? <Card className="p-6 text-sm text-muted-foreground">Yükleniyor...</Card> : items.length === 0 ? <Card className="p-8 text-center text-sm text-muted-foreground">Henüz rezervasyon talebi yok.</Card> : items.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2"><Badge>{statusLabels[item.status]}</Badge><Badge variant="outline">{paymentLabels[item.paymentStatus]}</Badge></div>
                <p className="mt-3 font-semibold">{item.vehicleTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.customerName} · {item.customerPhone}</p>
                {item.note && <p className="mt-2 text-sm">{item.note}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('tr-TR')}</p>
              </div>
              <div className="grid min-w-[300px] gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Rezervasyon durumu</Label>
                  <Select value={item.status} onValueChange={(status) => void update(item.id, { status })} disabled={updatingId === item.id}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Kapora durumu</Label>
                  <Select value={item.paymentStatus} onValueChange={(paymentStatus) => void update(item.id, { paymentStatus })} disabled={updatingId === item.id}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(paymentLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Kapora tutarı</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="0" value={depositValues[item.id] || ''} onChange={(event) => setDepositValues((current) => ({ ...current, [item.id]: event.target.value }))} />
                    <Button variant="outline" onClick={() => void update(item.id, { depositAmount: Number(depositValues[item.id] || 0) })}>Kaydet</Button>
                  </div>
                </div>
                <Button variant="outline" onClick={() => void update(item.id, { status: 'approved' })}><CheckCircle2 className="mr-2 h-4 w-4" /> Onayla</Button>
                <Button variant="outline" onClick={() => void update(item.id, { status: 'declined' })}><XCircle className="mr-2 h-4 w-4" /> Reddet</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

