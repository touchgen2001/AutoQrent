"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Printer,
  QrCode,
  Settings,
  Grid3X3,
  RefreshCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/vehicle-display"

type QrVehicle = {
  vehicleId: string
  routeId: string
  vehicleTitle: string
  price: number
  qrCode: string
  scans: number
  lastScanAt: string | null
}

type QrApiResponse =
  | {
      ok: true
      vehicles: QrVehicle[]
    }
  | {
      ok: false
      message?: string
    }

type SettingsApiResponse = {
  ok?: boolean
  message?: string
  settings?: {
    name: string
    logoUrl: string
  }
}

const templates = [
  { id: "sticker", name: "Cam Stickeri", size: "10x10 cm" },
  { id: "label", name: "Araç Etiketi", size: "5x8 cm" },
  { id: "card", name: "Bilgi Kartı", size: "9x5 cm" },
  { id: "poster", name: "Tanıtım Posteri", size: "A4" },
] as const

function PrintQRPageContent() {
  const searchParams = useSearchParams()
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof templates)[number]["id"]>("sticker")
  const [showPrice, setShowPrice] = useState(true)
  const [showGalleryLogo, setShowGalleryLogo] = useState(true)
  const [showVehicleInfo, setShowVehicleInfo] = useState(true)
  const [paperSize, setPaperSize] = useState("a4")
  const [vehicles, setVehicles] = useState<QrVehicle[]>([])
  const [galleryName, setGalleryName] = useState<string>("Galeri")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedIds = useMemo(() => {
    const raw = searchParams.get("ids") || ""
    return raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  }, [searchParams])

  const fetchVehicles = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [qrResponse, settingsResponse] = await Promise.all([
        fetch("/api/panel/qr-codes", { cache: "no-store", signal }),
        fetch("/api/panel/settings", { cache: "no-store", signal }),
      ])
      const data = (await qrResponse.json()) as QrApiResponse
      const settingsData = (await settingsResponse.json()) as SettingsApiResponse

      if (!qrResponse.ok || !data.ok) {
        setErrorMessage(("message" in data && data.message) || "QR verileri alınamadı.")
        return
      }

      if (settingsResponse.ok && settingsData.ok && settingsData.settings?.name) {
        setGalleryName(settingsData.settings.name)
      } else {
        setGalleryName("Galeri")
      }

      const list = selectedIds.length > 0
        ? data.vehicles.filter((vehicle) => selectedIds.includes(vehicle.vehicleId))
        : data.vehicles

      setVehicles(list)
    } catch {
      if (signal?.aborted) return
      setErrorMessage("Ağ hatası nedeniyle QR yazdırma verileri alınamadı.")
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [selectedIds])

  useEffect(() => {
    const abortController = new AbortController()
    const frame = window.requestAnimationFrame(() => {
      void fetchVehicles(abortController.signal)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      abortController.abort()
    }
  }, [fetchVehicles])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void fetchVehicles()} disabled={isLoading}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Yenile
            </Button>
            <Button onClick={handlePrint} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={vehicles.length === 0}>
              <Printer className="w-4 h-4 mr-2" />
              Yazdır
            </Button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive print:hidden">
          {errorMessage}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Yazdırma Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Şablon Seçimi</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn(
                        "p-3 border rounded-lg text-left transition-all",
                        selectedTemplate === template.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/50",
                      )}
                    >
                      <div className="text-sm font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground">{template.size}</div>
                    </button>
                  ))}
                </div>
              </div>

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

              <div className="space-y-3">
                <Label>Görüntüleme Seçenekleri</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="showPrice" checked={showPrice} onCheckedChange={(checked) => setShowPrice(Boolean(checked))} />
                    <label htmlFor="showPrice" className="text-sm cursor-pointer">Fiyatı göster</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="showLogo" checked={showGalleryLogo} onCheckedChange={(checked) => setShowGalleryLogo(Boolean(checked))} />
                    <label htmlFor="showLogo" className="text-sm cursor-pointer">Galeri başlığını göster</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="showInfo" checked={showVehicleInfo} onCheckedChange={(checked) => setShowVehicleInfo(Boolean(checked))} />
                    <label htmlFor="showInfo" className="text-sm cursor-pointer">Araç bilgilerini göster</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="print:hidden">
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                Önizleme
              </CardTitle>
            </CardHeader>
            <CardContent className="print:p-0">
              {isLoading ? (
                <div className="py-16 text-center text-muted-foreground">QR etiket verileri yükleniyor...</div>
              ) : vehicles.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">Yazdırılacak araç bulunamadı.</div>
              ) : selectedTemplate === "sticker" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-8">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.vehicleId} className="aspect-square border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center text-center print:border-solid print:border-foreground/20">
                      {showGalleryLogo && <div className="text-xs font-bold text-muted-foreground mb-2 print:text-foreground">{galleryName}</div>}
                      <div className="w-24 h-24 bg-foreground rounded-lg flex items-center justify-center mb-3">
                        <QrCode className="w-20 h-20 text-background" />
                      </div>
                      {showVehicleInfo && <div className="text-xs font-medium text-foreground line-clamp-2">{vehicle.vehicleTitle}</div>}
                      {showPrice && <div className="text-sm font-bold text-accent mt-1">{formatPrice(vehicle.price)}</div>}
                      <div className="text-xs text-muted-foreground mt-2 font-mono">{vehicle.qrCode}</div>
                    </div>
                  ))}
                </div>
              ) : selectedTemplate === "label" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-6">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.vehicleId} className="border-2 border-dashed border-border rounded-lg p-3 print:border-solid print:border-foreground/20">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 bg-foreground rounded flex items-center justify-center shrink-0">
                          <QrCode className="w-12 h-12 text-background" />
                        </div>
                        <div className="min-w-0">
                          {showGalleryLogo && <div className="text-[10px] font-bold text-muted-foreground">{galleryName}</div>}
                          {showVehicleInfo && <div className="text-xs font-medium text-foreground truncate">{vehicle.vehicleTitle}</div>}
                          {showPrice && <div className="text-xs font-bold text-accent">{formatPrice(vehicle.price)}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedTemplate === "card" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-6">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.vehicleId} className="border-2 border-dashed border-border rounded-xl p-4 flex items-center gap-4 print:border-solid print:border-foreground/20">
                      <div className="w-20 h-20 bg-foreground rounded-lg flex items-center justify-center shrink-0">
                        <QrCode className="w-16 h-16 text-background" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {showGalleryLogo && <div className="text-xs font-bold text-muted-foreground mb-1">{galleryName}</div>}
                        {showVehicleInfo && <div className="font-semibold text-foreground line-clamp-2">{vehicle.vehicleTitle}</div>}
                        {showPrice && <div className="text-lg font-bold text-accent mt-1">{formatPrice(vehicle.price)}</div>}
                        <div className="text-xs text-muted-foreground mt-1 font-mono">/arac/{vehicle.routeId}?src=qr</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.vehicleId} className="border-2 border-dashed border-border rounded-2xl p-8 print:border-solid print:border-foreground/20 print:break-after-page">
                      <div className="text-center">
                        {showGalleryLogo && <div className="text-lg font-bold text-muted-foreground mb-4">{galleryName}</div>}
                        <div className="w-48 h-48 bg-foreground rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <QrCode className="w-40 h-40 text-background" />
                        </div>
                        {showVehicleInfo && <h2 className="text-2xl font-bold text-foreground">{vehicle.vehicleTitle}</h2>}
                        {showPrice && <div className="text-3xl font-bold text-accent mt-4">{formatPrice(vehicle.price)}</div>}
                        <div className="mt-6 text-muted-foreground">
                          <p className="text-sm">Detaylı bilgi için QR kodu okutun</p>
                          <p className="text-xs font-mono mt-1">/arac/{vehicle.routeId}?src=qr</p>
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

export default function PrintQRPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Yazdırma verileri yükleniyor...</div>}>
      <PrintQRPageContent />
    </Suspense>
  )
}
