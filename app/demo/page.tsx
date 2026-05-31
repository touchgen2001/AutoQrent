import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BarChart3, Play, QrCode, Smartphone, Users } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createPageMetadata } from '@/lib/seo'

const demoFeatures = [
  {
    icon: QrCode,
    title: 'QR Kod Akışı',
    description: 'Araç kartı oluşturduğunuz anda QR etiket üretimi ve yazdırma akışını canlı olarak görün.',
  },
  {
    icon: Smartphone,
    title: 'Mobil Araç Sayfası',
    description: 'Müşterinin QR taradıktan sonra gördüğü mobil deneyimi gerçek bir örnek araç üzerinde test edin.',
  },
  {
    icon: BarChart3,
    title: 'Performans Analitiği',
    description: 'Tarama, görüntüleme ve müşteri etkileşim metriklerinin panele nasıl aktığını inceleyin.',
  },
  {
    icon: Users,
    title: 'Lead Yönetimi',
    description: 'WhatsApp, telefon ve form taleplerinin tek müşteri kaydı altında nasıl toplandığını görün.',
  },
]

export const metadata: Metadata = createPageMetadata({
  title: 'Demo',
  description:
    'Cebindegaleri canlı demo sayfalarıyla QR kodlu vitrin ve mobil araç detay deneyimini gerçek senaryolarla test edin.',
  path: '/demo',
  keywords: ['canlı demo', 'mobil araç sayfası demo', 'qr showroom demo'],
})

export default function DemoPage() {
  return (
    <MarketingPageLayout>
      <MarketingPageHero
        badge="Demo"
        title="Cebindegaleri Deneyimini Canlı Olarak İnceleyin"
        description="Satış ekiplerinin günlük operasyonunda kullandığı vitrin, araç detay ve panel akışlarını gerçek kullanım senaryosu ile test edin."
      />

      <MarketingPageSection>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Play className="h-5 w-5 text-accent" />
                Canlı Demo Vitrin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Gerçek bir galeri vitrini üzerinden kategori, araç kartı ve iletişim bileşenlerini son kullanıcı gözünden deneyimleyin.
              </p>
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/showroom/demo-galeri">
                  Demo Vitrini Aç
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Smartphone className="h-5 w-5 text-accent" />
                Demo Araç Sayfası
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                QR tarama sonrası açılan mobil araç sayfasını; görsel, donanım, fiyat ve iletişim aksiyonlarıyla birlikte test edin.
              </p>
              <Button asChild variant="outline">
                <Link href="/arac/demo-arac">
                  Araç Sayfasını Gör
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {demoFeatures.map((feature) => (
            <Card key={feature.title} className="border-border/70 bg-card/80">
              <CardContent className="space-y-3 py-6">
                <feature.icon className="h-6 w-6 text-accent" />
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-10 border-border/70 bg-card/80">
          <CardContent className="flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Demo Sonrası Hızlı Kurulum</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Galerinize özel hesap oluşturup araçlarınızı aynı gün içinde yayınlamak için onboarding ekibimizle hemen başlayın.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/kayit">Ücretsiz Başla</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/iletisim">Onboarding Ekibiyle Görüş</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
