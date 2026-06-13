import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BarChart3, Building2, Car, ExternalLink, Play, QrCode, Smartphone, Users } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { PersonalizedDemoBuilder } from '@/components/landing/personalized-demo-builder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DEMO_PUBLIC_DEALER,
  DEMO_PUBLIC_VEHICLE,
  getDemoQrImageSrc,
  getDemoQrTargetUrl,
  getDemoShowroomHref,
  getDemoVehicleHref,
} from '@/lib/demo-public-experience'
import { listPublicDemoExamples } from '@/lib/public-showroom'
import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

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
  title: 'Canlı Demo ve QR Vitrin Testi',
  description:
    'Cebindegaleri canlı demo sayfalarıyla QR kodlu vitrin, mobil araç detay ve lead akışlarını gerçek senaryolarla test edin.',
  path: '/demo',
  keywords: ['canlı demo', 'mobil araç sayfası demo', 'qr showroom demo', 'galeri yazılımı demo'],
})

export default async function DemoPage() {
  const demoExamples = await listPublicDemoExamples(2).catch(() => [])
  const demoShowroomHref = getDemoShowroomHref()
  const demoVehicleHref = getDemoVehicleHref('showroom')
  const demoQrTargetUrl = getDemoQrTargetUrl()

  return (
    <MarketingPageLayout>
      <MarketingPageHero
        badge="Demo"
        title="Cebindegaleri Deneyimini Canlı Olarak İnceleyin"
        description="Galerinin günlük operasyonunda kullandığı vitrin, araç detay ve panel akışlarını gerçek kullanım senaryosu ile test edin."
      />

      <MarketingPageSection>
        <PersonalizedDemoBuilder />

        <div className="mt-10">
        <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm">
          <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6 p-6 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative h-20 w-40 overflow-hidden rounded-2xl border border-border bg-black p-3">
                  <Image
                    src={DEMO_PUBLIC_DEALER.logo || '/icon.svg'}
                    alt={`${DEMO_PUBLIC_DEALER.name} logosu`}
                    fill
                    sizes="160px"
                    className="object-contain p-2"
                    priority
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Hazır demo galeri</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">{DEMO_PUBLIC_DEALER.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Logo, galeri bilgisi, araç vitrini ve QR müşteri deneyimi tek akışta görülebilir.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: '1', title: 'QR okut', copy: 'Telefon kamerası ile demo QR kodu tara.' },
                  { label: '2', title: 'Araç sayfasını gör', copy: 'Fotoğraf, fiyat, teknik bilgi ve CTA alanlarını incele.' },
                  { label: '3', title: 'Galeri sitesine geç', copy: 'Aynı galerinin public araç vitrini açılır.' },
                ].map((step) => (
                  <div key={step.label} className="rounded-2xl border border-border bg-background/70 p-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-black text-accent-foreground">
                      {step.label}
                    </span>
                    <h3 className="mt-3 font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.copy}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {DEMO_PUBLIC_VEHICLE.images.map((image, index) => (
                  <div key={image} className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-muted">
                    <Image
                      src={image}
                      alt={`${DEMO_PUBLIC_VEHICLE.title} demo fotoğraf ${index + 1}`}
                      fill
                      sizes="(min-width: 768px) 280px, 100vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link href={demoVehicleHref}>
                    Demo Araç Sayfası
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={demoShowroomHref}>
                    Galeri Web Sitesi
                    <Building2 className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="border-t border-border bg-neutral-950 p-6 text-white lg:border-l lg:border-t-0 md:p-8">
              <div className="rounded-[2rem] border border-white/10 bg-white p-5 text-black shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">Standart QR</p>
                    <h3 className="mt-2 text-xl font-black">Telefondan okut ve dene</h3>
                  </div>
                  <QrCode className="h-8 w-8 text-black" />
                </div>
                <div className="mt-5 flex justify-center rounded-3xl border border-neutral-200 bg-white p-4">
                  <Image
                    src={getDemoQrImageSrc(220)}
                    alt="Demo araç sayfası QR kodu"
                    width={220}
                    height={220}
                    unoptimized
                    priority
                    className="h-[220px] w-[220px]"
                  />
                </div>
                <p className="mt-4 break-all rounded-2xl bg-neutral-100 p-3 text-xs leading-5 text-neutral-600">
                  {demoQrTargetUrl}
                </p>
                <p className="mt-4 text-sm leading-6 text-neutral-600">
                  Bu QR sadece demo araç sayfasına gider. Gerçek galeri hesaplarında QR kodlar paneldeki araç linklerinden otomatik üretilir.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Play className="h-5 w-5 text-accent" />
                Canlı Demo Vitrin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Canlı public galeri sayfasını açıp müşteri gözünden araç listesi, iletişim ve talep akışını inceleyin.
              </p>
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href={demoExamples[0]?.showroomHref || '/kayit'}>
                  {demoExamples[0] ? 'Canlı Vitrini Aç' : '14 Gün Ücretsiz Başla'}
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
                Yayında aktif araç varsa direkt araç detay sayfasına geçin; QR sonrası müşterinin gördüğü ekranı test edin.
              </p>
              <Button asChild variant="outline">
                <Link href={demoExamples.find((item) => item.vehicleHref)?.vehicleHref || '/demo#canli-ornekler'}>
                  {demoExamples.some((item) => item.vehicleHref) ? 'Demo Aracı Aç' : 'Canlı Örnekleri Gör'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div id="canli-ornekler" className="mt-10">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Canlı public örnekler</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              İlk kart hazır demo deneyimidir; varsa diğer kartlar veritabanında gerçekten yayında olan, güvenli public linke sahip galeri ve araç kayıtlarından oluşur.
            </p>
          </div>

          {demoExamples.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {demoExamples.map((example) => (
                <Card key={example.showroomHref} className="border-border/70 bg-card/80">
                  <CardContent className="space-y-4 py-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Car className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{example.dealerName}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{example.location}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{example.vehicleCount} yayındaki araç</p>
                      </div>
                    </div>

                    {example.vehicleTitle ? (
                      <p className="rounded-lg border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground">
                        İlk aktif araç: <span className="font-medium text-foreground">{example.vehicleTitle}</span>
                      </p>
                    ) : (
                      <p className="rounded-lg border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground">
                        Bu galeride şu an yayındaki araç yok; public vitrin yine gerçek galeri bilgileriyle açılır.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        <Link href={example.showroomHref}>
                          Vitrini Aç
                          <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {example.vehicleHref ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={example.vehicleHref}>
                            Araç Sayfası
                            <ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/70 bg-card/80">
              <CardContent className="py-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Şu anda canlı, güvenli public örnek kaydı bulunamadı. Yeni hesap açtığınızda kendi galeri sayfanız ve araç linkleriniz gerçek verinizle otomatik oluşur.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href="/kayit">14 Gün Ücretsiz Başla</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/iletisim">Demo Planla</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
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
                <Link href="/kayit">14 Gün Ücretsiz Başla</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/iletisim">Demo Planla</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
