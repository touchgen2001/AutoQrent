import type { Metadata } from "next"
import { CtaSection } from "@/components/landing/cta-section"
import { FaqSection } from "@/components/landing/faq-section"
import { LandingRouteShell } from "@/components/landing/landing-route-shell"
import { faqItems } from "@/lib/faq-items"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Sık Sorulan Sorular",
  description:
    "Kurulum, QR kod akışı, panel kullanımı ve destek süreçleri hakkında sık sorulan soruların yanıtları.",
  path: "/sss",
  keywords: ["galeri sss", "qr kod sss", "panel desteği", "kurulum soruları"],
})

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

export default function FaqPage() {
  return (
    <LandingRouteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqJsonLd) }}
      />
      <FaqSection />
      <CtaSection />
    </LandingRouteShell>
  )
}
