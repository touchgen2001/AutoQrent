import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CheckCircle2, HelpCircle, Scale } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { comparisonLandings, getComparisonLanding } from '@/lib/comparison-landings'
import { createPageMetadata } from '@/lib/seo'

type ComparisonPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return comparisonLandings.map((landing) => ({ slug: landing.slug }))
}

export async function generateMetadata({ params }: ComparisonPageProps): Promise<Metadata> {
  const { slug } = await params
  const landing = getComparisonLanding(slug)

  if (!landing) {
    return createPageMetadata({
      title: 'Karşılaştırma Rehberi Bulunamadı',
      description: 'İstenen karşılaştırma rehberi bulunamadı.',
      path: `/karsilastir/${slug}`,
      noIndex: true,
    })
  }

  return createPageMetadata({
    title: landing.title,
    description: landing.description,
    path: `/karsilastir/${landing.slug}`,
    keywords: [landing.title.toLocaleLowerCase('tr-TR'), 'galeri yazılımı karşılaştırma'],
  })
}

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { slug } = await params
  const landing = getComparisonLanding(slug)
  if (!landing) notFound()

  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: landing.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }).replace(/</g, '\\u003c')

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <MarketingPageHero
        badge="Karşılaştırma Rehberi"
        title={landing.heading}
        description={landing.intro}
        actions={
          <>
            <Button asChild>
              <Link href="/demo">
                Canlı Demoda Karşılaştır
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/fiyatlar">Planları İncele</Link>
            </Button>
          </>
        }
      />

      <MarketingPageSection>
        <Card className="overflow-hidden border-border/70 bg-card/80">
          <CardContent className="p-0">
            <div className="hidden grid-cols-[1.1fr_1fr_1fr] border-b border-border bg-muted/35 text-sm font-semibold text-foreground md:grid">
              <div className="p-4">Karar ölçütü</div>
              <div className="border-l border-border p-4">Cebindegaleri</div>
              <div className="border-l border-border p-4">{landing.alternativeLabel}</div>
            </div>
            {landing.rows.map((row) => (
              <div key={row.criterion} className="grid grid-cols-1 border-b border-border/70 last:border-b-0 md:grid-cols-[1.1fr_1fr_1fr]">
                <div className="bg-muted/15 p-4 text-sm font-semibold text-foreground">{row.criterion}</div>
                <div className="border-t border-border/70 p-4 text-sm leading-6 text-muted-foreground md:border-l md:border-t-0">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground md:hidden">
                    Cebindegaleri
                  </span>
                  {row.cebindegaleri}
                </div>
                <div className="border-t border-border/70 p-4 text-sm leading-6 text-muted-foreground md:border-l md:border-t-0">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-foreground md:hidden">
                    {landing.alternativeLabel}
                  </span>
                  {row.alternative}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border/70 bg-card/80">
            <CardContent className="py-7">
              <Scale className="h-7 w-7 text-accent" />
              <h2 className="mt-4 text-2xl font-semibold text-foreground">Karar verirken dikkate alın</h2>
              <div className="mt-5 space-y-4">
                {landing.decisionPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <p className="text-sm leading-6 text-muted-foreground">{point}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-foreground text-background">
            <CardContent className="py-7">
              <h2 className="text-2xl font-semibold">Kararı gerçek akışla test edin</h2>
              <p className="mt-3 text-sm leading-6 text-background/70">
                Kendi galeri adınız ve logonuzla demo vitrini ön izleyin; ardından hazır araç sayfasını ve QR akışını açın.
              </p>
              <Button asChild className="mt-6 bg-background text-foreground hover:bg-background/90">
                <Link href="/demo">
                  Demo Vitrini Oluştur
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-semibold text-foreground">Sık sorulan sorular</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {landing.faq.map((item) => (
              <Card key={item.question} className="border-border/70 bg-card/80">
                <CardContent className="py-6">
                  <h3 className="font-semibold text-foreground">{item.question}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-foreground">Diğer karşılaştırma rehberleri</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {comparisonLandings
              .filter((item) => item.slug !== landing.slug)
              .map((item) => (
                <Link
                  key={item.slug}
                  href={`/karsilastir/${item.slug}`}
                  className="rounded-full border border-border bg-muted/25 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/50 hover:text-accent"
                >
                  {item.title}
                </Link>
              ))}
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Bu rehber, genel karar desteği amacıyla hazırlanmıştır. Özellik ve ihtiyaçlarınızı canlı demo üzerinden doğrulayın.
          </p>
        </div>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
