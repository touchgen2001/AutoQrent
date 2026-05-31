'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  MapPin, 
  Phone, 
  MessageCircle, 
  Navigation,
  Clock,
  Car,
  Search,
  SlidersHorizontal,
  X,
  Calendar,
  Gauge,
  Fuel,
  Settings2,
  ArrowRight,
  Star,
  Instagram,
  Facebook,
  Youtube
} from 'lucide-react'
import { 
  mockDealership, 
  mockVehicles, 
  formatPrice, 
  formatMileage,
  getFuelTypeLabel,
  getTransmissionLabel,
  carBrands
} from '@/lib/mock-data'
import { StickyContactBar } from '@/components/shared/contact-bar'
import { EmptySearch } from '@/components/shared/empty-state'
import type { Vehicle } from '@/lib/mock-data'

// Simulated dealer lookup
function getDealerBySlug(slug: string) {
  if (slug === mockDealership.slug || slug === 'demo') {
    return mockDealership
  }
  return null
}

function getActiveVehicles() {
  return mockVehicles.filter(v => v.status === 'yayinda')
}

export default function ShowroomPage({ params }: { params: Promise<{ dealerSlug: string }> }) {
  const resolvedParams = useMemo(() => {
    // For server component compatibility
    return { dealerSlug: 'prestij-otomotiv' }
  }, [])
  
  const dealer = getDealerBySlug(resolvedParams.dealerSlug)
  const vehicles = getActiveVehicles()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    brand: 'all',
    fuelType: 'all',
    transmission: 'all',
    sortBy: 'newest'
  })

  if (!dealer) {
    notFound()
  }

  // Filter and sort vehicles
  const filteredVehicles = useMemo(() => {
    const result = vehicles.filter(v => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          v.title.toLowerCase().includes(query) ||
          v.brand.toLowerCase().includes(query) ||
          v.model.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Brand filter
      if (filters.brand !== 'all' && v.brand !== filters.brand) return false

      // Fuel filter
      if (filters.fuelType !== 'all' && v.fuelType !== filters.fuelType) return false

      // Transmission filter
      if (filters.transmission !== 'all' && v.transmission !== filters.transmission) return false

      return true
    })

    // Sort
    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'views':
        result.sort((a, b) => b.views - a.views)
        break
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return result
  }, [vehicles, searchQuery, filters])

  const featuredVehicles = vehicles.filter(v => v.featured)

  const clearFilters = () => {
    setSearchQuery('')
    setFilters({
      brand: 'all',
      fuelType: 'all',
      transmission: 'all',
      sortBy: 'newest'
    })
  }

  const hasActiveFilters = searchQuery || 
    filters.brand !== 'all' || 
    filters.fuelType !== 'all' || 
    filters.transmission !== 'all'

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-muted to-background">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Dealer Info */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-card border border-border flex items-center justify-center overflow-hidden">
                {dealer.logo ? (
                  <Image
                    src={dealer.logo}
                    alt={dealer.name}
                    width={96}
                    height={96}
                    className="object-contain"
                  />
                ) : (
                  <Car className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{dealer.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{dealer.district}, {dealer.city}</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                    <Car className="h-3.5 w-3.5 mr-1" />
                    {vehicles.length} Araç
                  </Badge>
                  {dealer.socialMedia?.instagram && (
                    <Link href={`https://instagram.com/${dealer.socialMedia.instagram}`} target="_blank" className="text-muted-foreground hover:text-foreground">
                      <Instagram className="h-4 w-4" />
                    </Link>
                  )}
                  {dealer.socialMedia?.facebook && (
                    <Link href={`https://facebook.com/${dealer.socialMedia.facebook}`} target="_blank" className="text-muted-foreground hover:text-foreground">
                      <Facebook className="h-4 w-4" />
                    </Link>
                  )}
                  {dealer.socialMedia?.youtube && (
                    <Link href={`https://youtube.com/@${dealer.socialMedia.youtube}`} target="_blank" className="text-muted-foreground hover:text-foreground">
                      <Youtube className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Buttons (Desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href={`tel:${dealer.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 py-2.5 px-5 rounded-lg bg-foreground text-background font-medium transition-colors hover:bg-foreground/90"
              >
                <Phone className="h-4 w-4" />
                <span>Ara</span>
              </Link>
              <Link
                href={`https://wa.me/${dealer.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                className="flex items-center gap-2 py-2.5 px-5 rounded-lg bg-green-600 text-white font-medium transition-colors hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </Link>
              {dealer.googleMapsUrl && (
                <Link
                  href={dealer.googleMapsUrl}
                  target="_blank"
                  className="flex items-center gap-2 py-2.5 px-5 rounded-lg border border-border text-foreground font-medium transition-colors hover:bg-muted"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Yol Tarifi</span>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <Card className="p-3 bg-card/50 border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground truncate">{dealer.phone}</span>
              </div>
            </Card>
            <Card className="p-3 bg-card/50 border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground truncate">{dealer.workingHours.weekdays}</span>
              </div>
            </Card>
            <Card className="p-3 bg-card/50 border-border/50 col-span-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
                <span className="text-muted-foreground truncate">{dealer.address}</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Vehicles */}
      {featuredVehicles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-accent fill-accent" />
            <h2 className="text-xl font-semibold text-foreground">Vitrin Araçlar</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredVehicles.slice(0, 4).map(vehicle => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} dealerSlug={dealer.slug} />
            ))}
          </div>
        </section>
      )}

      {/* All Vehicles */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Tüm Araçlar</h2>
          <span className="text-sm text-muted-foreground">{filteredVehicles.length} araç</span>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Araç ara... (marka, model)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card"
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg border border-border">
              <Select value={filters.brand} onValueChange={(v) => setFilters(f => ({ ...f, brand: v }))}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Marka" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Markalar</SelectItem>
                  {carBrands.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.fuelType} onValueChange={(v) => setFilters(f => ({ ...f, fuelType: v }))}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Yakıt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Yakıtlar</SelectItem>
                  <SelectItem value="benzin">Benzin</SelectItem>
                  <SelectItem value="dizel">Dizel</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                  <SelectItem value="hibrit">Hibrit</SelectItem>
                  <SelectItem value="elektrik">Elektrik</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.transmission} onValueChange={(v) => setFilters(f => ({ ...f, transmission: v }))}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Vites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Vitesler</SelectItem>
                  <SelectItem value="otomatik">Otomatik</SelectItem>
                  <SelectItem value="manuel">Manuel</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.sortBy} onValueChange={(v) => setFilters(f => ({ ...f, sortBy: v }))}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">En Yeni</SelectItem>
                  <SelectItem value="price-asc">Fiyat (Artan)</SelectItem>
                  <SelectItem value="price-desc">Fiyat (Azalan)</SelectItem>
                  <SelectItem value="views">En Çok İncelenen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Vehicle Grid */}
        {filteredVehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVehicles.map(vehicle => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} dealerSlug={dealer.slug} />
            ))}
          </div>
        ) : (
          <EmptySearch />
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {dealer.name} - {dealer.address}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Powered by <Link href="/" className="text-accent hover:underline">Cebindegaleri</Link>
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{dealer.phone}</span>
              <span>{dealer.email}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Contact Bar */}
      <StickyContactBar
        phone={dealer.phone}
        whatsapp={dealer.whatsapp}
        mapsUrl={dealer.googleMapsUrl}
      />
    </div>
  )
}

// Vehicle Card Component
function VehicleCard({ vehicle, dealerSlug }: { vehicle: Vehicle; dealerSlug: string }) {
  return (
    <Card className="group overflow-hidden bg-card hover:shadow-lg transition-all duration-300 border-border/50">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image
          src={vehicle.images[0] || '/placeholder.jpg'}
          alt={vehicle.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {vehicle.featured && (
          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground shadow-lg">
            <Star className="h-3 w-3 mr-1 fill-current" />
            Vitrin
          </Badge>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
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
          <Link href={`/arac/${vehicle.id}?ref=${dealerSlug}`}>
            Detayları Gör
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  )
}
