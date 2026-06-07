import type { Metadata } from "next"
import { CtaSection } from "@/components/landing/cta-section"
import { HomeTrustGuarantees } from "@/components/landing/home-trust-guarantees"
import { LandingRouteShell } from "@/components/landing/landing-route-shell"
import { PricingSection } from "@/components/landing/pricing-section"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Fiyatlar",
  description:
    "Cebindegaleri fiyatları: Başlangıç 999 TL, Pro 2.500 TL, Premium 4.990 TL ve kurumsal teklif seçeneklerini karşılaştırın.",
  path: "/fiyatlar",
  keywords: ["galeri fiyatlandırma", "999 TL galeri paketi", "pro galeri paketi", "qr galeri planı"],
  image: `/og?${new URLSearchParams({
    eyebrow: "Fiyatlar",
    title: "999 TL'den başlayan galeri paketleri",
    subtitle: "Başlangıç, Pro ve Premium planları gizli ücret olmadan karşılaştırın",
  }).toString()}`,
})

export default function PricingPage() {
  return (
    <LandingRouteShell>
      <PricingSection />
      <HomeTrustGuarantees pricingDescription="999 TL, 2.500 TL ve 4.990 TL paketlerin kapsamını yukarıda net görürsünüz; gizli ek ücret yoktur." />
      <CtaSection />
    </LandingRouteShell>
  )
}
