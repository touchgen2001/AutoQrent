import type { Metadata } from "next"
import { CtaSection } from "@/components/landing/cta-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { LandingRouteShell } from "@/components/landing/landing-route-shell"
import { TrustSection } from "@/components/landing/trust-section"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Özellikler",
  description:
    "Cebindegaleri özellikleri: QR kodlu araç vitrini, panel yönetimi, müşteri talebi takibi, mobil etkileşim ve her temas noktasında tutarlı, güvenli galeri marka standardı.",
  path: "/ozellikler",
  keywords: ["galeri özellikleri", "qr kodlu vitrin", "müşteri talebi yönetimi", "galeri paneli", "güvenli galeri altyapısı", "galeri marka standardı"],
})

export default function FeaturesPage() {
  return (
    <LandingRouteShell>
      <FeaturesSection />
      <TrustSection />
      <CtaSection />
    </LandingRouteShell>
  )
}
