'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Car, Edit, Eye, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PanelVehicle } from '@/lib/panel-types'

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
        {vehicle && (
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href={`/panel/araclar/${vehicle.id}/duzenle`}>
              <Edit className="w-4 h-4 mr-2" />
              Düzenle
            </Link>
          </Button>
        )}
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
                <div className="w-full lg:w-72 h-44 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                  {vehicle.image ? (
                    <Image
                      src={vehicle.image}
                      alt={vehicleTitle}
                      width={720}
                      height={440}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Car className="w-14 h-14 text-muted-foreground/40" />
                  )}
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
                      <p className="text-muted-foreground">Lead</p>
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
        </>
      )}
    </div>
  )
}
