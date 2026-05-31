import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Car, CheckCircle2, LineChart, QrCode, Shield, Target, Users, Zap } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createPageMetadata } from '@/lib/seo'

const values = [
  {
    icon: Target,
    title: 'Misyonumuz',
    description:
      'Araç galerilerinin dijital dönüşümünü hızlandırmak ve her galerinin profesyonel bir dijital vitrine kısa sürede sahip olmasını sağlamak.',
  },
  {
    icon: Users,
    title: 'Vizyonumuz',
    description:
      'Türkiye genelindeki galeriler için satış, stok ve müşteri iletişimini tek platformda birleştiren standart altyapı olmak.',
  },
  {
    icon: Zap,
    title: 'Operasyonel Hız',
    description:
      'Teknik bilgi gerektirmeyen akışlarla araç yükleme, QR etiketleme ve müşteri geri dönüşlerini aynı gün içinde aktif hale getirmek.',
  },
  {
    icon: Shield,
    title: 'Güven ve Uyum',
    description:
      'KVKK uyumlu altyapı, rol bazlı erişim ve düzenli yedekleme ile galeri verilerini güvenli ve sürdürülebilir şekilde korumak.',
  },
]

const highlights = [
  { label: 'Aktif Galeri', value: '500+' },
  { label: 'Yönetilen Araç', value: '25.000+' },
  { label: 'Aylık QR Tarama', value: '1 Milyon+' },
  { label: 'Ortalama Kurulum Süresi', value: '5 Dakika' },
]

const principles = [
  'Sade arayüz, hızlı onboarding ve minimum eğitim ihtiyacı',
  'Mobil öncelikli araç sayfaları ve kolay iletişim kanalları',
  'Veriye dayalı satış kararları için anlık analitik görünürlük',
  'Büyüyen ekipler için çok kullanıcılı yönetim altyapısı',
]

const showroomBrands = [
  { name: 'Prestij Otomotiv', city: 'İstanbul', mark: 'PO' },
  { name: 'Anadolu Motor', city: 'Ankara', mark: 'AM' },
  { name: 'Ege Car Plaza', city: 'İzmir', mark: 'EP' },
  { name: 'Atlas Auto', city: 'Bursa', mark: 'AA' },
  { name: 'Vizyon Gallery', city: 'Antalya', mark: 'VG' },
  { name: 'Nova Motors', city: 'Konya', mark: 'NM' },
]

export const metadata: Metadata = createPageMetadata({
  title: 'Hakkımızda',
  description:
    'Cebindegaleri’nin misyonu, vizyonu ve araç galerileri için geliştirdiği dijital vitrin yaklaşımını keşfedin.',
  path: '/hakkimizda',
  keywords: ['hakkımızda', 'galeri dijital dönüşüm', 'oto galeri teknoloji'],
})

export default function HakkimizdaPage() {
  return (
    <MarketingPageLayout>
      <MarketingPageHero
        badge="Hakkımızda"
        title="Galerilerin Dijital Vitrin Altyapısını Kuruyoruz"
        description="Cebindegaleri; araç stok yönetimi, QR kodlu ilan deneyimi ve müşteri takip süreçlerini tek panelde birleştirerek satış ekiplerinin hızını artırır."
        actions={
          <>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/demo">
                Demoyu İncele
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/iletisim">Bizimle İletişime Geçin</Link>
            </Button>
          </>
        }
      />

      <MarketingPageSection className="pt-10">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-r from-foreground to-foreground/85 px-6 py-8 text-background sm:px-8 md:px-10">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/20 blur-2xl" />
          <div className="absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-background/10 blur-2xl" />

          <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs font-medium text-background/90">
                <QrCode className="h-3.5 w-3.5" />
                Cebindegaleri Marka Vitrini
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Tek Marka, Net Kimlik, Güçlü Dijital Görünüm</h2>
              <p className="mt-3 text-sm leading-relaxed text-background/80 sm:text-base">
                Araç kartlarından showroom sayfalarına kadar tüm temas noktalarında aynı görsel dili ve marka standardını koruyoruz.
                Bu sayede müşteriler galerinizin kurumsal çizgisini ilk ekranda hissediyor.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-background/10 px-3 py-1 text-xs font-medium text-background/90">QR Kimlik Standardı</span>
                <span className="rounded-full bg-background/10 px-3 py-1 text-xs font-medium text-background/90">Mobil Uyumlu Vitrin</span>
                <span className="rounded-full bg-background/10 px-3 py-1 text-xs font-medium text-background/90">Kurumsal Tema Bütünlüğü</span>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-2xl border border-background/20 bg-background/10 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Car className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-background/70">Marka Kimliği</p>
                  <p className="text-lg font-semibold">Cebindegaleri</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-background/85">
                <p className="flex items-center justify-between"><span>Tema Tutarlılığı</span><span className="font-semibold">%100</span></p>
                <p className="flex items-center justify-between"><span>Mobil Deneyim</span><span className="font-semibold">Öncelikli</span></p>
                <p className="flex items-center justify-between"><span>Canlı Kurulum</span><span className="font-semibold">5 Dakika</span></p>
              </div>
            </div>
          </div>
        </div>
      </MarketingPageSection>

      <MarketingPageSection>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <Card key={item.label} className="gap-2 border-border/70 bg-card/80 py-5">
              <CardContent className="px-5">
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <LineChart className="h-5 w-5 text-accent" />
                Neyi Çözüyoruz?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Galerilerde araç bilgisi paylaşımı çoğunlukla dağınık WhatsApp mesajları, manuel notlar ve farklı platformlarda tekrar eden ilan girişleriyle yürütülüyor.
                Bu durum hem müşteri deneyimini hem de satış ekibinin verimliliğini düşürüyor.
              </p>
              <p>
                Cebindegaleri ile her araç için tek bir dijital sayfa oluşturulur. QR kod, ilan ve iletişim akışları tek bir kayıt üzerinden yönetilir.
                Böylece ekipler daha hızlı yanıt verir, daha çok lead takip eder ve satışa odaklanır.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="text-xl">Ürün Prensiplerimiz</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {principles.map((principle) => (
                  <li key={principle} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{principle}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {values.map((item) => (
            <Card key={item.title} className="border-border/70 bg-card/80">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <item.icon className="h-5 w-5 text-accent" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Bize Güvenen Galeri Markaları</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Farklı şehirlerdeki galeriler vitrin deneyimi, lead takibi ve QR dönüşüm süreçlerini tek altyapıda yönetiyor.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {showroomBrands.map((brand) => (
              <Card key={brand.name} className="border-border/70 bg-card/80">
                <CardContent className="flex items-center gap-3 py-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-semibold text-accent">
                    {brand.mark}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{brand.name}</p>
                    <p className="text-xs text-muted-foreground">{brand.city}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <Card className="overflow-hidden border-border/70 bg-gradient-to-r from-muted/60 via-card to-muted/50">
            <CardContent className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  <QrCode className="h-3.5 w-3.5" />
                  Footer Öncesi Marka Bannerı
                </div>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Galerinizin dijital kimliğini birlikte kuralım</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Kurumsal tema, güçlü logo görünürlüğü ve satış odaklı vitrin yapısı için ekibimizle canlı kurulum planı oluşturun.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/iletisim">
                    Planlama Görüşmesi
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/demo">Canlı Demo</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
