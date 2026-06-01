import type { Metadata } from "next"
import { CtaSection } from "@/components/landing/cta-section"
import { LandingRouteShell } from "@/components/landing/landing-route-shell"
import { PricingSection } from "@/components/landing/pricing-section"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Fiyatlar",
  description:
    "Cebindegaleri paket kapsamları ve fiyat yaklaşımı: galeri ihtiyaçlarına göre plan karşılaştırması ve teklif süreci.",
  path: "/fiyatlar",
  keywords: ["galeri fiyatlandırma", "paket karşılaştırma", "teklif al", "qr galeri planı"],
})

export default function PricingPage() {
  return (
    <LandingRouteShell>
      <PricingSection />
      <CtaSection />
    </LandingRouteShell>
  )
}
