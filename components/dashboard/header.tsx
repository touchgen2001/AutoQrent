"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  BellRing,
  BellOff,
  Smartphone,
  Check,
  Search,
  ChevronDown,
  Car,
  Users,
  QrCode,
  BarChart3,
  LayoutDashboard,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { MobileMenuButton } from "./sidebar"
import type { PanelAlertCenterResponse, PanelLead, PanelVehicle } from "@/lib/panel-types"
import { clearPanelAuthSession, getPanelAuthSession } from "@/lib/client/panel-auth"
import { useAlertDesktopNotifications } from "@/lib/client/use-alert-notifications"
import { enablePushNotifications, hasActivePushSubscription, isPushSupported } from "@/lib/client/push-notifications"

const ALERT_POLL_INTERVAL_MS = 30 * 1000

interface HeaderProps {
  onMobileMenuClick: () => void
}

type VehicleApiResponse =
  | { ok: true; items: PanelVehicle[] }
  | { ok: false; message?: string }

type LeadsApiResponse =
  | { ok: true; items: PanelLead[] }
  | { ok: false; message?: string }

type AlertsApiResponse =
  | ({ ok: true } & PanelAlertCenterResponse)
  | { ok: false; message?: string }

export function DashboardHeader({ onMobileMenuClick }: HeaderProps) {
  const router = useRouter()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [vehicles, setVehicles] = useState<PanelVehicle[]>([])
  const [leads, setLeads] = useState<PanelLead[]>([])
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [hasSearchLoaded, setHasSearchLoaded] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<PanelAlertCenterResponse | null>(null)
  const [alertsError, setAlertsError] = useState<string | null>(null)
  const [isAlertsLoading, setIsAlertsLoading] = useState(true)
  const [accountName, setAccountName] = useState("Galeri Sahibi")
  const [accountGallery, setAccountGallery] = useState("Galeri")
  const { permission: notificationPermission, requestPermission: requestNotificationPermission } =
    useAlertDesktopNotifications(alerts)
  const [pushStatus, setPushStatus] = useState<"idle" | "working" | "enabled" | "denied" | "unsupported" | "failed">("idle")

  useEffect(() => {
    let active = true
    void (async () => {
      if (!isPushSupported()) {
        if (active) setPushStatus("unsupported")
        return
      }
      const has = await hasActivePushSubscription()
      if (active && has) setPushStatus("enabled")
    })()
    return () => {
      active = false
    }
  }, [])

  const handleEnablePush = async () => {
    setPushStatus("working")
    const result = await enablePushNotifications()
    setPushStatus(result)
  }

  const handleSearchDialogOpenChange = (open: boolean) => {
    setIsSearchOpen(open)
    if (!open) {
      setSearchQuery("")
      return
    }

    if (!hasSearchLoaded && !isSearchLoading) {
      void fetchSearchData()
    }
  }

  const fetchSearchData = async () => {
    setIsSearchLoading(true)
    setSearchError(null)
    try {
      const [vehiclesResponse, leadsResponse] = await Promise.all([
        fetch("/api/panel/vehicles", { cache: "no-store" }),
        fetch("/api/panel/leads", { cache: "no-store" }),
      ])

      const vehiclesData = (await vehiclesResponse.json()) as VehicleApiResponse
      const leadsData = (await leadsResponse.json()) as LeadsApiResponse

      if (!vehiclesResponse.ok || !vehiclesData.ok) {
        const message = "message" in vehiclesData ? vehiclesData.message : undefined
        setSearchError(message ?? "Araç verisi alınamadı.")
        return
      }

      if (!leadsResponse.ok || !leadsData.ok) {
        const message = "message" in leadsData ? leadsData.message : undefined
        setSearchError(message ?? "Müşteri talebi verisi alınamadı.")
        return
      }

      setVehicles(vehiclesData.items)
      setLeads(leadsData.items)
      setHasSearchLoaded(true)
    } catch {
      setSearchError("Arama verileri yüklenemedi.")
    } finally {
      setIsSearchLoading(false)
    }
  }

  const fetchAlerts = async () => {
    setAlertsError(null)
    setIsAlertsLoading(true)
    try {
      const response = await fetch("/api/panel/alerts", { cache: "no-store" })
      const data = (await response.json()) as AlertsApiResponse

      if (!response.ok || !data.ok) {
        const message = "message" in data ? data.message : undefined
        setAlerts(null)
        setAlertsError(message ?? "Uyarılar alınamadı.")
        return
      }

      setAlerts(data)
    } catch {
      setAlerts(null)
      setAlertsError("Uyarılar alınamadı.")
    } finally {
      setIsAlertsLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void (async () => {
      const session = await getPanelAuthSession()
      if (!active || !session) return
      setAccountName(session.fullName)
      setAccountGallery(session.galleryName)
    })()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchAlerts()
    }, 0)

    const intervalId = window.setInterval(() => {
      void fetchAlerts()
    }, ALERT_POLL_INTERVAL_MS)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredVehicles = useMemo(() => {
    if (!normalizedQuery) return vehicles.slice(0, 8)
    return vehicles
      .filter((vehicle) => {
        const title = `${vehicle.brand} ${vehicle.model} ${vehicle.variant}`.toLowerCase()
        return (
          title.includes(normalizedQuery)
          || vehicle.brand.toLowerCase().includes(normalizedQuery)
          || vehicle.model.toLowerCase().includes(normalizedQuery)
          || String(vehicle.year).includes(normalizedQuery)
        )
      })
      .slice(0, 8)
  }, [normalizedQuery, vehicles])

  const filteredLeads = useMemo(() => {
    if (!normalizedQuery) return leads.slice(0, 8)
    return leads
      .filter((lead) => {
        return (
          lead.customerName.toLowerCase().includes(normalizedQuery)
          || lead.customerPhone.toLowerCase().includes(normalizedQuery)
          || (lead.vehicleTitle || "").toLowerCase().includes(normalizedQuery)
        )
      })
      .slice(0, 8)
  }, [leads, normalizedQuery])

  const openAlerts = alerts?.alerts.slice(0, 5) ?? []
  const hasAlertDot = (alerts?.summary.open ?? 0) > 0
  const initials = accountName
    .split(" ")
    .map((part) => part.trim()[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "GS"
  const handleLogout = () => {
    void clearPanelAuthSession()
    router.push("/giris")
  }

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-background border-b border-border">
        <div className="flex items-center justify-between h-full px-4 md:px-6">
          {/* Left Side */}
          <div className="flex items-center gap-4">
            <MobileMenuButton onClick={onMobileMenuClick} />

            {/* Search */}
            <div className="hidden sm:flex items-center relative">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                readOnly
                onClick={() => handleSearchDialogOpenChange(true)}
                onFocus={() => handleSearchDialogOpenChange(true)}
                placeholder="Araç, müşteri veya QR kodu ara..."
                className="w-64 lg:w-80 pl-9 h-9 bg-muted border-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Mobile Search */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Panel arama"
              onClick={() => handleSearchDialogOpenChange(true)}
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Bildirimler">
                  <Bell className="w-5 h-5" />
                  {hasAlertDot && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Canlı Uyarılar</span>
                  <span className="text-xs text-muted-foreground">{alerts?.summary.open ?? 0} açık</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notificationPermission === "default" && (
                  <>
                    <DropdownMenuItem
                      className="gap-2"
                      onSelect={(event) => {
                        event.preventDefault()
                        void requestNotificationPermission()
                      }}
                    >
                      <BellRing className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Masaüstü bildirimlerini aç</p>
                        <p className="text-xs text-muted-foreground">Yeni talep gelince anında haber al.</p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {notificationPermission === "granted" && (
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Masaüstü bildirimleri açık
                  </div>
                )}
                {notificationPermission === "denied" && (
                  <div className="flex items-start gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                    <BellOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Masaüstü bildirimleri engellenmiş. Tarayıcı ayarlarından izin verebilirsiniz.</span>
                  </div>
                )}
                {pushStatus !== "unsupported" && pushStatus !== "enabled" && (
                  <>
                    <DropdownMenuItem
                      className="gap-2"
                      disabled={pushStatus === "working"}
                      onSelect={(event) => {
                        event.preventDefault()
                        void handleEnablePush()
                      }}
                    >
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Telefona bildirim gönder</p>
                        <p className="text-xs text-muted-foreground">
                          {pushStatus === "working"
                            ? "Etkinleştiriliyor..."
                            : pushStatus === "denied"
                              ? "İzin verilmedi — tarayıcı ayarından açabilirsiniz."
                              : pushStatus === "failed"
                                ? "Kurulamadı, lütfen tekrar deneyin."
                                : "Panel kapalıyken bile yeni talepleri telefonuna bildir."}
                        </p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {pushStatus === "enabled" && (
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Telefon bildirimleri açık
                  </div>
                )}
                {isAlertsLoading && (
                  <div className="px-2 py-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uyarılar yükleniyor...
                  </div>
                )}
                {!isAlertsLoading && alertsError && (
                  <div className="px-2 py-3 text-sm text-destructive">{alertsError}</div>
                )}
                {!isAlertsLoading && !alertsError && openAlerts.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    Aktif alarm bulunmuyor.
                  </div>
                )}
                {!isAlertsLoading && !alertsError && openAlerts.length > 0 && openAlerts.map((alert) => (
                  <DropdownMenuItem
                    key={alert.id}
                    onClick={() => router.push(alert.actionHref)}
                    className="items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.metricValue}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/panel">Uyarı Merkezi</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/panel/audit-logs">Denetim Kayıtlarını Aç</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">{initials}</span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{accountName}</p>
                    <p className="text-xs text-muted-foreground">{accountGallery}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/panel/ayarlar?tab=profile">Profil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/panel/ayarlar?tab=appearance">Galeri Ayarları</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/panel/ayarlar?tab=subscription">Abonelik</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={(event) => {
                    event.preventDefault()
                    handleLogout()
                  }}
                >
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <CommandDialog
        open={isSearchOpen}
        onOpenChange={handleSearchDialogOpenChange}
        title="Panel Arama"
        description="Araçlar, müşteri talepleri ve panel sayfaları içinde hızlı arama."
      >
        <CommandInput
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder="Araç, müşteri veya telefon ara..."
        />
        <CommandList>
          {isSearchLoading ? (
            <div className="px-3 py-6 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Arama verileri yükleniyor...
            </div>
          ) : searchError ? (
            <div className="px-3 py-6 text-sm text-destructive">{searchError}</div>
          ) : (
            <>
              <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
              <CommandGroup heading="Hızlı Sayfalar">
                <CommandItem onSelect={() => { setIsSearchOpen(false); router.push("/panel") }}>
                  <LayoutDashboard />
                  Genel Bakış
                </CommandItem>
                <CommandItem onSelect={() => { setIsSearchOpen(false); router.push("/panel/araclar") }}>
                  <Car />
                  Araçlar
                </CommandItem>
                <CommandItem onSelect={() => { setIsSearchOpen(false); router.push("/panel/qr-kodlar") }}>
                  <QrCode />
                  QR Kodlar
                </CommandItem>
                <CommandItem onSelect={() => { setIsSearchOpen(false); router.push("/panel/leadler") }}>
                  <Users />
                  Müşteri Talepleri
                </CommandItem>
                <CommandItem onSelect={() => { setIsSearchOpen(false); router.push("/panel/analitik") }}>
                  <BarChart3 />
                  Analitik
                </CommandItem>
                <CommandShortcut>Panel</CommandShortcut>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Araç Sonuçları">
                {filteredVehicles.map((vehicle) => (
                  <CommandItem
                    key={vehicle.id}
                    value={`${vehicle.brand} ${vehicle.model} ${vehicle.variant} ${vehicle.year}`}
                    onSelect={() => {
                      setIsSearchOpen(false)
                      router.push(`/panel/araclar/${vehicle.id}`)
                    }}
                  >
                    <Car />
                    <span className="truncate">
                      {vehicle.brand} {vehicle.model} {vehicle.variant}
                    </span>
                    <CommandShortcut>{vehicle.year}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Müşteri Talebi Sonuçları">
                {filteredLeads.map((lead) => (
                  <CommandItem
                    key={lead.id}
                    value={`${lead.customerName} ${lead.customerPhone} ${lead.vehicleTitle || ""}`}
                    onSelect={() => {
                      setIsSearchOpen(false)
                      router.push("/panel/leadler")
                    }}
                  >
                    <Users />
                    <span className="truncate">{lead.customerName}</span>
                    <CommandShortcut>{lead.customerPhone}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
