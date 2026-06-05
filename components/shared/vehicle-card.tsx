'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VehicleImageFrame } from '@/components/shared/vehicle-image-frame'
import { 
  Calendar, 
  Gauge, 
  Fuel, 
  Settings2,
  Eye,
  ArrowRight
} from 'lucide-react'
import { formatPrice, formatMileage, getFuelTypeLabel, getTransmissionLabel } from '@/lib/vehicle-display'
import { IMAGE_PRESETS } from '@/lib/image-presets'
import type { PublicVehicle } from '@/lib/public-catalog-types'

interface VehicleCardProps {
  vehicle: PublicVehicle
  showStats?: boolean
  linkPrefix?: string
}

export function VehicleCard({ vehicle, showStats = false, linkPrefix = '/arac' }: VehicleCardProps) {
  return (
    <Card className="group overflow-hidden bg-card hover:shadow-lg transition-all duration-300">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <VehicleImageFrame
          src={vehicle.images[0]}
          alt={vehicle.title}
          sizes={IMAGE_PRESETS.vehicleCard.sizes}
          quality={IMAGE_PRESETS.vehicleCard.quality}
          loading="lazy"
          imageClassName="group-hover:scale-105 transition-transform duration-500"
        />
        {vehicle.featured && (
          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
            Öne Çıkan
          </Badge>
        )}
        {vehicle.status !== 'yayinda' && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <Badge variant="secondary" className="text-sm">
              {vehicle.status === 'satildi' ? 'Satıldı' : vehicle.status === 'rezerve' ? 'Rezerve' : 'Taslak'}
            </Badge>
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
            {vehicle.title}
          </h3>
          <p className="text-xl font-bold text-foreground mt-1">
            {formatPrice(vehicle.price)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{vehicle.year}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4" />
            <span>{formatMileage(vehicle.mileage)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Fuel className="h-4 w-4" />
            <span>{getFuelTypeLabel(vehicle.fuelType)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4" />
            <span>{getTransmissionLabel(vehicle.transmission)}</span>
          </div>
        </div>

        {showStats && (
          <div className="flex items-center gap-4 pt-2 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{vehicle.views} görüntülenme</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{vehicle.qrScans} QR tarama</span>
            </div>
          </div>
        )}

        <Button asChild variant="outline" className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
          <Link href={`${linkPrefix}/${vehicle.routeId || vehicle.id}`}>
            Detayları Gör
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  )
}

// Herkese açık galeri sayfası kartı
interface PublicVehicleCardProps {
  vehicle: PublicVehicle
  dealerSlug: string
}

export function PublicVehicleCard({ vehicle, dealerSlug }: PublicVehicleCardProps) {
  return (
    <Card className="group overflow-hidden bg-card hover:shadow-xl transition-all duration-300 border-border/50">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <VehicleImageFrame
          src={vehicle.images[0]}
          alt={vehicle.title}
          sizes={IMAGE_PRESETS.vehicleCard.sizes}
          quality={IMAGE_PRESETS.vehicleCard.quality}
          loading="lazy"
          imageClassName="group-hover:scale-105 transition-transform duration-500"
        />
        {vehicle.featured && (
          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground shadow-lg">
            Vitrin
          </Badge>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">
            {vehicle.title}
          </h3>
          <p className="text-xl font-bold text-accent mt-1">
            {formatPrice(vehicle.price)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{vehicle.year}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4" />
            <span>{formatMileage(vehicle.mileage)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Fuel className="h-4 w-4" />
            <span>{getFuelTypeLabel(vehicle.fuelType)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4" />
            <span>{getTransmissionLabel(vehicle.transmission)}</span>
          </div>
        </div>

        <Button asChild className="w-full bg-foreground text-background hover:bg-foreground/90">
          <Link href={`/arac/${vehicle.routeId || vehicle.id}?ref=${dealerSlug}&src=showroom`}>
            Detayları Gör
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  )
}
