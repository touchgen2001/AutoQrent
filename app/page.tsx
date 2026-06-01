import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, ClipboardList, Layers3, Sparkles } from "lucide-react"
import { LandingHeader } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { CtaSection } from "@/components/landing/cta-section"
import { HomeRichSections } from "@/components/landing/home-rich-sections"
import { MobileStickyCta } from "@/components/landing/mobile-sticky-cta"
import { LandingFooter } from "@/components/landing/footer"
import { absoluteUrl, createPageMetadata } from "@/lib/seo"

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

function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

export const metadata: Metadata = createPageMetadata({
  title: "Galerinin Cebindeki Dijital Vitrin",
  description:
    "Cebindegaleri ile araç galeriniz için QR kodlu dijital vitrin, lead yönetimi ve mobil showroom deneyimini tek platformda yönetin.",
  path: "/",
  keywords: ["galeri yazılımı", "qr kodlu araç vitrini", "oto galeri crm", "mobil showroom"],
})

const categoryCards = [
  {
    title: "Özellikler",
    description: "QR, araç vitrini, lead takibi ve yönetim modüllerini galeri operasyonuna göre detaylı inceleyin.",
    href: "/ozellikler",
    icon: Layers3,
  },
  {
    title: "Nasıl Çalışır",
    description: "Kurulumdan satış sonrası takibe kadar müşteri ve ekip akışını adım adım görün.",
    href: "/nasil-calisir",
    icon: ClipboardList,
  },
  {
    title: "Fiyatlar",
    description: "Sabit fiyat yerine paket kapsamı, destek seviyesi ve geçiş modelini karşılaştırın.",
    href: "/fiyatlar",
    icon: Sparkles,
  },
  {
    title: "SSS",
    description: "Kurulum, QR, panel, lead ve destek başlıklarında en kritik soruların net cevapları.",
    href: "/sss",
    icon: BookOpen,
  },
]

export default function LandingPage() {
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
        <HeroSection />
        <HomeRichSections />
        <section className="border-y border-border/60 bg-muted/20 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Kategorilere ayrılmış detaylı içerik
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Anasayfa karar sürecini hızlandırır; ürün detayları ve operasyon anlatımları ayrı sayfalarda odaklı şekilde sunulur.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {categoryCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group rounded-2xl border border-border/70 bg-card p-6 transition-all hover:border-accent/40 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
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
        <CtaSection />
      </main>
      <LandingFooter />
      <MobileStickyCta />
    </div>
  )
}
