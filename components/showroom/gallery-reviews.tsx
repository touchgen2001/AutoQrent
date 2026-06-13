'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Star } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { GalleryReview } from '@/lib/server/panel-operations-repository'

type ReviewsResponse = {
  ok?: boolean
  message?: string
  reviews?: GalleryReview[]
  averageRating?: number
  reviewCount?: number
  trusted?: boolean
}

export function GalleryReviews({ gallerySlug }: { gallerySlug: string }) {
  const [data, setData] = useState<ReviewsResponse>({})
  const [form, setForm] = useState({ customerName: '', customerEmail: '', rating: 5, comment: '', website: '' })
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void fetch(`/api/public/reviews?gallerySlug=${encodeURIComponent(gallerySlug)}`, {
      cache: 'no-store',
      signal: controller.signal,
    }).then((response) => response.json()).then(setData).catch(() => {})
    return () => controller.abort()
  }, [gallerySlug])

  const stars = useMemo(() => Array.from({ length: 5 }), [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    const response = await fetch('/api/public/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gallerySlug, ...form }),
    })
    const responseData = await response.json().catch(() => ({})) as ReviewsResponse
    setMessage(responseData.message || (response.ok ? 'Yorumunuz incelemeye alındı.' : 'Yorum gönderilemedi.'))
    if (response.ok) setForm({ customerName: '', customerEmail: '', rating: 5, comment: '', website: '' })
    setIsSubmitting(false)
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Müşteri yorumları</h2>
          <p className="mt-2 text-sm text-muted-foreground">Yayınlanan yorumlar galeri tarafından doğrulanmış müşteri geri bildirimleridir.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline"><Star className="mr-1 h-4 w-4 fill-amber-400 text-amber-400" /> {data.averageRating || 0} · {data.reviewCount || 0} yorum</Badge>
          {data.trusted && <Badge><ShieldCheck className="mr-1 h-4 w-4" /> Güven Rozeti</Badge>}
        </div>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {(data.reviews || []).length === 0 ? <Card className="p-6 text-sm text-muted-foreground sm:col-span-2">Henüz yayınlanan yorum yok.</Card> : (data.reviews || []).slice(0, 6).map((review) => (
            <Card key={review.id} className="p-5">
              <div className="flex gap-1">{stars.map((_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />)}</div>
              <p className="mt-3 text-sm leading-6">{review.comment}</p>
              <p className="mt-3 text-xs font-semibold text-muted-foreground">{review.customerName}</p>
            </Card>
          ))}
        </div>
        <Card className="p-5">
          <h3 className="font-semibold">Deneyiminizi paylaşın</h3>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <input type="text" className="hidden" tabIndex={-1} value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} />
            <Input placeholder="Ad soyad" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} required />
            <Input type="email" placeholder="E-posta (isteğe bağlı)" value={form.customerEmail} onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))} />
            <div className="flex gap-1">{stars.map((_, index) => <button type="button" key={index} onClick={() => setForm((current) => ({ ...current, rating: index + 1 }))}><Star className={`h-6 w-6 ${index < form.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} /></button>)}</div>
            <Textarea placeholder="Galeri deneyiminizi yazın..." minLength={10} value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} required />
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? 'Gönderiliyor...' : 'Yorumu Gönder'}</Button>
          </form>
        </Card>
      </div>
    </section>
  )
}

