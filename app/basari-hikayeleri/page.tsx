import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Building2, Car, ExternalLink, MapPin, ShieldCheck } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { listPublicShowcaseExamples } from '@/lib/public-showroom'
import { absoluteUrl, createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = createPageMetadata({
  title: 'Canlı Galeri Kullanım Örnekleri',
  description:
    'Cebindegaleri ile yayınlanan gerçek dijital showroom örneklerini, konumlarını ve yayındaki araç sayılarını doğrudan inceleyin.',
  path: '/basari-hikayeleri',
  keywords: ['galeri başarı hikayeleri', 'dijital showroom örnekleri', 'canlı galeri sitesi örnekleri'],
})

export default async function SuccessStoriesPage() {
  const examples = await listPublicShowcaseExamples(12).catch(() => [])

  const itemListJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cebindegaleri canlı kullanım örnekleri',
    itemListElement: examples.map((example, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: example.dealerName,
      url: absoluteUrl(example.showroomHref),
    })),
  }).replace(/</g, '\\u003c')

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJsonLd }} />
      <MarketingPageHero
        badge="Canlı Kullanım Örnekleri"
        title="Yayındaki Galeri Vitrinlerini Doğrudan İnceleyin"
        description="Buradaki bilgiler canlı public showroom kayıtlarından alınır. Doğrulanamayan satış artışı veya dönüşüm oranı iddiası gösterilmez."
        actions={
          <>
            <Button asChild>
              <Link href="/demo">
                Kendi Demo Vitrinini Oluştur
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/kayit">14 Gün Ücretsiz Başla</Link>
            </Button>
          </>
        }
      />

      <MarketingPageSection>
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Doğrulanabilir',
              description: 'Her kart doğrudan yayındaki güvenli public showroom bağlantısına gider.',
            },
            {
              icon: Car,
              title: 'Güncel araç sayısı',
              description: 'Gösterilen araç adedi, o anda yayında olan aktif araç kayıtlarından hesaplanır.',
            },
            {
              icon: Building2,
              title: 'Gerçek kullanım',
              description: 'Hazır demo galerisi bu listeden ayrılır; yalnızca gerçek galeri vitrinleri gösterilir.',
            },
          ].map((item) => (
            <Card key={item.title} className="border-border/70 bg-card/80">
              <CardContent className="py-6">
                <item.icon className="h-6 w-6 text-accent" />
                <h2 className="mt-4 font-semibold text-foreground">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {examples.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {examples.map((example) => (
              <Card key={example.showroomHref} className="border-border/70 bg-card/80">
                <CardContent className="flex h-full flex-col py-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-foreground">{example.dealerName}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {example.location}
                  </p>
                  <div className="mt-5 rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Canlı vitrin durumu</p>
                    <p className="mt-2 text-2xl font-black text-foreground">{example.vehicleCount} yayındaki araç</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {example.vehicleTitle
                        ? `İlk aktif araç: ${example.vehicleTitle}`
                        : 'Şu anda yayındaki aktif araç bulunmuyor.'}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <Button asChild size="sm">
                      <Link href={example.showroomHref}>
                        Vitrini Aç
                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    {example.vehicleHref ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={example.vehicleHref}>Araç Sayfası</Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/70 bg-card/80">
            <CardContent className="py-8">
              <h2 className="text-xl font-semibold text-foreground">Doğrulanabilir canlı örnek bekleniyor</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Şu anda hazır demo dışında listelenecek aktif public showroom bulunamadı. Sahte müşteri hikâyesi veya temsili sonuç yayınlamıyoruz.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/demo">Hazır Demoyu İncele</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/kayit">İlk Canlı Vitrini Oluştur</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
