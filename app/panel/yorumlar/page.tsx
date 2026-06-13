'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RefreshCcw, ShieldCheck, Star, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { GalleryReview, GalleryReviewStatus } from '@/lib/server/panel-operations-repository'

const labels: Record<GalleryReviewStatus, string> = {
  pending: 'İncelemede',
  published: 'Yayında',
  rejected: 'Reddedildi',
}

export default function ReviewsPage() {
  const [items, setItems] = useState<GalleryReview[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    const response = await fetch('/api/panel/reviews', { cache: 'no-store' })
    const data = await response.json().catch(() => ({})) as { ok?: boolean; items?: GalleryReview[]; message?: string }
    if (response.ok && data.ok) setItems(data.items || [])
    else setMessage(data.message || 'Yorumlar alınamadı.')
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const published = useMemo(() => items.filter((item) => item.status === 'published'), [items])
  const average = published.length ? (published.reduce((sum, item) => sum + item.rating, 0) / published.length).toFixed(1) : '0.0'

  const update = async (reviewId: string, status: GalleryReviewStatus) => {
    const response = await fetch('/api/panel/reviews', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reviewId, status }),
    })
    const data = await response.json().catch(() => ({})) as { ok?: boolean; items?: GalleryReview[]; message?: string }
    if (response.ok && data.ok) setItems(data.items || [])
    else setMessage(data.message || 'Yorum güncellenemedi.')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Galeri Yorumları</h1><p className="mt-1 text-sm text-muted-foreground">Müşteri yorumlarını doğrulayın ve güven puanınızı yönetin.</p></div>
        <Button variant="outline" onClick={() => void load()}><RefreshCcw className="mr-2 h-4 w-4" /> Yenile</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><Star className="h-5 w-5 text-amber-500" /><p className="mt-3 text-2xl font-bold">{average}</p><p className="text-sm text-muted-foreground">Yayınlanan yorum ortalaması</p></Card>
        <Card className="p-5"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-2xl font-bold">{published.length}</p><p className="text-sm text-muted-foreground">Yayınlanan yorum</p></Card>
        <Card className="p-5"><ShieldCheck className="h-5 w-5 text-accent" /><p className="mt-3 text-2xl font-bold">{published.length >= 3 && Number(average) >= 4.5 ? 'Aktif' : 'Bekliyor'}</p><p className="text-sm text-muted-foreground">Güven rozeti</p></Card>
      </div>
      {message && <p className="rounded-lg border border-border px-4 py-3 text-sm">{message}</p>}
      <div className="grid gap-4">
        {isLoading ? <Card className="p-6 text-sm text-muted-foreground">Yükleniyor...</Card> : items.length === 0 ? <Card className="p-8 text-center text-sm text-muted-foreground">Henüz yorum yok.</Card> : items.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.customerName}</p><Badge variant="outline">{labels[item.status]}</Badge></div>
                <div className="mt-2 flex gap-1">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-4 w-4 ${index < item.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />)}</div>
                <p className="mt-3 text-sm leading-6">{item.comment}</p>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString('tr-TR')}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void update(item.id, 'published')}><CheckCircle2 className="mr-2 h-4 w-4" /> Yayınla</Button>
                <Button size="sm" variant="outline" onClick={() => void update(item.id, 'rejected')}><XCircle className="mr-2 h-4 w-4" /> Reddet</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

