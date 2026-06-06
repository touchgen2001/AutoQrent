import type { Metadata } from "next"
import { CtaSection } from "@/components/landing/cta-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { LandingRouteShell } from "@/components/landing/landing-route-shell"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Nasıl Çalışır",
  description:
    "Cebindegaleri çalışma akışı: araç ekleme, QR üretimi, müşteri etkileşimi ve lead yönetiminin operasyon adımları.",
  path: "/nasil-calisir",
  keywords: ["nasıl çalışır", "qr akışı", "galeri operasyonu", "lead süreci"],
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
