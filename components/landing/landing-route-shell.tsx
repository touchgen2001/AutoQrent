import type { ReactNode } from "react"
import { LandingFooter } from "@/components/landing/footer"
import { LandingHeader } from "@/components/landing/header"
import { MobileStickyCta } from "@/components/landing/mobile-sticky-cta"

type LandingRouteShellProps = {
  children: ReactNode
}

export function LandingRouteShell({ children }: LandingRouteShellProps) {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main className="pb-24 md:pb-0">{children}</main>
      <LandingFooter />
      <MobileStickyCta />
    </div>
  )
}
