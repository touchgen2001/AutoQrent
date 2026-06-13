import type { Metadata } from "next"
import { CtaSection } from "@/components/landing/cta-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { LandingRouteShell } from "@/components/landing/landing-route-shell"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Nasıl Çalışır",
  description:
    "Cebindegaleri çalışma akışı: araç ekleme, QR üretimi, müşteri etkileşimi ve talep yönetiminin operasyon adımları; sahte yorum yerine canlı demo görüşmesinde doğrulayın.",
  path: "/nasil-calisir",
  keywords: ["nasıl çalışır", "qr akışı", "galeri operasyonu", "müşteri talebi süreci", "canlı galeri demosu"],
})

export default function HowItWorksPage() {
  return (
    <LandingRouteShell>
      <HowItWorksSection />
      <TestimonialsSection />
      <CtaSection />
    </LandingRouteShell>
  )
}
