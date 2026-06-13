import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, CheckCircle2, MapPin, QrCode, Route, Store } from "lucide-react"

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from "@/components/landing/marketing-page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cityLandings, getCityLanding } from "@/lib/city-landing"
import { absoluteUrl, createPageMetadata } from "@/lib/seo"

type CityPageProps = {
  params: Promise<{ city: string }>
}

export function generateStaticParams() {
  return cityLandings.map((city) => ({ city: city.slug }))
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: slug } = await params
  const city = getCityLanding(slug)

  if (!city) {
    return createPageMetadata({
      title: "Şehir Rehberi Bulunamadı",
      description: "İstenen galeri yazılımı şehir rehberi bulunamadı.",
      path: `/galeri-yazilimi/${slug}`,
      noIndex: true,
    })
  }

  return createPageMetadata({
    title: city.title,
    description: city.description,
    path: `/galeri-yazilimi/${city.slug}`,
    keywords: [`${city.name.toLowerCase()} oto galeri yazılımı`, `${city.name.toLowerCase()} qr araç vitrini`, `${city.name.toLowerCase()} galeri sitesi`],
  })
}

export default async function CityPage({ params }: CityPageProps) {
  const { city: slug } = await params
  const city = getCityLanding(slug)

  if (!city) notFound()

  const localBusinessJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Service",
    name: city.title,
    description: city.description,
    areaServed: { "@type": "City", name: city.name },
    provider: { "@type": "Organization", name: "Cebindegaleri", url: absoluteUrl("/") },
    url: absoluteUrl(`/galeri-yazilimi/${city.slug}`),
  }).replace(/</g, "\\u003c")

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: localBusinessJsonLd }} />
      <MarketingPageHero
        badge={`${city.name} Galeri Rehberi`}
        title={city.title}
        description={city.description}
        actions={
          <>
            <Button asChild>
              <Link href="/demo">
                Canlı Demoyu İncele
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/iletisim">Galerinize Özel Plan Alın</Link>
            </Button>
          </>
        }
      />

      <MarketingPageSection>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="border-border/70 bg-card/80">
            <CardContent className="py-7">
              <Store className="h-7 w-7 text-accent" />
              <h2 className="mt-4 text-2xl font-semibold text-foreground">{city.name} galeri operasyonunda neden dijital vitrin?</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{city.operatingContext}</p>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-muted/35">
            <CardContent className="py-7">
              <MapPin className="h-7 w-7 text-accent" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">Öne çıkan galeri bölgeleri</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {city.districts.map((district) => (
                  <span key={district} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground">
                    {district}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {city.name} galerileri için öncelikli kullanım alanları
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {city.focus.map((item) => (
              <Card key={item} className="border-border/70 bg-card/80">
                <CardContent className="flex items-start gap-3 py-6">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm leading-relaxed text-foreground">{item}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-border/70 bg-foreground p-6 text-background md:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs font-medium text-background/85">
              <Route className="h-3.5 w-3.5" />
              Yerel operasyon planı
            </div>
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">{city.name} için üç uygulanabilir adım</h2>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {city.playbook.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <span className="text-sm font-semibold text-amber-300">0{index + 1}</span>
                <h3 className="mt-3 font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70 bg-card/80">
            <CardContent className="py-7">
              <QrCode className="h-7 w-7 text-accent" />
              <h2 className="mt-4 text-xl font-semibold text-foreground">QR kodlu araç vitrini nasıl çalışır?</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Araç panele eklendiğinde ilgili araç sayfasına yönlenen QR kod kullanılır. Müşteri kodu okutup güncel detayları görür; galeri QR ilgisini ve gelen müşteri talebini panelden izler.
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link href="/nasil-calisir">Adım Adım İncele</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80">
            <CardContent className="py-7">
              <MapPin className="h-7 w-7 text-accent" />
              <h2 className="mt-4 text-xl font-semibold text-foreground">Diğer şehir rehberleri</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {cityLandings.filter((item) => item.slug !== city.slug).map((item) => (
                  <Link
                    key={item.slug}
                    href={`/galeri-yazilimi/${item.slug}`}
                    className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
