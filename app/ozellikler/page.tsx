import type { Metadata } from "next"
import { CtaSection } from "@/components/landing/cta-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { LandingRouteShell } from "@/components/landing/landing-route-shell"
import { TrustSection } from "@/components/landing/trust-section"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Özellikler",
  description:
    "Cebindegaleri özellikleri: QR kodlu araç vitrini, panel yönetimi, lead takibi ve mobil müşteri etkileşimi.",
  path: "/ozellikler",
  keywords: ["galeri özellikleri", "qr kodlu vitrin", "lead yönetimi", "galeri paneli"],
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
