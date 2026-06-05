import type { Metadata } from "next"
import { CtaSection } from "@/components/landing/cta-section"
import { LandingRouteShell } from "@/components/landing/landing-route-shell"
import { PricingSection } from "@/components/landing/pricing-section"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Fiyatlar",
  description:
    "Cebindegaleri fiyatları: Başlangıç 999 TL, Pro 2.500 TL, Premium 4.990 TL ve kurumsal teklif seçeneklerini karşılaştırın.",
  path: "/fiyatlar",
  keywords: ["galeri fiyatlandırma", "999 TL galeri paketi", "pro galeri paketi", "qr galeri planı"],
})

export default function PricingPage() {
  return (
    <LandingRouteShell>
      <PricingSection />
      <CtaSection />
    </LandingRouteShell>
  )
}
