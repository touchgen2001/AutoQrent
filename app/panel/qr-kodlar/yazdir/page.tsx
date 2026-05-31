"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Printer, 
  QrCode,
  Settings,
  Grid3X3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// Mock data - in real app would come from URL params
const vehicles = [
  {
    id: "1",
    brand: "BMW",
    model: "3 Serisi",
    variant: "320i M Sport",
    year: 2023,
    price: 2450000,
    qrCode: "CG-001"
  },
  {
    id: "2",
    brand: "Mercedes-Benz",
    model: "C Serisi",
    variant: "C180 AMG",
    year: 2022,
    price: 2850000,
    qrCode: "CG-002"
  },
  {
    id: "3",
    brand: "Audi",
    model: "A4",
    variant: "2.0 TDI",
    year: 2021,
    price: 1950000,
    qrCode: "CG-003"
  },
]

const templates = [
  { id: "sticker", name: "Cam Stickeri", size: "10x10 cm" },
  { id: "label", name: "Araç Etiketi", size: "5x8 cm" },
  { id: "card", name: "Bilgi Kartı", size: "9x5 cm" },
  { id: "poster", name: "Tanıtım Posteri", size: "A4" },
]

export default function PrintQRPage() {
  const [selectedTemplate, setSelectedTemplate] = useState("sticker")
  const [showPrice, setShowPrice] = useState(true)
  const [showGalleryLogo, setShowGalleryLogo] = useState(true)
  const [showVehicleInfo, setShowVehicleInfo] = useState(true)
  const [paperSize, setPaperSize] = useState("a4")

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header - Hide on print */}
      <div className="print:hidden">
        <Link 
          href="/panel/qr-kodlar" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          QR Kodlara Dön
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">QR Etiket Yazdır</h1>
            <p className="text-muted-foreground">{vehicles.length} araç için yazdırma önizlemesi</p>
          </div>
          <Button onClick={handlePrint} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Printer className="w-4 h-4 mr-2" />
            Yazdır
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Settings Panel - Hide on print */}
        <div className="lg:col-span-1 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Yazdırma Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-3">
                <Label>Şablon Seçimi</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn(
                        "p-3 border rounded-lg text-left transition-all",
                        selectedTemplate === template.id
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/50"
                      )}
                    >
                      <div className="text-sm font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground">{template.size}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Size */}
              <div className="space-y-2">
                <Label>Kağıt Boyutu</Label>
                <Select value={paperSize} onValueChange={setPaperSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4</SelectItem>
                    <SelectItem value="a5">A5</SelectItem>
                    <SelectItem value="letter">Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Display Options */}
              <div className="space-y-3">
                <Label>Görüntüleme Seçenekleri</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showPrice"
                      checked={showPrice}
                      onCheckedChange={(checked) => setShowPrice(checked as boolean)}
                    />
                    <label htmlFor="showPrice" className="text-sm cursor-pointer">
                      Fiyatı göster
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showLogo"
                      checked={showGalleryLogo}
                      onCheckedChange={(checked) => setShowGalleryLogo(checked as boolean)}
                    />
                    <label htmlFor="showLogo" className="text-sm cursor-pointer">
                      Galeri logosunu göster
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showInfo"
                      checked={showVehicleInfo}
                      onCheckedChange={(checked) => setShowVehicleInfo(checked as boolean)}
                    />
                    <label htmlFor="showInfo" className="text-sm cursor-pointer">
                      Araç bilgilerini göster
                    </label>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-2">Yazdırma İpuçları</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Yüksek kalite için lazer yazıcı kullanın</li>
                  <li>• Cam stickerları için şeffaf etiket kağıdı tercih edin</li>
                  <li>• QR kodun düzgün okunması için en az 2x2 cm baskı yapın</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="print:hidden">
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                Önizleme
              </CardTitle>
            </CardHeader>
            <CardContent className="print:p-0">
              {/* Sticker Template */}
              {selectedTemplate === "sticker" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-8">
                  {vehicles.map((vehicle) => (
                    <div 
                      key={vehicle.id}
                      className="aspect-square border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center print:border-solid print:border-foreground/20"
                    >
                      {/* Gallery Logo */}
                      {showGalleryLogo && (
                        <div className="text-xs font-bold text-muted-foreground mb-2 print:text-foreground">
                          ABC Otomotiv
                        </div>
                      )}
                      
                      {/* QR Code */}
                      <div className="w-24 h-24 bg-foreground rounded-lg flex items-center justify-center mb-3">
                        <QrCode className="w-20 h-20 text-background" />
                      </div>

                      {/* Vehicle Info */}
                      {showVehicleInfo && (
                        <div className="text-xs font-medium text-foreground">
                          {vehicle.brand} {vehicle.model}
                        </div>
                      )}

                      {/* Price */}
                      {showPrice && (
                        <div className="text-sm font-bold text-accent mt-1">
                          {formatPrice(vehicle.price)}
                        </div>
                      )}

                      {/* QR Code */}
                      <div className="text-xs text-muted-foreground mt-2 font-mono">
                        {vehicle.qrCode}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Label Template */}
              {selectedTemplate === "label" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-6">
                  {vehicles.map((vehicle) => (
                    <div 
                      key={vehicle.id}
                      className="border-2 border-dashed border-border rounded-lg p-3 print:border-solid print:border-foreground/20"
                    >
                      <div className="flex items-start gap-3">
                        {/* QR Code */}
                        <div className="w-14 h-14 bg-foreground rounded flex items-center justify-center shrink-0">
                          <QrCode className="w-12 h-12 text-background" />
                        </div>
                        
                        <div className="min-w-0">
                          {showGalleryLogo && (
                            <div className="text-[10px] font-bold text-muted-foreground">
                              ABC Otomotiv
                            </div>
                          )}
                          {showVehicleInfo && (
                            <div className="text-xs font-medium text-foreground truncate">
                              {vehicle.brand} {vehicle.model}
                            </div>
                          )}
                          {showPrice && (
                            <div className="text-xs font-bold text-accent">
                              {formatPrice(vehicle.price)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Card Template */}
              {selectedTemplate === "card" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-6">
                  {vehicles.map((vehicle) => (
                    <div 
                      key={vehicle.id}
                      className="border-2 border-dashed border-border rounded-xl p-4 flex items-center gap-4 print:border-solid print:border-foreground/20"
                    >
                      {/* QR Code */}
                      <div className="w-20 h-20 bg-foreground rounded-lg flex items-center justify-center shrink-0">
                        <QrCode className="w-16 h-16 text-background" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {showGalleryLogo && (
                          <div className="text-xs font-bold text-muted-foreground mb-1">
                            ABC Otomotiv
                          </div>
                        )}
                        {showVehicleInfo && (
                          <>
                            <div className="font-semibold text-foreground">
                              {vehicle.brand} {vehicle.model}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {vehicle.variant} • {vehicle.year}
                            </div>
                          </>
                        )}
                        {showPrice && (
                          <div className="text-lg font-bold text-accent mt-1">
                            {formatPrice(vehicle.price)}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          Tara: {vehicle.qrCode}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Poster Template */}
              {selectedTemplate === "poster" && (
                <div className="space-y-6">
                  {vehicles.map((vehicle) => (
                    <div 
                      key={vehicle.id}
                      className="border-2 border-dashed border-border rounded-2xl p-8 print:border-solid print:border-foreground/20 print:break-after-page"
                    >
                      <div className="text-center">
                        {showGalleryLogo && (
                          <div className="text-lg font-bold text-muted-foreground mb-4">
                            ABC Otomotiv
                          </div>
                        )}
                        
                        {/* QR Code */}
                        <div className="w-48 h-48 bg-foreground rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <QrCode className="w-40 h-40 text-background" />
                        </div>

                        {showVehicleInfo && (
                          <>
                            <h2 className="text-2xl font-bold text-foreground">
                              {vehicle.brand} {vehicle.model}
                            </h2>
                            <p className="text-lg text-muted-foreground">
                              {vehicle.variant} • {vehicle.year}
                            </p>
                          </>
                        )}
                        
                        {showPrice && (
                          <div className="text-3xl font-bold text-accent mt-4">
                            {formatPrice(vehicle.price)}
                          </div>
                        )}

                        <div className="mt-6 text-muted-foreground">
                          <p className="text-sm">Detaylı bilgi için QR kodu okutun</p>
                          <p className="text-xs font-mono mt-1">{vehicle.qrCode}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
