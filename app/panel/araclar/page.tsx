"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  QrCode,
  Car,
  Grid3X3,
  List,
  ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
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
    mileage: 45000,
    fuel: "Benzin",
    transmission: "Otomatik",
    color: "Siyah",
    status: "active",
    scans: 156,
    leads: 12,
    image: null
  },
  {
    id: "2",
    brand: "Mercedes-Benz",
    model: "C Serisi",
    variant: "C180 AMG",
    year: 2022,
    price: 2850000,
    mileage: 32000,
    fuel: "Benzin",
    transmission: "Otomatik",
    color: "Beyaz",
    status: "active",
    scans: 134,
    leads: 8,
    image: null
  },
  {
    id: "3",
    brand: "Audi",
    model: "A4",
    variant: "2.0 TDI",
    year: 2021,
    price: 1950000,
    mileage: 67000,
    fuel: "Dizel",
    transmission: "Otomatik",
    color: "Gri",
    status: "active",
    scans: 98,
    leads: 6,
    image: null
  },
  {
    id: "4",
    brand: "Volkswagen",
    model: "Passat",
    variant: "1.5 TSI",
    year: 2022,
    price: 1750000,
    mileage: 28000,
    fuel: "Benzin",
    transmission: "Otomatik",
    color: "Lacivert",
    status: "reserved",
    scans: 87,
    leads: 5,
    image: null
  },
  {
    id: "5",
    brand: "Toyota",
    model: "Corolla",
    variant: "1.8 Hybrid",
    year: 2023,
    price: 1650000,
    mileage: 15000,
    fuel: "Hibrit",
    transmission: "Otomatik",
    color: "Kırmızı",
    status: "active",
    scans: 76,
    leads: 4,
    image: null
  },
  {
    id: "6",
    brand: "Honda",
    model: "Civic",
    variant: "1.5 VTEC",
    year: 2021,
    price: 1450000,
    mileage: 52000,
    fuel: "Benzin",
    transmission: "Otomatik",
    color: "Gümüş",
    status: "sold",
    scans: 45,
    leads: 3,
    image: null
  },
]

const statusMap = {
  active: { label: "Satılık", color: "bg-green-100 text-green-700" },
  reserved: { label: "Rezerve", color: "bg-amber-100 text-amber-700" },
  sold: { label: "Satıldı", color: "bg-muted text-muted-foreground" },
}

export default function VehiclesPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch = 
      vehicle.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.variant.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter

    return matchesSearch && matchesStatus
  })

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
          <h1 className="text-2xl font-bold text-foreground">Araçlar</h1>
          <p className="text-muted-foreground">Toplam {vehicles.length} araç kayıtlı</p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/panel/araclar/ekle">
            <Plus className="w-4 h-4 mr-2" />
            Araç Ekle
          </Link>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Araç ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="active">Satılık</SelectItem>
              <SelectItem value="reserved">Rezerve</SelectItem>
              <SelectItem value="sold">Satıldı</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Marka</DropdownMenuItem>
              <DropdownMenuItem>Yıl</DropdownMenuItem>
              <DropdownMenuItem>Fiyat Aralığı</DropdownMenuItem>
              <DropdownMenuItem>Yakıt Tipi</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid" ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list" ? "bg-muted" : "hover:bg-muted/50"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Vehicles Grid/List */}
      {filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Araç Bulunamadı</h3>
            <p className="text-muted-foreground mb-4">
              Arama kriterlerinize uygun araç bulunamadı.
            </p>
            <Button asChild>
              <Link href="/panel/araclar/ekle">
                <Plus className="w-4 h-4 mr-2" />
                İlk Aracınızı Ekleyin
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="overflow-hidden hover:border-accent/30 hover:shadow-md transition-all">
              {/* Vehicle Image */}
              <div className="relative h-44 bg-muted">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Car className="w-16 h-16 text-muted-foreground/30" />
                </div>
                <Badge className={cn("absolute top-3 left-3", statusMap[vehicle.status as keyof typeof statusMap].color)}>
                  {statusMap[vehicle.status as keyof typeof statusMap].label}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-background/80 hover:bg-background">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/panel/araclar/${vehicle.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        Görüntüle
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/panel/araclar/${vehicle.id}/duzenle`}>
                        <Edit className="w-4 h-4 mr-2" />
                        Düzenle
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Kodu Göster
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Vehicle Info */}
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.variant} - {vehicle.year}
                    </p>
                  </div>
                </div>

                <div className="text-xl font-bold text-accent mb-3">
                  {formatPrice(vehicle.price)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>{vehicle.mileage.toLocaleString('tr-TR')} km</div>
                  <div>{vehicle.fuel}</div>
                  <div>{vehicle.transmission}</div>
                  <div>{vehicle.color}</div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span>{vehicle.scans} tarama</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>{vehicle.leads} lead</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">Araç</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Yıl</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Fiyat</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Km</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Durum</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Tarama</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0">
                          <Car className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{vehicle.brand} {vehicle.model}</p>
                          <p className="text-sm text-muted-foreground">{vehicle.variant}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">{vehicle.year}</td>
                    <td className="p-4 font-medium text-accent">{formatPrice(vehicle.price)}</td>
                    <td className="p-4 hidden lg:table-cell">{vehicle.mileage.toLocaleString('tr-TR')} km</td>
                    <td className="p-4 hidden sm:table-cell">
                      <Badge className={statusMap[vehicle.status as keyof typeof statusMap].color}>
                        {statusMap[vehicle.status as keyof typeof statusMap].label}
                      </Badge>
                    </td>
                    <td className="p-4 hidden lg:table-cell">{vehicle.scans}</td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/panel/araclar/${vehicle.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              Görüntüle
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/panel/araclar/${vehicle.id}/duzenle`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Düzenle
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <QrCode className="w-4 h-4 mr-2" />
                            QR Kodu
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
