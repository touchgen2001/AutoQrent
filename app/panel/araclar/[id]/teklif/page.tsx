'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PanelVehicle } from '@/lib/panel-types'

type GalleryIdentity = {
  name: string
  logo: string | null
  phone: string | null
  city: string | null
  showroomUrl: string
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value)
}

export default function VehicleOfferPage() {
  const params = useParams<{ id: string }>()
  const vehicleId = typeof params?.id === 'string' ? params.id : ''
  const [vehicle, setVehicle] = useState<PanelVehicle | null>(null)
  const [gallery, setGallery] = useState<GalleryIdentity | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [validDays, setValidDays] = useState('7')
  const [discount, setDiscount] = useState('0')
  const [note, setNote] = useState('Fiyat ve araç müsaitliği teklif geçerlilik süresi boyunca korunur.')

  useEffect(() => {
    if (!vehicleId) return
    void Promise.all([
      fetch(`/api/panel/vehicles/${vehicleId}`, { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/panel/gallery-identity', { cache: 'no-store' }).then((response) => response.json()),
    ]).then(([vehicleData, galleryData]) => {
      if (vehicleData.ok) setVehicle(vehicleData.item)
      if (galleryData.ok) setGallery(galleryData.gallery)
    })
  }, [vehicleId])

  const offerPrice = Math.max(0, (vehicle?.price || 0) - Number(discount || 0))
  const validUntil = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() + Math.max(1, Number(validDays || 7)))
    return date.toLocaleDateString('tr-TR')
  }, [validDays])

  if (!vehicle) {
    return <Card><CardContent className="p-10 text-center text-muted-foreground">Teklif hazırlanıyor...</CardContent></Card>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link href={`/panel/araclar/${vehicle.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Araç detayına dön</Link>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />PDF Olarak Yazdır</Button>
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardContent className="space-y-8 p-6 md:p-10 print:p-0">
          <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2 print:hidden">
            <div className="space-y-2"><Label htmlFor="offer-customer-name">Müşteri Adı</Label><Input id="offer-customer-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Müşteri adı" /></div>
            <div className="space-y-2"><Label htmlFor="offer-valid-days">Geçerlilik Süresi (gün)</Label><Input id="offer-valid-days" type="number" min="1" value={validDays} onChange={(event) => setValidDays(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="offer-discount">İndirim (TL)</Label><Input id="offer-discount" type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="offer-note">Teklif Notu</Label><Input id="offer-note" value={note} onChange={(event) => setNote(event.target.value)} /></div>
          </div>

          <header className="flex items-start justify-between gap-6 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              {gallery?.logo && <Image src={gallery.logo} alt={gallery.name} width={72} height={72} className="h-16 w-16 rounded-lg object-contain" />}
              <div>
                <p className="text-sm text-muted-foreground">Araç Satış Teklifi</p>
                <h1 className="text-2xl font-bold">{gallery?.name || 'Cebindegaleri'}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{gallery?.phone} {gallery?.city ? `· ${gallery.city}` : ''}</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Teklif Tarihi</p>
              <p className="font-medium">{new Date().toLocaleDateString('tr-TR')}</p>
              <p className="mt-2 text-muted-foreground">Geçerlilik</p>
              <p className="font-medium">{validUntil}</p>
            </div>
          </header>

          {customerName && <div><p className="text-sm text-muted-foreground">Sayın</p><p className="text-lg font-semibold">{customerName}</p></div>}

          <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
              {vehicle.image ? <Image src={vehicle.image} alt={`${vehicle.brand} ${vehicle.model}`} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Araç görseli yok</div>}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{vehicle.year} {vehicle.brand} {vehicle.model} {vehicle.variant}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Kilometre</p><p className="font-medium">{vehicle.mileage.toLocaleString('tr-TR')} km</p></div>
                <div><p className="text-muted-foreground">Yakıt</p><p className="font-medium">{vehicle.fuel}</p></div>
                <div><p className="text-muted-foreground">Vites</p><p className="font-medium">{vehicle.transmission}</p></div>
                <div><p className="text-muted-foreground">Renk</p><p className="font-medium">{vehicle.color || '-'}</p></div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-foreground p-5">
            {Number(discount || 0) > 0 && <div className="flex justify-between text-sm text-muted-foreground"><span>Liste Fiyatı</span><span className="line-through">{formatPrice(vehicle.price)}</span></div>}
            {Number(discount || 0) > 0 && <div className="mt-2 flex justify-between text-sm text-emerald-600"><span>Teklif İndirimi</span><span>-{formatPrice(Number(discount))}</span></div>}
            <div className="mt-3 flex items-end justify-between border-t border-border pt-3"><span className="font-semibold">Teklif Fiyatı</span><strong className="text-3xl">{formatPrice(offerPrice)}</strong></div>
          </div>

          <p className="text-sm text-muted-foreground">{note}</p>
          <footer className="border-t border-border pt-5 text-xs text-muted-foreground">
            <p>{gallery?.showroomUrl}</p>
            <p className="mt-1">Bu belge bilgilendirme amaçlı satış teklifidir.</p>
          </footer>
        </CardContent>
      </Card>
    </div>
  )
}
