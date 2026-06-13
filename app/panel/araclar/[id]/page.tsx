'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Edit, Eye, FileText, Globe2, MessageSquare, Sparkles, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VehicleImageFrame } from '@/components/shared/vehicle-image-frame'
import type { PanelVehicle } from '@/lib/panel-types'
import { analyzeVehiclePrice, generateVehicleDescription, getPriceDropRecommendation } from '@/lib/sales-intelligence'

type VehicleDetailApiResponse =
  | {
      ok: true
      source: 'supabase'
      item: PanelVehicle
    }
  | {
      ok: false
      message?: string
    }

const statusMap: Record<PanelVehicle['status'], { label: string; className: string }> = {
  active: { label: 'Satılık', className: 'bg-green-100 text-green-700' },
  reserved: { label: 'Rezerve', className: 'bg-amber-100 text-amber-700' },
  sold: { label: 'Satıldı', className: 'bg-muted text-muted-foreground' },
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>()
  const vehicleId = typeof params?.id === 'string' ? params.id : ''
  const hasVehicleId = vehicleId.length > 0

  const [vehicle, setVehicle] = useState<PanelVehicle | null>(null)
  const [peerVehicles, setPeerVehicles] = useState<PanelVehicle[]>([])
  const [analysisNow, setAnalysisNow] = useState(0)
  const [isLoading, setIsLoading] = useState(hasVehicleId)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasVehicleId ? null : 'Araç kimliği bulunamadı.',
  )

  useEffect(() => {
    if (!vehicleId) return

    const controller = new AbortController()

    const fetchVehicle = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(`/api/panel/vehicles/${vehicleId}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const data = (await response.json()) as VehicleDetailApiResponse

        if (!response.ok || !data.ok) {
          setVehicle(null)
          setErrorMessage(('message' in data && data.message) || 'Araç detayı alınamadı.')
          return
        }

        setVehicle(data.item)
        setAnalysisNow(Date.now())
        const peersResponse = await fetch('/api/panel/vehicles', { cache: 'no-store', signal: controller.signal }).catch(() => null)
        const peersData = peersResponse ? await peersResponse.json().catch(() => null) as { ok?: boolean; items?: PanelVehicle[] } | null : null
        if (peersResponse?.ok && peersData?.ok) {
          setPeerVehicles(peersData.items || [])
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setVehicle(null)
        setErrorMessage('Ağ hatası nedeniyle araç detayı alınamadı.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchVehicle()

    return () => {
      controller.abort()
    }
  }, [vehicleId])

  const vehicleTitle = useMemo(() => {
    if (!vehicle) return ''
    const variantPart = vehicle.variant ? ` ${vehicle.variant}` : ''
    return `${vehicle.year} ${vehicle.brand} ${vehicle.model}${variantPart}`.trim()
  }, [vehicle])

  const vehiclePhotos = useMemo(() => {
    if (!vehicle) return []
    return vehicle.photos.length > 0 ? vehicle.photos : vehicle.image ? [vehicle.image] : []
  }, [vehicle])

  const priceAnalysis = useMemo(() => {
    if (!vehicle) return null
    return analyzeVehiclePrice(vehicle, peerVehicles.length > 0 ? peerVehicles : [vehicle])
  }, [peerVehicles, vehicle])

  const priceDrop = useMemo(() => {
    if (!vehicle) return null
    return getPriceDropRecommendation(vehicle, analysisNow || undefined)
  }, [analysisNow, vehicle])

  const smartDescription = useMemo(() => {
    if (!vehicle) return ''
    return generateVehicleDescription(vehicle)
  }, [vehicle])

  const seoSnapshot = useMemo(() => {
    if (!vehicle) return null
    const title = `${vehicleTitle} Fiyatı ve Detayları`
    const description = `${vehicleTitle}; ${vehicle.mileage.toLocaleString('tr-TR')} km, ${vehicle.fuel}, ${vehicle.transmission}. Güncel fiyat, fotoğraf ve galeri iletişim bilgileri.`
    return {
      title,
      description,
      checks: [
        { label: 'Meta başlık', ready: title.length >= 35 && title.length <= 70 },
        { label: 'Meta açıklama', ready: description.length >= 90 && description.length <= 170 },
        { label: 'Sosyal paylaşım görseli', ready: vehicle.photos.length > 0 || Boolean(vehicle.image) },
        { label: 'Schema.org Car verisi', ready: Boolean(vehicle.brand && vehicle.model && vehicle.price > 0) },
      ],
    }
  }, [vehicle, vehicleTitle])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/panel/araclar"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Araçlara Dön
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Araç Detayı</h1>
        </div>
        {vehicle && <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/panel/araclar/${vehicle.id}/teklif`}>
              <FileText className="w-4 h-4 mr-2" />
              Teklif PDF&apos;i
            </Link>
          </Button>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href={`/panel/araclar/${vehicle.id}/duzenle`}>
              <Edit className="w-4 h-4 mr-2" />
              Düzenle
            </Link>
          </Button>
        </div>}
      </div>

      {isLoading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Araç detayı yükleniyor...</CardContent>
        </Card>
      )}

      {!isLoading && errorMessage && (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-destructive text-sm">{errorMessage}</p>
            <Button variant="outline" asChild>
              <Link href="/panel/araclar">Araç listesine dön</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !errorMessage && vehicle && (
        <>
          <Card className="overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="w-full lg:w-72 h-44 rounded-xl bg-muted overflow-hidden">
                  <VehicleImageFrame
                    src={vehiclePhotos[0]}
                    alt={vehicleTitle}
                    width={720}
                    height={440}
                    fill={false}
                    className="h-full w-full"
                    imageClassName="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-foreground">{vehicleTitle}</h2>
                    <Badge className={statusMap[vehicle.status].className}>{statusMap[vehicle.status].label}</Badge>
                  </div>

                  <div className="text-2xl font-bold text-accent">{formatPrice(vehicle.price)}</div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <p className="text-muted-foreground">Kilometre</p>
                      <p className="font-medium text-foreground">{vehicle.mileage.toLocaleString('tr-TR')} km</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <p className="text-muted-foreground">Yakıt</p>
                      <p className="font-medium text-foreground">{vehicle.fuel}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <p className="text-muted-foreground">Vites</p>
                      <p className="font-medium text-foreground">{vehicle.transmission}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <p className="text-muted-foreground">Renk</p>
                      <p className="font-medium text-foreground">{vehicle.color || '-'}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <p className="text-muted-foreground">Tarama</p>
                      <p className="font-medium text-foreground inline-flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {vehicle.scans}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <p className="text-muted-foreground">Müşteri Talebi</p>
                      <p className="font-medium text-foreground inline-flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {vehicle.leads}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {priceAnalysis && priceDrop && (
            <Card>
              <CardContent className="space-y-5 p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Fiyat Analizi ve Akıllı Öneriler</h2>
                    <p className="text-xs text-muted-foreground">Benzer stok, QR tarama ve müşteri talebi sinyallerinden hesaplanır.</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Piyasa Kıyaslama</p>
                    <Badge className="mt-2" variant={priceAnalysis.tone === 'high' ? 'destructive' : priceAnalysis.tone === 'low' ? 'secondary' : 'outline'}>{priceAnalysis.label}</Badge>
                    <p className="mt-3 text-sm text-muted-foreground">{priceAnalysis.summary}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Medyan Referans</p>
                    <p className="mt-2 text-xl font-bold">{priceAnalysis.benchmarkPrice ? formatPrice(priceAnalysis.benchmarkPrice) : '-'}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{priceAnalysis.peerCount} benzer aktif araç</p>
                  </div>
                  <div className={`rounded-lg border p-4 ${priceDrop.shouldDrop ? 'border-red-500/30 bg-red-500/5' : 'border-border'}`}>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" />Fiyat Revizyonu</p>
                    <p className="mt-2 font-semibold">{priceDrop.label}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{priceDrop.detail}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">AI araç açıklaması önerisi</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{smartDescription}</p>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link href={`/panel/araclar/${vehicle.id}/duzenle`}>
                      Açıklamayı Düzenle
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {seoSnapshot && (
            <Card>
              <CardContent className="space-y-5 p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">SEO Sayfa Sağlığı</h2>
                    <p className="text-xs text-muted-foreground">Public araç sayfası için başlık, açıklama, sosyal görsel ve yapılandırılmış veri kontrolü.</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Önerilen başlık</p>
                    <p className="mt-2 text-sm font-semibold">{seoSnapshot.title}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs text-muted-foreground">Önerilen açıklama</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{seoSnapshot.description}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {seoSnapshot.checks.map((check) => (
                    <div key={check.label} className="rounded-lg border border-border bg-muted/20 p-3">
                      <Badge variant={check.ready ? 'outline' : 'destructive'}>
                        {check.ready ? 'Hazır' : 'Eksik'}
                      </Badge>
                      <p className="mt-2 text-sm font-medium">{check.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(vehicle.purchasePrice || vehicle.expenseTotal || vehicle.targetProfit) && (
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <WalletCards className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Maliyet ve Kâr Özeti</h2>
                    <p className="text-xs text-muted-foreground">Yalnızca panelde görünür</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Alış Fiyatı</p><p className="mt-1 font-semibold">{formatPrice(vehicle.purchasePrice || 0)}</p></div>
                  <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Toplam Masraf</p><p className="mt-1 font-semibold">{formatPrice(vehicle.expenseTotal || 0)}</p></div>
                  <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Beklenen Kâr</p><p className="mt-1 font-semibold text-emerald-600">{formatPrice(vehicle.price - (vehicle.purchasePrice || 0) - (vehicle.expenseTotal || 0))}</p></div>
                  <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Hedef Kâr</p><p className="mt-1 font-semibold">{formatPrice(vehicle.targetProfit || 0)}</p></div>
                </div>
              </CardContent>
            </Card>
          )}

          {vehiclePhotos.length > 0 && (
            <Card>
              <CardContent className="p-6 md:p-8 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Kalıcı Araç Fotoğrafları</h2>
                  <p className="text-sm text-muted-foreground">
                    Bu fotoğraflar Supabase Storage üzerinde saklanır ve kullanıcı aracı veya fotoğrafı silene kadar kalır.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {vehiclePhotos.map((photo, index) => (
                    <div key={photo} className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                      <VehicleImageFrame
                        src={photo}
                        alt={`${vehicleTitle} fotoğraf ${index + 1}`}
                        sizes="(max-width: 768px) 50vw, 25vw"
                        imageClassName="object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                          Kapak
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
