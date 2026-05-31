"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { 
  Phone, 
  MessageCircle, 
  MapPin, 
  Calendar, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Car,
  Fuel,
  Gauge,
  Palette,
  Settings,
  Shield,
  Users,
  Wrench,
  X,
  Check,
  Clock,
  Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Mock data - in real app would come from API based on QR code
const vehicleData = {
  id: "CG-001",
  brand: "BMW",
  model: "3 Serisi",
  variant: "320i M Sport",
  year: 2023,
  price: 2450000,
  mileage: 45000,
  fuel: "Benzin",
  transmission: "Otomatik",
  color: "Siyah",
  engineSize: "2000 cc",
  horsePower: "184 HP",
  bodyType: "Sedan",
  previousOwners: 1,
  hasDamage: false,
  serviceHistory: true,
  warranty: false,
  description: "Tam bakımlı, kazasız, boyasız araç. Yetkili servis bakımları düzenli olarak yapılmıştır. İç dış temiz, lastikler yeni. Tüm özellikleri aktif çalışmaktadır.",
  features: [
    "M Sport Paket",
    "Navigasyon",
    "Geri Görüş Kamerası",
    "LED Far",
    "Panoramik Tavan",
    "Deri Döşeme",
    "Elektrikli Koltuk",
    "Isıtmalı Direksiyon",
    "Apple CarPlay",
    "Şerit Takip Sistemi"
  ],
  images: [
    "/vehicle-1.jpg",
    "/vehicle-2.jpg",
    "/vehicle-3.jpg",
    "/vehicle-4.jpg",
  ],
  gallery: {
    name: "ABC Otomotiv",
    phone: "0530 973 82 40",
    whatsapp: "905309738240",
    address: "Kadıköy, İstanbul",
    workingHours: "09:00 - 19:00"
  }
}

export default function PublicVehiclePage({ params }: { params: { id: string } }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showGallery, setShowGallery] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)

  const vehicle = vehicleData

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Merhaba, ${vehicle.brand} ${vehicle.model} ${vehicle.variant} (${vehicle.year}) aracınız hakkında bilgi almak istiyorum. (Referans: ${params.id})`
    )
    window.open(`https://wa.me/${vehicle.gallery.whatsapp}?text=${message}`, '_blank')
  }

  const handleCall = () => {
    window.location.href = `tel:${vehicle.gallery.phone}`
  }

  const handleLocation = () => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(vehicle.gallery.address)}`, '_blank')
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${vehicle.brand} ${vehicle.model} ${vehicle.variant}`,
          text: `${vehicle.year} model, ${formatPrice(vehicle.price)}`,
          url: window.location.href
        })
      } catch {
        // User cancelled or error
      }
    }
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % vehicle.images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + vehicle.images.length) % vehicle.images.length)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header - Gallery Info */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">{vehicle.gallery.name}</h2>
              <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
                <Clock className="w-3 h-3" />
                <span>{vehicle.gallery.workingHours}</span>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleShare}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Image Gallery */}
      <div className="relative">
        <div 
          className="aspect-[4/3] bg-muted overflow-hidden cursor-pointer"
          onClick={() => setShowGallery(true)}
        >
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Car className="w-24 h-24 text-muted-foreground/20" />
          </div>
        </div>

        {/* Image Navigation */}
        <button 
          onClick={(e) => { e.stopPropagation(); prevImage(); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); nextImage(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Image Counter */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-white text-sm">
          {currentImageIndex + 1} / {vehicle.images.length}
        </div>

        {/* Thumbnail Strip */}
        <div className="flex gap-1 p-2 bg-muted/50">
          {vehicle.images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={cn(
                "flex-1 h-1 rounded-full transition-all",
                index === currentImageIndex ? "bg-accent" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="px-4 py-5">
        {/* Title & Price */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded mb-2">
              Satılık
            </span>
            <h1 className="text-xl font-bold text-foreground">
              {vehicle.brand} {vehicle.model}
            </h1>
            <p className="text-muted-foreground">
              {vehicle.variant} • {vehicle.year}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">
              {formatPrice(vehicle.price)}
            </div>
          </div>
        </div>

        {/* Quick Specs */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
            <div className="w-9 h-9 bg-background rounded-lg flex items-center justify-center">
              <Gauge className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kilometre</p>
              <p className="text-sm font-medium">{vehicle.mileage.toLocaleString('tr-TR')} km</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
            <div className="w-9 h-9 bg-background rounded-lg flex items-center justify-center">
              <Fuel className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Yakıt</p>
              <p className="text-sm font-medium">{vehicle.fuel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
            <div className="w-9 h-9 bg-background rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vites</p>
              <p className="text-sm font-medium">{vehicle.transmission}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
            <div className="w-9 h-9 bg-background rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Renk</p>
              <p className="text-sm font-medium">{vehicle.color}</p>
            </div>
          </div>
        </div>

        {/* Vehicle Status */}
        <div className="mt-5 p-4 bg-muted rounded-xl">
          <h3 className="font-semibold text-foreground mb-3">Araç Durumu</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                vehicle.hasDamage ? "bg-red-100" : "bg-green-100"
              )}>
                {vehicle.hasDamage ? (
                  <X className="w-3 h-3 text-red-600" />
                ) : (
                  <Check className="w-3 h-3 text-green-600" />
                )}
              </div>
              <span className="text-sm">{vehicle.hasDamage ? "Hasar Kaydı Var" : "Hasar Kaydı Yok"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                vehicle.serviceHistory ? "bg-green-100" : "bg-muted"
              )}>
                {vehicle.serviceHistory ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <X className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm">Servis Bakımlı</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center">
                <Users className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-sm">{vehicle.previousOwners}. El</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                vehicle.warranty ? "bg-green-100" : "bg-muted"
              )}>
                {vehicle.warranty ? (
                  <Shield className="w-3 h-3 text-green-600" />
                ) : (
                  <Shield className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm">{vehicle.warranty ? "Garantili" : "Garanti Yok"}</span>
            </div>
          </div>
        </div>

        {/* Technical Specs */}
        <div className="mt-5">
          <h3 className="font-semibold text-foreground mb-3">Teknik Özellikler</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div className="text-muted-foreground">Motor Hacmi</div>
            <div className="font-medium">{vehicle.engineSize}</div>
            <div className="text-muted-foreground">Motor Gücü</div>
            <div className="font-medium">{vehicle.horsePower}</div>
            <div className="text-muted-foreground">Kasa Tipi</div>
            <div className="font-medium">{vehicle.bodyType}</div>
            <div className="text-muted-foreground">Model Yılı</div>
            <div className="font-medium">{vehicle.year}</div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-5">
          <h3 className="font-semibold text-foreground mb-3">Özellikler</h3>
          <div className="flex flex-wrap gap-2">
            {vehicle.features.map((feature, index) => (
              <span 
                key={index}
                className="px-3 py-1.5 bg-muted text-sm rounded-full"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mt-5">
          <h3 className="font-semibold text-foreground mb-3">Açıklama</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {vehicle.description}
          </p>
        </div>

        {/* Gallery Location */}
        <div className="mt-5 p-4 bg-muted rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{vehicle.gallery.name}</p>
                <p className="text-sm text-muted-foreground">{vehicle.gallery.address}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLocation}>
              Yol Tarifi
            </Button>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-background rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Bilgi Formu</h3>
              <button onClick={() => setShowContactForm(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <form className="space-y-4">
              <input
                type="text"
                placeholder="Adınız Soyadınız"
                className="w-full px-4 py-3 border border-border rounded-xl bg-background"
              />
              <input
                type="tel"
                placeholder="Telefon Numaranız"
                className="w-full px-4 py-3 border border-border rounded-xl bg-background"
              />
              <textarea
                placeholder="Mesajınız (opsiyonel)"
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background resize-none"
              />
              <Button className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground">
                Gönder
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border px-4 py-3 safe-area-pb">
        <div className="flex gap-2">
          <Button 
            onClick={handleWhatsApp}
            className="flex-1 h-12 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            WhatsApp
          </Button>
          <Button 
            onClick={handleCall}
            className="flex-1 h-12 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Phone className="w-5 h-5 mr-2" />
            Ara
          </Button>
          <Button 
            variant="outline"
            className="h-12 px-4"
            onClick={handleLocation}
          >
            <MapPin className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline"
            className="h-12 px-4"
            onClick={() => setShowContactForm(true)}
          >
            <Calendar className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black">
          <button 
            onClick={() => setShowGallery(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="h-full flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Car className="w-32 h-32 text-muted-foreground/20" />
            </div>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {vehicle.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentImageIndex ? "bg-white w-6" : "bg-white/50"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
