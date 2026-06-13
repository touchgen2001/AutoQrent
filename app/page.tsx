import type { Metadata } from "next"
import { LandingHeader } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { CtaSection } from "@/components/landing/cta-section"
import { ProductProofSection } from "@/components/landing/product-proof-section"
import { HomeComparison } from "@/components/landing/home-comparison"
import { HomeDemoExperience } from "@/components/landing/home-demo-experience"
import { HomePricingPreview } from "@/components/landing/home-pricing-preview"
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
    "Araç galerileri için QR kodlu dijital showroom, stok yönetimi, müşteri talebi takibi ve satış analitiği platformu.",
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
    "Cebindegaleri ile araç galeriniz için QR kodlu dijital showroom, size özel galeri sitesi, müşteri talebi takibi ve 14 gün ücretsiz deneme akışını tek platformda yönetin.",
  path: "/",
  keywords: ["galeri yazılımı", "qr kodlu araç vitrini", "oto galeri crm", "mobil showroom"],
})

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
        <ProductProofSection />
        <HomeComparison />
        <HomeDemoExperience />
        <HomePricingPreview />
        <HomeShowrooms galleries={galleries} />
        <HomeFaqPreview />
        <HomeTrustGuarantees />
        <CtaSection />
      </main>
      <LandingFooter />
      <MobileStickyCta />
    </div>
  )
}
