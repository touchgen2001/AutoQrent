import type { Metadata } from 'next'
import Link from 'next/link'
import { BriefcaseBusiness, Clock3, Code, Headphones, MapPin, Palette, Users } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createPageMetadata } from '@/lib/seo'

const positions = [
  {
    icon: Code,
    title: 'Full-Stack Geliştirici',
    type: 'Tam Zamanlı',
    location: 'Uzaktan',
    description:
      'Next.js ve ürün odaklı backend geliştirme süreçlerinde görev alacak, hızlı iterasyona alışkın ekip arkadaşı arıyoruz.',
  },
  {
    icon: Palette,
    title: 'UI/UX Tasarımcı',
    type: 'Tam Zamanlı',
    location: 'Uzaktan',
    description:
      'B2B SaaS deneyimi güçlü, dönüşüm odaklı dashboard ve vitrin akışlarını tasarlayacak ürün tasarımcısı arıyoruz.',
  },
  {
    icon: Headphones,
    title: 'Müşteri Başarı Uzmanı',
    type: 'Tam Zamanlı',
    location: 'İstanbul',
    description:
      'Galeri onboarding, eğitim ve kullanım verisi takibiyle müşterilerin platformdan maksimum verim almasını sağlayacak ekip üyesi arıyoruz.',
  },
]

const cultureItems = [
  { icon: Users, title: 'Ürün Odaklı Takım', detail: 'Müşteri geri bildirimini doğrudan ürün kararlarına taşıyan çevik çalışma modeli.' },
  { icon: Clock3, title: 'Esnek Çalışma', detail: 'Uzaktan uyumlu hibrit model ve çıktı odaklı sprint planlama.' },
  { icon: BriefcaseBusiness, title: 'Gerçek Etki', detail: 'Yaptığınız her iyileştirme doğrudan satış ekiplerinin günlük performansına dokunur.' },
]

export const metadata: Metadata = createPageMetadata({
  title: 'Kariyer',
  description:
    'Cebindegaleri ekibinde açık pozisyonları inceleyin, ürün ve teknoloji odaklı bir ekibe katılmak için başvuru yapın.',
  path: '/kariyer',
  keywords: ['kariyer', 'iş ilanı', 'yazılım ekibi', 'ürün tasarımı'],
})

export default function KariyerPage() {
  return (
    <MarketingPageLayout>
      <MarketingPageHero
        badge="Kariyer"
        title="Galeri Teknolojisini Birlikte Büyütelim"
        description="Cebindegaleri ekibinde; otomotiv perakendesini dijitalleştiren ürünler geliştiriyor, satış ekiplerinin işini kolaylaştıran akışlar tasarlıyoruz."
      />

      <MarketingPageSection>
        <div className="grid gap-4 sm:grid-cols-3">
          {cultureItems.map((item) => (
            <Card key={item.title} className="border-border/70 bg-card/80">
              <CardContent className="space-y-3 py-6">
                <item.icon className="h-6 w-6 text-accent" />
                <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Açık Pozisyonlar</h2>
          <div className="grid gap-4">
            {positions.map((position) => (
              <Card key={position.title} className="border-border/70 bg-card/80">
                <CardContent className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <position.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{position.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>{position.type}</span>
                        <span className="text-border">•</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {position.location}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{position.description}</p>
                    </div>
                  </div>

                  <Button asChild variant="outline" className="md:shrink-0">
                    <Link href="mailto:kariyer@cebindegaleri.com?subject=Cebindegaleri%20Basvuru%20-%20Pozisyon">Başvur</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="mt-10 border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Uygun Pozisyonu Bulamadınız mı?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Ürün, mühendislik, müşteri başarısı veya operasyon tarafında deneyiminiz varsa açık rol olmasa da bize ulaşabilirsiniz.
              CV ve kısa bir motivasyon notu ile başvurularınızı değerlendiriyoruz.
            </p>
            <p>
              E-posta: <a href="mailto:kariyer@cebindegaleri.com" className="font-medium text-accent hover:text-accent/80">kariyer@cebindegaleri.com</a>
            </p>
          </CardContent>
        </Card>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
