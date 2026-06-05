"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Search,
  Download,
  Printer,
  QrCode,
  Eye,
  Copy,
  Check,
  ExternalLink,
  RefreshCcw,
  Clock3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { LiveDataStatus } from "@/components/shared/live-data-status"
import { QrCodeImage } from "@/components/shared/qr-code-image"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/vehicle-display"

type QrVehicle = {
  vehicleId: string
  routeId: string
  publicUrl: string
  vehicleTitle: string
  price: number
  qrCode: string
  scans: number
  lastScanAt: string | null
}

type QrScanEvent = {
  vehicleId: string
  vehicleTitle: string
  scannedAt: string
  source: string
}

type QrApiResponse =
  | {
      ok: true
      vehicles: QrVehicle[]
      recentScans: QrScanEvent[]
    }
  | {
      ok: false
      message?: string
    }

const LIVE_REFRESH_INTERVAL_MS = 30 * 1000

function formatRelativeTime(iso: string | null) {
  if (!iso) return "Henüz tarama yok"

  const target = Date.parse(iso)
  if (!Number.isFinite(target)) return "Bilinmiyor"

  const diffMs = Date.now() - target
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Az önce"
  if (diffMin < 60) return `${diffMin} dk önce`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} saat önce`

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay} gün önce`

  return new Date(iso).toLocaleDateString("tr-TR")
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

export default function QRCodesPage() {
  const fetchInFlightRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<QrVehicle[]>([])
  const [recentScans, setRecentScans] = useState<QrScanEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchQrData = useCallback(async (
    options: { background?: boolean; signal?: AbortSignal } = {},
  ) => {
    if (fetchInFlightRef.current) return

    const isBackgroundRefresh = Boolean(options.background)
    fetchInFlightRef.current = true
    if (isBackgroundRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setErrorMessage(null)
    if (!isBackgroundRefresh) {
      setDownloadMessage(null)
    }

    try {
      const response = await fetch("/api/panel/qr-codes", {
        cache: "no-store",
        signal: options.signal,
      })
      const data = (await response.json()) as QrApiResponse

      if (!response.ok || !data.ok) {
        setErrorMessage(("message" in data && data.message) || "QR verileri alınamadı.")
        return
      }

      setVehicles(data.vehicles)
      setRecentScans(data.recentScans)
      const validIds = new Set(data.vehicles.map((vehicle) => vehicle.vehicleId))
      setSelectedVehicles((current) => current.filter((id) => validIds.has(id)))
      setLastUpdatedAt(new Date().toISOString())
    } catch (error) {
      if (isAbortError(error)) return
      setErrorMessage("Ağ hatası nedeniyle QR verileri alınamadı.")
    } finally {
      fetchInFlightRef.current = false
      if (isBackgroundRefresh) {
        setIsRefreshing(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void fetchQrData({ signal: controller.signal })
    }, 0)
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return
      void fetchQrData({ background: true })
    }, LIVE_REFRESH_INTERVAL_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
      window.clearInterval(intervalId)
    }
  }, [fetchQrData])

  const filteredVehicles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return vehicles.filter((vehicle) => {
      if (!query) return true
      return (
        vehicle.vehicleTitle.toLowerCase().includes(query) ||
        vehicle.qrCode.toLowerCase().includes(query) ||
        vehicle.routeId.toLowerCase().includes(query)
      )
    })
  }, [searchQuery, vehicles])
  const filteredVehicleIds = useMemo(
    () => filteredVehicles.map((vehicle) => vehicle.vehicleId),
    [filteredVehicles],
  )
  const validVehicleIdSet = useMemo(
    () => new Set(vehicles.map((vehicle) => vehicle.vehicleId)),
    [vehicles],
  )
  const validSelectedVehicleIds = useMemo(
    () => selectedVehicles.filter((id) => validVehicleIdSet.has(id)),
    [selectedVehicles, validVehicleIdSet],
  )
  const selectedFilteredVehicleCount = useMemo(
    () => filteredVehicleIds.filter((id) => validSelectedVehicleIds.includes(id)).length,
    [filteredVehicleIds, validSelectedVehicleIds],
  )
  const isAllFilteredSelected = filteredVehicleIds.length > 0
    && selectedFilteredVehicleCount === filteredVehicleIds.length

  const totalScans = useMemo(
    () => vehicles.reduce((sum, vehicle) => sum + vehicle.scans, 0),
    [vehicles],
  )

  const latestScanAt = useMemo(() => {
    const values = vehicles
      .map((item) => item.lastScanAt)
      .filter((item): item is string => Boolean(item))
      .map((item) => Date.parse(item))
      .filter((item) => Number.isFinite(item))

    if (values.length === 0) return null

    return new Date(Math.max(...values)).toISOString()
  }, [vehicles])

  const scannedVehiclePercent = useMemo(() => {
    if (vehicles.length <= 0) return 0
    const scannedVehicleCount = vehicles.filter((vehicle) => vehicle.scans > 0).length
    return Math.round((scannedVehicleCount / vehicles.length) * 100)
  }, [vehicles])

  const handleSelectAll = () => {
    setDownloadMessage(null)
    const filteredSet = new Set(filteredVehicleIds)

    if (isAllFilteredSelected) {
      setSelectedVehicles((current) => current.filter((id) => !filteredSet.has(id)))
      return
    }

    setSelectedVehicles((current) => Array.from(new Set([...current, ...filteredVehicleIds])))
  }

  const handleSelect = (id: string) => {
    setDownloadMessage(null)
    if (selectedVehicles.includes(id)) {
      setSelectedVehicles(selectedVehicles.filter((value) => value !== id))
      return
    }

    setSelectedVehicles([...selectedVehicles, id])
  }

  const copyToClipboard = async (id: string, publicUrl: string) => {
    await navigator.clipboard.writeText(publicUrl)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadSelectedQRCodes = () => {
    if (selectedVehicles.length === 0) return

    const selectedSet = new Set(validSelectedVehicleIds)
    const selectedRows = vehicles.filter((vehicle) => selectedSet.has(vehicle.vehicleId))
    if (selectedRows.length === 0) {
      setDownloadMessage("İndirilecek seçim bulunamadı.")
      return
    }

    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`
    const header = "arac_adi,qr_kodu,sayfa_adresi,qr_url,tarama,son_tarama"
    const lines = selectedRows.map((vehicle) => {
      return [
        escapeCsv(vehicle.vehicleTitle),
        escapeCsv(vehicle.qrCode),
        escapeCsv(`/arac/${vehicle.routeId}`),
        escapeCsv(vehicle.publicUrl),
        String(vehicle.scans),
        escapeCsv(vehicle.lastScanAt ?? ""),
      ].join(",")
    })

    const content = `\uFEFF${header}\n${lines.join("\n")}`
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const dateStamp = new Date().toISOString().slice(0, 10)
    link.href = objectUrl
    link.download = `qr-kod-listesi-${dateStamp}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
    setDownloadMessage(`${selectedRows.length} QR kaydı indirildi.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QR Kodlar</h1>
          <p className="text-muted-foreground">Araçlarınız için QR kodları yönetin ve yazdırın</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <LiveDataStatus
            lastUpdatedAt={lastUpdatedAt}
            isRefreshing={isRefreshing}
            intervalSeconds={LIVE_REFRESH_INTERVAL_MS / 1000}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void fetchQrData()} disabled={isLoading || isRefreshing}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Yenile
            </Button>
            <Button
              variant="outline"
              disabled={validSelectedVehicleIds.length === 0}
              onClick={downloadSelectedQRCodes}
            >
              <Download className="w-4 h-4 mr-2" />
              İndir ({validSelectedVehicleIds.length})
            </Button>
            {validSelectedVehicleIds.length > 0 ? (
              <Button
                asChild
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Link href={`/panel/qr-kodlar/yazdir?ids=${validSelectedVehicleIds.join(",")}`}>
                  <Printer className="w-4 h-4 mr-2" />
                  Yazdır ({validSelectedVehicleIds.length})
                </Link>
              </Button>
            ) : (
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled>
                <Printer className="w-4 h-4 mr-2" />
                Yazdır (0)
              </Button>
            )}
          </div>
        </div>
      </div>

      {downloadMessage && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {downloadMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{vehicles.length}</div>
            <p className="text-sm text-muted-foreground">Toplam QR Kod</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{totalScans.toLocaleString("tr-TR")}</div>
            <p className="text-sm text-muted-foreground">Toplam Tarama</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">%{scannedVehiclePercent}</div>
            <p className="text-sm text-muted-foreground">Tarama Alan Araç Oranı</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-accent">{formatRelativeTime(latestScanAt)}</div>
            <p className="text-sm text-muted-foreground">Son Tarama</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Araç veya QR kodu ara..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg">
          <Checkbox
            id="selectAll"
            checked={isAllFilteredSelected}
            onCheckedChange={handleSelectAll}
          />
          <label htmlFor="selectAll" className="text-sm cursor-pointer">
            Tümünü Seç
          </label>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">QR verileri yükleniyor...</CardContent>
        </Card>
      ) : filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">QR Kod Bulunamadı</h3>
            <p className="text-muted-foreground mb-4">Arama kriterlerinize uygun QR kod bulunamadı.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => (
            <Card
              key={vehicle.vehicleId}
              className={cn(
                "overflow-hidden transition-all",
                selectedVehicles.includes(vehicle.vehicleId) && "ring-2 ring-accent",
              )}
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className="w-32 h-32 bg-muted flex items-center justify-center shrink-0 relative">
                    <QrCodeImage
                      value={vehicle.publicUrl}
                      alt={`${vehicle.vehicleTitle} QR kodu`}
                      size={180}
                      className="h-20 w-20"
                    />
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedVehicles.includes(vehicle.vehicleId)}
                        onCheckedChange={() => handleSelect(vehicle.vehicleId)}
                      />
                    </div>
                  </div>

                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{vehicle.vehicleTitle}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">Sayfa: /arac/{vehicle.routeId}</p>
                      </div>
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{vehicle.qrCode}</span>
                    </div>

                    <div className="mt-2 text-sm font-medium text-accent">{formatPrice(vehicle.price)}</div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{vehicle.scans} tarama</span>
                      </div>
                      <span>•</span>
                      <span>{formatRelativeTime(vehicle.lastScanAt)}</span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => void copyToClipboard(vehicle.vehicleId, vehicle.publicUrl)}
                      >
                        {copiedId === vehicle.vehicleId ? (
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
                      <Button variant="outline" size="sm" className="h-8 px-2" asChild>
                        <Link
                          href={vehicle.publicUrl}
                          target="_blank"
                          aria-label={`${vehicle.vehicleTitle} herkese açık araç sayfasını aç`}
                        >
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
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            Son QR Olayları
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentScans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz tarama olayı bulunmuyor.</p>
          ) : (
            <div className="space-y-2">
              {recentScans.slice(0, 10).map((event, index) => (
                <div
                  key={`${event.vehicleId}-${event.scannedAt}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-border/60 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.vehicleTitle}</p>
                    <p className="text-xs text-muted-foreground">Kaynak: {event.source || "bilinmiyor"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(event.scannedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
