import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, CalendarClock, Car, Clock3, Percent, QrCode, Target, TrendingUp, Users, WalletCards } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { readPanelSessionFromCookieHeader } from '@/lib/server/panel-auth'
import { getPanelManagerReport } from '@/lib/server/panel-insights-repository'
import { getPanelTeamPerformance } from '@/lib/server/panel-operations-repository'

export const dynamic = 'force-dynamic'

function formatPrice(price: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(price)
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span className={positive ? 'flex items-center text-xs font-medium text-emerald-600' : 'flex items-center text-xs font-medium text-red-600'}>
      <Icon className="mr-1 h-3.5 w-3.5" />
      %{Math.abs(value)}
    </span>
  )
}

export default async function ReportsPage() {
  const session = readPanelSessionFromCookieHeader((await headers()).get('cookie'))
  if (!session) redirect('/giris')

  const [report, teamPerformance] = await Promise.all([
    getPanelManagerReport(session.email),
    getPanelTeamPerformance({ galleryId: session.galleryId, ownerEmail: session.email }),
  ])
  const totalStock = report.stockAging.buckets.reduce((sum, bucket) => sum + bucket.count, 0)
  const metrics = [
    { title: 'Yeni Müşteri Talebi', value: report.metrics.newLeads, delta: report.metrics.newLeadsDelta, icon: Users },
    { title: 'Satışa Dönen Talep', value: report.metrics.wonLeads, delta: report.metrics.wonLeadsDelta, icon: Target },
    { title: 'Eklenen Araç', value: report.metrics.vehiclesAdded, delta: report.metrics.vehiclesAddedDelta, icon: Car },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Yönetici Raporu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.currentPeriodLabel} performansı, önceki dönem: {report.previousPeriodLabel}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/panel/leadler?view=overdue">
            <CalendarClock className="mr-2 h-4 w-4" />
            Gecikmiş Takipleri Aç
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <metric.icon className="h-5 w-5" />
                </div>
                <Delta value={metric.delta} />
              </div>
              <p className="mt-4 text-2xl font-bold">{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              Satış Hedefleri
            </CardTitle>
            <CardDescription>Bu ayki hedef stok büyüklüğüne göre otomatik hesaplanır.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-bold">{report.salesGoals.wonThisMonth}/{report.salesGoals.monthlyTarget}</p>
                <p className="text-sm text-muted-foreground">{report.salesGoals.label}</p>
              </div>
              <Badge variant={report.salesGoals.progressRate >= 100 ? 'default' : 'outline'}>%{report.salesGoals.progressRate}</Badge>
            </div>
            <Progress value={report.salesGoals.progressRate} className="mt-4 h-2" />
            <div className="mt-4 rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Sıcak pipeline</p>
              <p className="mt-1 font-semibold">{report.salesGoals.pipeline} müşteri görüşmede/test sürüşünde</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-accent" />
              QR Performans Raporu
            </CardTitle>
            <CardDescription>QR tarama ile müşteri talebi dönüşüm oranı.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Tarama</p><p className="mt-1 text-xl font-bold">{report.qrPerformance.totalScans}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Talep</p><p className="mt-1 text-xl font-bold">{report.qrPerformance.totalLeads}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Dönüşüm</p><p className="mt-1 text-xl font-bold">%{report.qrPerformance.conversionRate}</p></div>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/panel/analitik">
                <TrendingUp className="mr-2 h-4 w-4" />
                Analitik Detayını Aç
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Fiyat Düşürme Önerileri
            </CardTitle>
            <CardDescription>Stok yaşı, tarama ve lead verisine göre.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{report.priceDropRecommendations.length}</p>
            <p className="text-sm text-muted-foreground">revizyon adayı araç</p>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="#fiyat-onerileri">Önerileri Gör</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Galeri Sahibi Performans Raporu</CardTitle>
          <CardDescription>Müşteri talepleri, satış dönüşümü, WhatsApp teması ve yönetilen rezervasyon verileri.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Hesap</th>
                  <th className="p-3 font-medium">Atanan Lead</th>
                  <th className="p-3 font-medium">Satış</th>
                  <th className="p-3 font-medium">Dönüşüm</th>
                  <th className="p-3 font-medium">WhatsApp Teması</th>
                  <th className="p-3 font-medium">Rezervasyon</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((member) => (
                  <tr key={member.memberId} className="border-t border-border">
                    <td className="p-3"><p className="font-semibold">{member.name}</p><p className="text-xs text-muted-foreground">{member.email}</p></td>
                    <td className="p-3">{member.assignedLeads}</td>
                    <td className="p-3">{member.wonLeads}</td>
                    <td className="p-3"><Badge variant={member.conversionRate >= 20 ? 'default' : 'outline'}>%{member.conversionRate}</Badge></td>
                    <td className="p-3">{member.whatsappCount}</td>
                    <td className="p-3">{member.handledReservations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stok Yaşlandırma Analizi</CardTitle>
            <CardDescription>Satılık araçların stokta kalma süresine göre dağılımı</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {report.stockAging.buckets.map((bucket) => {
                const percent = totalStock > 0 ? Math.round((bucket.count / totalStock) * 100) : 0
                return (
                  <div key={bucket.key} className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">{bucket.label}</p>
                    <div className="mt-1 flex items-end justify-between gap-2">
                      <p className="text-xl font-bold">{bucket.count}</p>
                      <span className="text-xs text-muted-foreground">%{percent}</span>
                    </div>
                    <Progress value={percent} className="mt-2 h-1.5" />
                  </div>
                )
              })}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Araç</th>
                    <th className="p-3 font-medium">Stok Yaşı</th>
                    <th className="p-3 font-medium">Fiyat</th>
                    <th className="p-3 font-medium">Tarama</th>
                    <th className="p-3 font-medium">Talep</th>
                  </tr>
                </thead>
                <tbody>
                  {report.stockAging.oldestVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-t border-border">
                      <td className="p-3 font-medium">
                        <Link href={`/panel/araclar/${vehicle.id}`} className="hover:text-accent">{vehicle.title}</Link>
                      </td>
                      <td className="p-3"><Badge variant={vehicle.ageDays > 90 ? 'destructive' : 'outline'}>{vehicle.ageDays} gün</Badge></td>
                      <td className="p-3">{formatPrice(vehicle.price)}</td>
                      <td className="p-3">{vehicle.scans}</td>
                      <td className="p-3">{vehicle.leads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operasyon Özeti</CardTitle>
            <CardDescription>Bugün öncelik verilmesi gereken işler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/panel/leadler?view=overdue" className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-3 hover:bg-red-500/10">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium">Gecikmiş takip</span>
              </div>
              <strong className="text-red-600">{report.metrics.overdueFollowUps}</strong>
            </Link>
            <Link href="/panel/leadler?view=today" className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 hover:bg-amber-500/10">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium">Bugün aranacak</span>
              </div>
              <strong className="text-amber-600">{report.metrics.followUpsDueToday}</strong>
            </Link>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Ortalama stok yaşı</p>
              <p className="mt-1 text-2xl font-bold">{report.stockAging.averageAgeDays} gün</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">60 günü aşan araç</p>
              <p className="mt-1 text-2xl font-bold">{report.stockAging.agedStockCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gelişmiş Kâr ve Satış Raporu</CardTitle>
          <CardDescription>Maliyet bilgisi girilmiş {report.profitability.vehiclesWithCostData} araç üzerinden hesaplanır.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Stoktaki Toplam Sermaye', value: formatPrice(report.profitability.totalCapital), icon: WalletCards, tone: 'text-blue-600' },
              { label: 'Potansiyel Kâr', value: formatPrice(report.profitability.potentialProfit), icon: Banknote, tone: 'text-emerald-600' },
              { label: 'Gerçekleşen Kâr', value: formatPrice(report.profitability.realizedProfit), icon: Target, tone: 'text-violet-600' },
              { label: 'Ortalama Kâr Marjı', value: `%${report.profitability.averageMarginRate}`, icon: Percent, tone: 'text-amber-600' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border p-4">
                <item.icon className={`h-5 w-5 ${item.tone}`} />
                <p className="mt-3 text-xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr><th className="p-3 font-medium">Araç</th><th className="p-3 font-medium">Durum</th><th className="p-3 font-medium">Beklenen / Gerçekleşen Kâr</th><th className="p-3 font-medium">Marj</th></tr>
              </thead>
              <tbody>
                {report.profitability.topProfitVehicles.length > 0 ? report.profitability.topProfitVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-t border-border">
                    <td className="p-3 font-medium"><Link href={`/panel/araclar/${vehicle.id}`} className="hover:text-accent">{vehicle.title}</Link></td>
                    <td className="p-3"><Badge variant="outline">{vehicle.status === 'sold' ? 'Satıldı' : vehicle.status === 'reserved' ? 'Rezerve' : 'Satılık'}</Badge></td>
                    <td className={`p-3 font-semibold ${vehicle.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(vehicle.profit)}</td>
                    <td className="p-3">%{vehicle.marginRate}</td>
                  </tr>
                )) : <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Kâr raporu için araçlara alış fiyatı ve masraf bilgisi ekleyin.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>QR&apos;dan Talebe Dönüşen Araçlar</CardTitle>
            <CardDescription>Çok okutulan ama lead üretmeyen araçlar için ilan metni, fiyat ve fotoğrafı kontrol edin.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr><th className="p-3 font-medium">Araç</th><th className="p-3 font-medium">Tarama</th><th className="p-3 font-medium">Talep</th><th className="p-3 font-medium">Dönüşüm</th><th className="p-3 font-medium">Sinyal</th></tr>
                </thead>
                <tbody>
                  {report.qrPerformance.topVehicles.length > 0 ? report.qrPerformance.topVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-t border-border">
                      <td className="p-3 font-medium"><Link href={`/panel/araclar/${vehicle.id}`} className="hover:text-accent">{vehicle.title}</Link></td>
                      <td className="p-3">{vehicle.scans}</td>
                      <td className="p-3">{vehicle.leads}</td>
                      <td className="p-3">%{vehicle.conversionRate}</td>
                      <td className="p-3"><Badge variant={vehicle.signal.includes('yok') ? 'destructive' : 'outline'}>{vehicle.signal}</Badge></td>
                    </tr>
                  )) : <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">QR performansı için tarama verisi bekleniyor.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card id="fiyat-onerileri">
          <CardHeader>
            <CardTitle>Otomatik Fiyat Revizyon Listesi</CardTitle>
            <CardDescription>Öneriler sadece karar desteğidir; fiyat değişikliği araç düzenleme ekranından yapılır.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.priceDropRecommendations.length > 0 ? report.priceDropRecommendations.map((vehicle) => (
                <div key={vehicle.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/panel/araclar/${vehicle.id}`} className="font-semibold hover:text-accent">{vehicle.title}</Link>
                      <p className="mt-1 text-sm text-muted-foreground">{vehicle.detail}</p>
                    </div>
                    <Badge variant="destructive">-%{vehicle.suggestedDiscountRate}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-muted/40 p-2"><span className="text-muted-foreground">Mevcut</span><p className="font-semibold">{formatPrice(vehicle.currentPrice)}</p></div>
                    <div className="rounded-lg bg-emerald-500/10 p-2"><span className="text-emerald-700">Önerilen</span><p className="font-semibold text-emerald-700">{formatPrice(vehicle.suggestedPrice)}</p></div>
                  </div>
                </div>
              )) : <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">Şu an otomatik fiyat düşürme önerisi yok.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
