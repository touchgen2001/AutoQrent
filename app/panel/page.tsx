import {
  Car,
  QrCode,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MessageSquare,
  Calendar,
  PhoneCall,
  AlertTriangle,
  Sparkles,
  Timer,
  Plus,
  Store,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LiveAlertCenter } from "@/components/dashboard/live-alert-center"
import { getLeadFunnelAnalytics } from "@/lib/server/analytics-repository"
import { readPanelSessionFromCookieHeader } from "@/lib/server/panel-auth"
import {
  getPanelGalleryShowroomSummary,
  listPanelLeads,
  listPanelQrVehicleSummaries,
  listRecentPanelQrScans,
} from "@/lib/server/panel-repository"

export const dynamic = "force-dynamic"

function getTodayKeyIstanbul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date())
}

function formatRelativeTime(iso: string) {
  const target = Date.parse(iso)
  if (!Number.isFinite(target)) return "Bilinmiyor"

  const diffMs = Date.now() - target
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Az önce"
  if (diffMin < 60) return `${diffMin} dk önce`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} saat önce`

  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} gün önce`
}

export default async function DashboardPage() {
  const cookieHeader = (await headers()).get("cookie")
  const session = readPanelSessionFromCookieHeader(cookieHeader)

  if (!session) {
    redirect("/giris")
  }

  const [qrVehicles, leads, recentScans, funnel, showroomSummary] = await Promise.all([
    listPanelQrVehicleSummaries(session.email),
    listPanelLeads(session.email),
    listRecentPanelQrScans(250, session.email),
    getLeadFunnelAnalytics("30days", session.email),
    getPanelGalleryShowroomSummary(session.email),
  ])

  const totalVehicles = qrVehicles.items.length
  const totalScans = qrVehicles.items.reduce((sum, item) => sum + item.scans, 0)
  const activeLeads = leads.items.filter((lead) => !["satisa-dondu", "kayip"].includes(lead.status)).length
  const convertedLeads = leads.items.filter((lead) => lead.status === "satisa-dondu").length

  const stats = [
    {
      title: "Toplam Araç",
      value: String(totalVehicles),
      change: "Canlı",
      changeType: "positive" as const,
      icon: Car,
      href: "/panel/araclar",
    },
    {
      title: "QR Tarama",
      value: totalScans.toLocaleString("tr-TR"),
      change: "Canlı",
      changeType: "positive" as const,
      icon: QrCode,
      href: "/panel/analitik",
    },
    {
      title: "Aktif Müşteri Talebi",
      value: String(activeLeads),
      change: "Canlı",
      changeType: "positive" as const,
      icon: Users,
      href: "/panel/leadler",
    },
    {
      title: "Dönüşüm",
      value: `%${funnel.current.conversionRate}`,
      change: `${convertedLeads} satış`,
      changeType: funnel.current.conversionRate >= 10 ? "positive" : "negative",
      icon: TrendingUp,
      href: "/panel/analitik",
    },
  ]

  const recentLeads = leads.items.slice(0, 6)
  const topVehicles = [...qrVehicles.items]
    .sort((left, right) => right.scans - left.scans)
    .slice(0, 4)
  const leadCountByVehicle = new Map<string, number>()
  for (const lead of leads.items) {
    if (!lead.vehicleId) continue
    leadCountByVehicle.set(lead.vehicleId, (leadCountByVehicle.get(lead.vehicleId) || 0) + 1)
  }

  const todayKey = getTodayKeyIstanbul()
  const openLeadStatuses = new Set(["yeni", "arandi", "gorusuluyor", "test-surusu"])
  const followUpTodayCount = leads.items.filter(
    (lead) => lead.followUpDate === todayKey && openLeadStatuses.has(lead.status),
  ).length
  const overdueFollowUpCount = leads.items.filter(
    (lead) => Boolean(lead.followUpDate) && (lead.followUpDate as string) < todayKey && openLeadStatuses.has(lead.status),
  ).length
  const freshLeadCount = leads.items.filter((lead) => lead.status === "yeni").length

  const scansToday = recentScans.items.filter((scan) => scan.scannedAt.slice(0, 10) === todayKey).length

  const highScanNoLeadCount = qrVehicles.items.filter(
    (vehicle) => vehicle.scans >= 3 && (leadCountByVehicle.get(vehicle.vehicleId) || 0) === 0,
  ).length
  const inactiveVehicleCount = qrVehicles.items.filter((vehicle) => vehicle.scans === 0).length
  const conversionDelta = funnel.trend.conversionRateDelta
  const conversionDeltaLabel = `${conversionDelta > 0 ? "+" : ""}${conversionDelta}%`

  const operationQueue = [
    {
      title: "Bugün aranacak müşteri",
      description: "Takip günü bugün olan müşteriler",
      value: followUpTodayCount,
      href: "/panel/leadler",
      icon: PhoneCall,
      critical: false,
    },
    {
      title: "Gecikmiş dönüşler",
      description: "Takip tarihi geçmiş açık müşteri talepleri",
      value: overdueFollowUpCount,
      href: "/panel/leadler",
      icon: AlertTriangle,
      critical: true,
    },
    {
      title: "Son 24 saat tarama",
      description: "Canlı QR trafik yoğunluğu",
      value: scansToday,
      href: "/panel/qr-kodlar",
      icon: Timer,
      critical: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Genel Bakış</h1>
          <p className="text-muted-foreground">Galerinizin genel durumu ve son aktiviteler</p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/panel/araclar/ekle">
            <Plus className="w-4 h-4 mr-2" />
            Araç Ekle
          </Link>
        </Button>
      </div>

      {showroomSummary ? (
        <Card className="overflow-hidden border-border bg-gradient-to-br from-foreground text-background to-zinc-800">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background/10 ring-1 ring-background/20">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-background/70">Herkese Açık Galeri Sayfanız</p>
                  <h2 className="mt-1 text-2xl font-bold">{showroomSummary.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-background/70">
                    Bu sayfada müşteriler galerinizin yayındaki araçlarını görür, araç detayına girer ve telefon/WhatsApp ile size ulaşır.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:min-w-[260px]">
                <div className="rounded-xl bg-background/10 p-3 ring-1 ring-background/15">
                  <p className="text-xs text-background/60">Yayındaki Araç</p>
                  <p className="mt-1 text-2xl font-bold">{showroomSummary.activeVehicleCount}</p>
                </div>
                <div className="rounded-xl bg-background/10 p-3 ring-1 ring-background/15">
                  <p className="text-xs text-background/60">Toplam Araç</p>
                  <p className="mt-1 text-2xl font-bold">{showroomSummary.vehicleCount}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="truncate rounded-lg bg-background/10 px-3 py-2 text-xs text-background/70 ring-1 ring-background/15">
                {showroomSummary.publicShowroomUrl}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="secondary" className="bg-background text-foreground hover:bg-background/90">
                  <Link href={showroomSummary.showroomPath} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Galeri Sayfamı Aç
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background">
                  <Link href="/panel/araclar">Araçları Yönet</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Galeri sayfası için galeri kaydı bulunamadı</h2>
              <p className="text-sm text-muted-foreground">Önce galeri profilinizi tamamlayın, ardından herkese açık galeri sayfanız açılır.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/panel/ayarlar">Galeri Ayarlarına Git</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:border-accent/30 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      stat.changeType === "positive" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {stat.changeType === "positive" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <LiveAlertCenter />

      <div className="grid xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Günün İş Planı</CardTitle>
                <CardDescription>Önceliklendirilmiş günlük işlem kuyruğu</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/panel/leadler">Müşteri Taleplerine Git</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {operationQueue.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 hover:border-accent/40 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${
                      item.critical ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground">adet</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Fırsat ve Risk Özeti
            </CardTitle>
            <CardDescription>Canlı veriye göre hızlı içgörüler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">Yüksek tarama alan ama talep almayan araç</p>
              <p className="text-lg font-semibold">{highScanNoLeadCount}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">Henüz tarama almayan araç</p>
              <p className="text-lg font-semibold">{inactiveVehicleCount}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">Yeni müşteri talebi yoğunluğu</p>
              <p className="text-lg font-semibold">{freshLeadCount}</p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">Dönüşüm trendi (30 gün)</p>
              <p className={`text-lg font-semibold ${conversionDelta >= 0 ? "text-green-600" : "text-destructive"}`}>
                {conversionDeltaLabel}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Son QR Taramalar</CardTitle>
                <CardDescription>Son QR olayları</CardDescription>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-green-600">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500/60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-600" />
                </span>
                Canlı
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/panel/qr-kodlar">Tümünü Gör</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentScans.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz QR tarama olayı bulunmuyor.</p>
              ) : (
                recentScans.items.slice(0, 6).map((scan) => (
                  <div key={`${scan.vehicleId}-${scan.scannedAt}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                        <Eye className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{scan.vehicleTitle}</p>
                        <p className="text-sm text-muted-foreground">Kaynak: {scan.source || "bilinmiyor"}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatRelativeTime(scan.scannedAt)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Son Müşteri Talepleri</CardTitle>
                <CardDescription>Müşteri ilgileri</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/panel/leadler">Tümünü Gör</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz müşteri talebi bulunmuyor.</p>
              ) : (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-foreground">{lead.customerName.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{lead.customerName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{lead.vehicleTitle || "Araç belirtilmedi"}</span>
                        <span>•</span>
                        <span className="shrink-0">{lead.source}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>En Çok İlgi Gören Araçlar</CardTitle>
              <CardDescription>Tarama ve müşteri talebi sayılarına göre</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/panel/araclar">Tüm Araçlar</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">Henüz araç verisi bulunmuyor.</p>
            ) : (
              topVehicles.map((vehicle, index) => (
                <div key={vehicle.vehicleId} className="p-4 bg-muted/50 rounded-xl">
                  <div className="w-full h-24 bg-muted rounded-lg mb-3 flex items-center justify-center">
                    <Car className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <h4 className="font-medium text-foreground truncate">{vehicle.vehicleTitle}</h4>
                  <p className="text-xs text-muted-foreground mt-1">#{index + 1}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{vehicle.scans}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{leadCountByVehicle.get(vehicle.vehicleId) || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/panel/araclar/ekle">
          <Card className="hover:border-accent/30 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Araç Ekle</h4>
                <p className="text-sm text-muted-foreground">Yeni araç kaydı oluştur</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/panel/qr-kodlar">
          <Card className="hover:border-accent/30 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <QrCode className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">QR Yazdır</h4>
                <p className="text-sm text-muted-foreground">Etiket ve sticker bas</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/panel/leadler">
          <Card className="hover:border-accent/30 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Müşteri Talebi Takibi</h4>
                <p className="text-sm text-muted-foreground">Talepleri görüntüle</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
