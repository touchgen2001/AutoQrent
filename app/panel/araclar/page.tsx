"use client"

import { useEffect, useMemo, useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { VehicleImageFrame } from "@/components/shared/vehicle-image-frame"
import { cn } from "@/lib/utils"
import type { PanelVehicle } from "@/lib/panel-types"

const statusMap = {
  active: { label: "Satılık", color: "bg-green-100 text-green-700" },
  reserved: { label: "Rezerve", color: "bg-amber-100 text-amber-700" },
  sold: { label: "Satıldı", color: "bg-muted text-muted-foreground" },
}

const FILTER_ALL = "__all__"

const priceFilterPresets = [
  { value: FILTER_ALL, label: "Tüm Fiyatlar" },
  { value: "0-750000", label: "0 - 750.000 TL" },
  { value: "750000-1500000", label: "750.000 - 1.500.000 TL" },
  { value: "1500000-3000000", label: "1.500.000 - 3.000.000 TL" },
  { value: "3000000-999999999", label: "3.000.000 TL+" },
] as const

function matchesPriceFilter(price: number, selected: string) {
  if (selected === FILTER_ALL) return true

  const [rawMin, rawMax] = selected.split("-")
  const min = Number(rawMin)
  const max = Number(rawMax)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return true

  return price >= min && price <= max
}

export default function VehiclesPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState(FILTER_ALL)
  const [yearFilter, setYearFilter] = useState(FILTER_ALL)
  const [fuelFilter, setFuelFilter] = useState(FILTER_ALL)
  const [priceFilter, setPriceFilter] = useState(FILTER_ALL)
  const [vehicles, setVehicles] = useState<PanelVehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  const brandOptions = useMemo(
    () => Array.from(new Set(vehicles.map((vehicle) => vehicle.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr")),
    [vehicles],
  )

  const yearOptions = useMemo(
    () => Array.from(new Set(vehicles.map((vehicle) => vehicle.year))).sort((a, b) => b - a),
    [vehicles],
  )

  const fuelOptions = useMemo(
    () => Array.from(new Set(vehicles.map((vehicle) => vehicle.fuel).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr")),
    [vehicles],
  )

  const hasActiveQuickFilters = brandFilter !== FILTER_ALL
    || yearFilter !== FILTER_ALL
    || fuelFilter !== FILTER_ALL
    || priceFilter !== FILTER_ALL

  const fetchVehicles = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch("/api/panel/vehicles", { cache: "no-store" })
      const data = (await response.json()) as {
        ok?: boolean
        message?: string
        items?: PanelVehicle[]
      }

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message ?? "Araç listesi alınamadı.")
        return
      }

      setVehicles(data.items || [])
    } catch {
      setErrorMessage("Ağ hatası nedeniyle araç listesi alınamadı.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchVehicles()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        vehicle.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.variant.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter
      const matchesBrand = brandFilter === FILTER_ALL || vehicle.brand === brandFilter
      const matchesYear = yearFilter === FILTER_ALL || String(vehicle.year) === yearFilter
      const matchesFuel = fuelFilter === FILTER_ALL || vehicle.fuel === fuelFilter
      const matchesPrice = matchesPriceFilter(vehicle.price, priceFilter)

      return matchesSearch && matchesStatus && matchesBrand && matchesYear && matchesFuel && matchesPrice
    })
  }, [vehicles, searchQuery, statusFilter, brandFilter, yearFilter, fuelFilter, priceFilter])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleVehicleDelete = async (vehicle: PanelVehicle) => {
    if (isDeletingId) return
    setIsDeletingId(vehicle.id)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/panel/vehicles/${vehicle.id}`, {
        method: "DELETE",
      })
      const data = (await response.json()) as { ok?: boolean; message?: string }

      if (!response.ok || !data.ok) {
        setErrorMessage(data.message ?? "Araç silinemedi.")
        return
      }

      setVehicles((prev) => prev.filter((item) => item.id !== vehicle.id))
    } catch {
      setErrorMessage("Ağ hatası nedeniyle araç silinemedi.")
    } finally {
      setIsDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Araçlar</h1>
          <p className="text-muted-foreground">
            Toplam {vehicles.length} araç kayıtlı · Görünen {filteredVehicles.length}
          </p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/panel/araclar/ekle">
            <Plus className="w-4 h-4 mr-2" />
            Araç Ekle
          </Link>
        </Button>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

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
              <Button
                variant="outline"
                size="icon"
                className={cn(hasActiveQuickFilters && "border-accent text-accent")}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Hızlı Filtreler</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Marka</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup value={brandFilter} onValueChange={setBrandFilter}>
                    <DropdownMenuRadioItem value={FILTER_ALL}>Tümü</DropdownMenuRadioItem>
                    {brandOptions.map((brand) => (
                      <DropdownMenuRadioItem key={brand} value={brand}>
                        {brand}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Yıl</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup value={yearFilter} onValueChange={setYearFilter}>
                    <DropdownMenuRadioItem value={FILTER_ALL}>Tümü</DropdownMenuRadioItem>
                    {yearOptions.map((year) => (
                      <DropdownMenuRadioItem key={year} value={String(year)}>
                        {year}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Fiyat Aralığı</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup value={priceFilter} onValueChange={setPriceFilter}>
                    {priceFilterPresets.map((option) => (
                      <DropdownMenuRadioItem key={option.value} value={option.value}>
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Yakıt Tipi</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuRadioGroup value={fuelFilter} onValueChange={setFuelFilter}>
                    <DropdownMenuRadioItem value={FILTER_ALL}>Tümü</DropdownMenuRadioItem>
                    {fuelOptions.map((fuel) => (
                      <DropdownMenuRadioItem key={fuel} value={fuel}>
                        {fuel}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  setBrandFilter(FILTER_ALL)
                  setYearFilter(FILTER_ALL)
                  setFuelFilter(FILTER_ALL)
                  setPriceFilter(FILTER_ALL)
                }}
                disabled={!hasActiveQuickFilters}
              >
                Filtreleri Temizle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-muted" : "hover:bg-muted/50")}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 transition-colors", viewMode === "list" ? "bg-muted" : "hover:bg-muted/50")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Araçlar yükleniyor...</CardContent>
        </Card>
      ) : filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Araç Bulunamadı</h3>
            <p className="text-muted-foreground mb-4">Arama kriterlerinize uygun araç bulunamadı.</p>
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
              <div className="relative h-44 bg-muted">
                <VehicleImageFrame
                  src={vehicle.image}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  imageClassName="transition-transform duration-300 hover:scale-105"
                />
                <Badge className={cn("absolute top-3 left-3", statusMap[vehicle.status].color)}>
                  {statusMap[vehicle.status].label}
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
                    <DropdownMenuItem asChild>
                      <Link href={`/panel/qr-kodlar/yazdir?ids=${vehicle.id}`}>
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Kodu Yazdır
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      disabled={isDeletingId === vehicle.id}
                      onSelect={(event) => {
                        event.preventDefault()
                        void handleVehicleDelete(vehicle)
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeletingId === vehicle.id ? "Siliniyor..." : "Sil"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{vehicle.brand} {vehicle.model}</h3>
                    <p className="text-sm text-muted-foreground">{vehicle.variant || "-"} - {vehicle.year}</p>
                  </div>
                </div>

                <div className="text-xl font-bold text-accent mb-3">{formatPrice(vehicle.price)}</div>

                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>{vehicle.mileage.toLocaleString("tr-TR")} km</div>
                  <div>{vehicle.fuel}</div>
                  <div>{vehicle.transmission}</div>
                  <div>{vehicle.color || "-"}</div>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span>{vehicle.scans} tarama</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>{vehicle.leads} müşteri talebi</span>
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
                        <div className="w-12 h-12 bg-muted rounded-lg shrink-0 overflow-hidden">
                          <VehicleImageFrame
                            src={vehicle.image}
                            alt={`${vehicle.brand} ${vehicle.model}`}
                            sizes="48px"
                            placeholderLabel="Yok"
                            placeholderClassName="[&_svg]:h-5 [&_svg]:w-5 [&_span]:sr-only"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{vehicle.brand} {vehicle.model}</p>
                          <p className="text-sm text-muted-foreground">{vehicle.variant || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">{vehicle.year}</td>
                    <td className="p-4 font-medium text-accent">{formatPrice(vehicle.price)}</td>
                    <td className="p-4 hidden lg:table-cell">{vehicle.mileage.toLocaleString("tr-TR")} km</td>
                    <td className="p-4 hidden sm:table-cell">
                      <Badge className={statusMap[vehicle.status].color}>{statusMap[vehicle.status].label}</Badge>
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
                          <DropdownMenuItem asChild>
                            <Link href={`/panel/qr-kodlar/yazdir?ids=${vehicle.id}`}>
                              <QrCode className="w-4 h-4 mr-2" />
                              QR Kodu Yazdır
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            disabled={isDeletingId === vehicle.id}
                            onSelect={(event) => {
                              event.preventDefault()
                              void handleVehicleDelete(vehicle)
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {isDeletingId === vehicle.id ? "Siliniyor..." : "Sil"}
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
