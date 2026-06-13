'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArchiveRestore, RefreshCcw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type DeletedVehicle = {
  id: string
  title: string
  deletedAt: string
  deletedByEmail: string | null
}

export default function VehicleArchivePage() {
  const [items, setItems] = useState<DeletedVehicle[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    const response = await fetch('/api/panel/vehicles/trash', { cache: 'no-store' })
    const data = await response.json().catch(() => ({})) as { ok?: boolean; items?: DeletedVehicle[]; message?: string }
    if (response.ok && data.ok) setItems(data.items || [])
    else setMessage(data.message || 'Çöp kutusu alınamadı.')
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const restore = async (vehicleId: string) => {
    setUpdatingId(vehicleId)
    setMessage(null)
    const response = await fetch('/api/panel/vehicles/trash', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vehicleId }),
    })
    const data = await response.json().catch(() => ({})) as { ok?: boolean; items?: DeletedVehicle[]; message?: string }
    if (response.ok && data.ok) {
      setItems(data.items || [])
      setMessage('Araç geri alındı ve stok listesine taşındı.')
    } else {
      setMessage(data.message || 'Araç geri alınamadı.')
    }
    setUpdatingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Araç Çöp Kutusu</h1>
          <p className="mt-1 text-sm text-muted-foreground">Silinen araçların görselleri korunur ve araçlar buradan geri alınabilir.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Yenile
        </Button>
      </div>
      {message && <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">{message}</p>}
      <Card className="divide-y divide-border">
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">Yükleniyor...</p> : items.length === 0 ? (
          <div className="p-8 text-center">
            <Trash2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Çöp kutusunda araç yok.</p>
          </div>
        ) : items.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.deletedAt).toLocaleString('tr-TR')} · {item.deletedByEmail || 'Bilinmeyen kullanıcı'}
              </p>
            </div>
            <Button variant="outline" onClick={() => void restore(item.id)} disabled={updatingId === item.id}>
              <ArchiveRestore className="mr-2 h-4 w-4" /> Geri Al
            </Button>
          </div>
        ))}
      </Card>
    </div>
  )
}

