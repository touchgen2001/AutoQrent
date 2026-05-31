import type { Metadata } from "next"
import { LandingHeader } from "@/components/landing/header"
import { HeroSection } from "@/components/landing/hero-section"
import { TrustSection } from "@/components/landing/trust-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { PricingSection } from "@/components/landing/pricing-section"
import { FaqSection } from "@/components/landing/faq-section"
import { CtaSection } from "@/components/landing/cta-section"
import { MobileStickyCta } from "@/components/landing/mobile-sticky-cta"
import { LandingFooter } from "@/components/landing/footer"
import { faqItems } from "@/lib/faq-items"
import { absoluteUrl, createPageMetadata } from "@/lib/seo"

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
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

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
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
          dangerouslySetInnerHTML={{ __html: toJsonLd(faqJsonLd) }}
        />
        <HeroSection />
        <TrustSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <LandingFooter />
      <MobileStickyCta />
    </div>
  )
}
