import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, ClipboardList, Layers3, Newspaper, PlayCircle, Sparkles } from "lucide-react"
import { LandingHeader } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { CtaSection } from "@/components/landing/cta-section"
import { HomeRichSections } from "@/components/landing/home-rich-sections"
import { HomeDemoExperience } from "@/components/landing/home-demo-experience"
import { HomePricingPreview } from "@/components/landing/home-pricing-preview"
import { HomeBlogPreview } from "@/components/landing/home-blog-preview"
import { HomeShowrooms } from "@/components/landing/home-showrooms"
import { HomeFaqPreview, buildHomeFaqJsonLd } from "@/components/landing/home-faq-preview"
import { HomeTrustGuarantees } from "@/components/landing/home-trust-guarantees"
import { MobileStickyCta } from "@/components/landing/mobile-sticky-cta"
import { LandingFooter } from "@/components/landing/footer"
import { absoluteUrl, createPageMetadata } from "@/lib/seo"
import { listPublicGalleries } from "@/lib/public-showroom"
import { unstable_cache } from "next/cache"

const organizationId = absoluteUrl("/#organization")
const websiteId = absoluteUrl("/#website")

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": organizationId,
  name: "Cebindegaleri",
  url: absoluteUrl("/"),
  logo: absoluteUrl("/icon.svg"),
  description:
    "Araç galerileri için QR kodlu dijital showroom, stok yönetimi, lead takibi ve satış analitiği platformu.",
  email: "destek@cebindegaleri.com",
  telephone: "+905309738240",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: "+905309738240",
      email: "destek@cebindegaleri.com",
      areaServed: "TR",
      availableLanguage: ["tr"],
    },
  ],
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": websiteId,
  name: "Cebindegaleri",
  url: absoluteUrl("/"),
  inLanguage: "tr-TR",
  publisher: {
    "@id": organizationId,
  },
}

const faqJsonLd = buildHomeFaqJsonLd()

function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

export const metadata: Metadata = createPageMetadata({
  title: "QR Kodlu Galeri Yazılımı ve Dijital Showroom",
  description:
    "Cebindegaleri ile araç galeriniz için QR kodlu dijital showroom, public galeri sitesi, müşteri talebi takibi ve 14 gün ücretsiz deneme akışını tek platformda yönetin.",
  path: "/",
  keywords: ["galeri yazılımı", "qr kodlu araç vitrini", "oto galeri crm", "mobil showroom"],
})

const categoryCards = [
  {
    title: "Canlı Demo",
    description: "Demo galeri logosu, araç sayfası ve standart QR kod akışını müşteri gözüyle deneyin.",
    href: "/demo",
    icon: PlayCircle,
  },
  {
    title: "Özellikler",
    description: "QR, araç vitrini, lead takibi ve yönetim modüllerini galeri operasyonuna göre detaylı inceleyin.",
    href: "/ozellikler",
    icon: Layers3,
  },
  {
    title: "Nasıl Çalışır",
    description: "Kurulumdan satış sonrası takibe kadar müşteri ve panel akışını adım adım görün.",
    href: "/nasil-calisir",
    icon: ClipboardList,
  },
  {
    title: "Fiyatlar",
    description: "999 TL, 2.500 TL, 4.990 TL ve kurumsal teklif seçeneklerini net kapsamlarıyla karşılaştırın.",
    href: "/fiyatlar",
    icon: Sparkles,
  },
  {
    title: "Blog",
    description: "Otomobil haberleri, galeri web sitesi, araç fotoğrafı ve QR vitrin rehberlerini okuyun.",
    href: "/blog",
    icon: Newspaper,
  },
  {
    title: "SSS",
    description: "Kurulum, QR, panel, lead ve destek başlıklarında en kritik soruların net cevapları.",
    href: "/sss",
    icon: BookOpen,
  },
]

// Soft, rotating accent colors for the category-card icon tiles — adds warmth to
// the otherwise monochrome landing without touching the global theme tokens.
const categoryAccents = [
  "bg-amber-500/10 text-amber-600",
  "bg-indigo-500/10 text-indigo-600",
  "bg-emerald-500/10 text-emerald-600",
  "bg-rose-500/10 text-rose-600",
  "bg-sky-500/10 text-sky-600",
  "bg-violet-500/10 text-violet-600",
]

// Cache the public gallery list (changes slowly) so the homepage stays fast even
// though the underlying Supabase fetch is no-store.
const getHomeGalleries = unstable_cache(
  async () => listPublicGalleries(12),
  ["home-public-galleries"],
  { revalidate: 1800 },
)

export default async function LandingPage() {
  const galleries = await getHomeGalleries()
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main className="pb-24 md:pb-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLd(faqJsonLd) }}
        />
        <HeroSection />
        <HomeDemoExperience />
        <HomeRichSections />
        <HomePricingPreview />
        <HomeBlogPreview />
        <HomeShowrooms galleries={galleries} />
        <section className="border-y border-border/60 bg-muted/20 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Detayları doğru sayfada inceleyin
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Anasayfa hızlı karar aldırır; ürün detayları, demo, fiyat ve rehber içerikleri ayrı sayfalarda odaklı şekilde sunulur.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {categoryCards.map((card, index) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group rounded-2xl border border-border/70 bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${categoryAccents[index % categoryAccents.length]}`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <HomeFaqPreview />
        <HomeTrustGuarantees />
        <CtaSection />
      </main>
      <LandingFooter />
      <MobileStickyCta />
    </div>
  )
}
