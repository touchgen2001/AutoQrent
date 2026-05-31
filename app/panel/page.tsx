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
  Plus
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  {
    title: "Toplam Araç",
    value: "32",
    change: "+3",
    changeType: "positive" as const,
    icon: Car,
    href: "/panel/araclar"
  },
  {
    title: "QR Tarama",
    value: "1,248",
    change: "+12%",
    changeType: "positive" as const,
    icon: QrCode,
    href: "/panel/analitik"
  },
  {
    title: "Aktif Lead",
    value: "48",
    change: "+8",
    changeType: "positive" as const,
    icon: Users,
    href: "/panel/musteriler"
  },
  {
    title: "Bu Ay Satış",
    value: "₺2.4M",
    change: "-5%",
    changeType: "negative" as const,
    icon: TrendingUp,
    href: "/panel/analitik"
  }
]

const recentScans = [
  { vehicle: "BMW 3 Serisi 320i", time: "2 dk önce", location: "İstanbul" },
  { vehicle: "Mercedes C180", time: "15 dk önce", location: "İstanbul" },
  { vehicle: "Audi A4 2.0 TDI", time: "32 dk önce", location: "Ankara" },
  { vehicle: "Volkswagen Passat", time: "1 saat önce", location: "İzmir" },
  { vehicle: "Toyota Corolla", time: "2 saat önce", location: "İstanbul" },
]

const recentLeads = [
  { name: "Mehmet K.", vehicle: "BMW 3 Serisi", action: "WhatsApp", time: "5 dk önce" },
  { name: "Ayşe T.", vehicle: "Mercedes C180", action: "Form", time: "20 dk önce" },
  { name: "Ali Y.", vehicle: "Audi A4", action: "Arama", time: "1 saat önce" },
  { name: "Fatma S.", vehicle: "VW Passat", action: "Test Sürüşü", time: "3 saat önce" },
]

const topVehicles = [
  { name: "BMW 3 Serisi 320i", scans: 156, leads: 12, image: null },
  { name: "Mercedes C180 AMG", scans: 134, leads: 8, image: null },
  { name: "Audi A4 2.0 TDI", scans: 98, leads: 6, image: null },
  { name: "VW Passat 1.5 TSI", scans: 87, leads: 5, image: null },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Galerinizin genel durumu ve son aktiviteler</p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/panel/araclar/ekle">
            <Plus className="w-4 h-4 mr-2" />
            Araç Ekle
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:border-accent/30 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {stat.changeType === 'positive' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
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

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Scans */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Son QR Taramalar</CardTitle>
                <CardDescription>Son 24 saatteki taramalar</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/panel/analitik">Tümünü Gör</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentScans.map((scan, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Eye className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{scan.vehicle}</p>
                      <p className="text-sm text-muted-foreground">{scan.location}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{scan.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Son Leadler</CardTitle>
                <CardDescription>Müşteri ilgileri</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/panel/musteriler">Tümünü Gör</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLeads.map((lead, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {lead.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{lead.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">{lead.vehicle}</span>
                      <span>•</span>
                      <span className="shrink-0">{lead.action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Vehicles */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>En Çok İlgi Gören Araçlar</CardTitle>
              <CardDescription>Bu ayki tarama ve lead sayılarına göre</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/panel/araclar">Tüm Araçlar</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topVehicles.map((vehicle, index) => (
              <div 
                key={index}
                className="p-4 bg-muted/50 rounded-xl"
              >
                <div className="w-full h-24 bg-muted rounded-lg mb-3 flex items-center justify-center">
                  <Car className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h4 className="font-medium text-foreground truncate">{vehicle.name}</h4>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{vehicle.scans}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{vehicle.leads}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
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
        <Link href="/panel/musteriler">
          <Card className="hover:border-accent/30 hover:shadow-md transition-all cursor-pointer h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Test Sürüşleri</h4>
                <p className="text-sm text-muted-foreground">Talepleri görüntüle</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
