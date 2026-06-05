"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { cn } from "@/lib/utils"
import { getPanelAuthSession } from "@/lib/client/panel-auth"

export function PanelLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [subscriptionNotice, setSubscriptionNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void (async () => {
      const session = await getPanelAuthSession()
      if (!active) return

      if (!session) {
        const next = pathname && pathname.startsWith("/panel") ? pathname : "/panel"
        router.replace(`/giris?next=${encodeURIComponent(next)}`)
        setIsAuthorized(false)
        setIsAuthReady(true)
        return
      }

      setIsAuthorized(true)
      setIsAuthReady(true)

      const subscriptionResponse = await fetch("/api/panel/subscription", { cache: "no-store" }).catch(() => null)
      if (!active || !subscriptionResponse) return

      const subscriptionData = await subscriptionResponse.json().catch(() => null) as {
        ok?: boolean
        subscription?: {
          requiresPlanSelection?: boolean
          isTrialExpired?: boolean
        }
        message?: string
      } | null

      if (!active || !subscriptionData?.ok || !subscriptionData.subscription?.requiresPlanSelection) return

      const message = subscriptionData.subscription.isTrialExpired
        ? "Deneme süreniz sona erdi. Yeni araç ve QR işlemleri için plan seçin."
        : "Aktif abonelik bulunmuyor. Devam etmek için plan seçin."
      setSubscriptionNotice(message)

      if (!pathname.startsWith("/panel/ayarlar")) {
        router.replace("/panel/ayarlar?tab=subscription")
      }
    })()

    return () => {
      active = false
    }
  }, [pathname, router])

  if (!isAuthReady || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Panel oturumu kontrol ediliyor...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      <div
        className={cn(
          "transition-all duration-300",
          isCollapsed ? "lg:ml-[70px]" : "lg:ml-[260px]",
        )}
      >
        <DashboardHeader onMobileMenuClick={() => setIsMobileOpen(true)} />

        <main className="p-4 md:p-6">
          {subscriptionNotice && (
            <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
              {subscriptionNotice}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
