"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Search, 
  Download, 
  Printer, 
  QrCode, 
  Car,
  Eye,
  Copy,
  Check,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// Mock data
const vehicles = [
  {
    id: "1",
    brand: "BMW",
    model: "3 Serisi",
    variant: "320i M Sport",
    year: 2023,
    price: 2450000,
    qrCode: "CG-001",
    scans: 156,
    lastScan: "2 dk önce"
  },
  {
    id: "2",
    brand: "Mercedes-Benz",
    model: "C Serisi",
    variant: "C180 AMG",
    year: 2022,
    price: 2850000,
    qrCode: "CG-002",
    scans: 134,
    lastScan: "15 dk önce"
  },
  {
    id: "3",
    brand: "Audi",
    model: "A4",
    variant: "2.0 TDI",
    year: 2021,
    price: 1950000,
    qrCode: "CG-003",
    scans: 98,
    lastScan: "32 dk önce"
  },
  {
    id: "4",
    brand: "Volkswagen",
    model: "Passat",
    variant: "1.5 TSI",
    year: 2022,
    price: 1750000,
    qrCode: "CG-004",
    scans: 87,
    lastScan: "1 saat önce"
  },
  {
    id: "5",
    brand: "Toyota",
    model: "Corolla",
    variant: "1.8 Hybrid",
    year: 2023,
    price: 1650000,
    qrCode: "CG-005",
    scans: 76,
    lastScan: "2 saat önce"
  },
]

export default function QRCodesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredVehicles = vehicles.filter((vehicle) => 
    vehicle.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.qrCode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectAll = () => {
    if (selectedVehicles.length === filteredVehicles.length) {
      setSelectedVehicles([])
    } else {
      setSelectedVehicles(filteredVehicles.map(v => v.id))
    }
  }

  const handleSelect = (id: string) => {
    if (selectedVehicles.includes(id)) {
      setSelectedVehicles(selectedVehicles.filter(v => v !== id))
    } else {
      setSelectedVehicles([...selectedVehicles, id])
    }
  }

  const copyToClipboard = async (id: string, code: string) => {
    await navigator.clipboard.writeText(`https://cebindegaleri.com/a/${code}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QR Kodlar</h1>
          <p className="text-muted-foreground">Araçlarınız için QR kodları yönetin ve yazdırın</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            disabled={selectedVehicles.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            İndir ({selectedVehicles.length})
          </Button>
          <Button 
            asChild
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={selectedVehicles.length === 0}
          >
            <Link href={`/panel/qr-kodlar/yazdir?ids=${selectedVehicles.join(',')}`}>
              <Printer className="w-4 h-4 mr-2" />
              Yazdır ({selectedVehicles.length})
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{vehicles.length}</div>
            <p className="text-sm text-muted-foreground">Toplam QR Kod</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">
              {vehicles.reduce((sum, v) => sum + v.scans, 0).toLocaleString('tr-TR')}
            </div>
            <p className="text-sm text-muted-foreground">Toplam Tarama</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">%32</div>
            <p className="text-sm text-muted-foreground">Lead Dönüşümü</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent">2 dk önce</div>
            <p className="text-sm text-muted-foreground">Son Tarama</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Select All */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Araç veya QR kodu ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg">
          <Checkbox
            id="selectAll"
            checked={selectedVehicles.length === filteredVehicles.length && filteredVehicles.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <label htmlFor="selectAll" className="text-sm cursor-pointer">
            Tümünü Seç
          </label>
        </div>
      </div>

      {/* QR Code Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((vehicle) => (
          <Card 
            key={vehicle.id} 
            className={cn(
              "overflow-hidden transition-all",
              selectedVehicles.includes(vehicle.id) && "ring-2 ring-accent"
            )}
          >
            <CardContent className="p-0">
              <div className="flex">
                {/* QR Code */}
                <div className="w-32 h-32 bg-muted flex items-center justify-center shrink-0 relative">
                  <div className="w-20 h-20 bg-foreground rounded-lg flex items-center justify-center">
                    <QrCode className="w-14 h-14 text-background" />
                  </div>
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedVehicles.includes(vehicle.id)}
                      onCheckedChange={() => handleSelect(vehicle.id)}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {vehicle.brand} {vehicle.model}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.variant} • {vehicle.year}
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {vehicle.qrCode}
                    </span>
                  </div>

                  <div className="mt-2 text-sm font-medium text-accent">
                    {formatPrice(vehicle.price)}
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{vehicle.scans} tarama</span>
                    </div>
                    <span>•</span>
                    <span>{vehicle.lastScan}</span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => copyToClipboard(vehicle.id, vehicle.qrCode)}
                    >
                      {copiedId === vehicle.id ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Kopyalandı
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Link Kopyala
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      asChild
                    >
                      <Link href={`/arac/${vehicle.qrCode}`} target="_blank">
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredVehicles.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">QR Kod Bulunamadı</h3>
            <p className="text-muted-foreground mb-4">
              Arama kriterlerinize uygun QR kod bulunamadı.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
