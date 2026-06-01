"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  Car, 
  QrCode, 
  Users, 
  BarChart3, 
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  Menu
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { clearPanelAuthSession } from "@/lib/client/panel-auth"

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  isMobileOpen: boolean
  onMobileClose: () => void
}

type PanelSettingsSummaryResponse = {
  ok?: boolean
  message?: string
  settings?: {
    name: string
    vehicleCount: number
    activeVehicleCount: number
  }
}

const navItems = [
  {
    title: "Dashboard",
    href: "/panel",
    icon: LayoutDashboard
  },
  {
    title: "Araçlar",
    href: "/panel/araclar",
    icon: Car
  },
  {
    title: "QR Kodlar",
    href: "/panel/qr-kodlar",
    icon: QrCode
  },
  {
    title: "Leadler",
    href: "/panel/leadler",
    icon: Users
  },
  {
    title: "Analitik",
    href: "/panel/analitik",
    icon: BarChart3
  },
  {
    title: "Audit Logları",
    href: "/panel/audit-logs",
    icon: ShieldCheck
  },
  {
    title: "Ayarlar",
    href: "/panel/ayarlar",
    icon: Settings
  }
]

export function DashboardSidebar({ isCollapsed, onToggle, isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [galleryName, setGalleryName] = useState<string | null>(null)
  const [vehicleCount, setVehicleCount] = useState<number | null>(null)
  const [activeVehicleCount, setActiveVehicleCount] = useState<number | null>(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)

  useEffect(() => {
    const abortController = new AbortController()

    const fetchSummary = async () => {
      setIsSummaryLoading(true)
      try {
        const response = await fetch("/api/panel/settings", {
          cache: "no-store",
          signal: abortController.signal,
        })
        const data = (await response.json()) as PanelSettingsSummaryResponse

        if (!response.ok || !data.ok || !data.settings) {
          setGalleryName(null)
          setVehicleCount(null)
          setActiveVehicleCount(null)
          return
        }

        setGalleryName(data.settings.name || null)
        setVehicleCount(data.settings.vehicleCount)
        setActiveVehicleCount(data.settings.activeVehicleCount)
      } catch {
        if (abortController.signal.aborted) return
        setGalleryName(null)
        setVehicleCount(null)
        setActiveVehicleCount(null)
      } finally {
        if (!abortController.signal.aborted) {
          setIsSummaryLoading(false)
        }
      }
    }

    void fetchSummary()

    return () => {
      abortController.abort()
    }
  }, [])

  const usagePercent = (() => {
    if (vehicleCount === null || activeVehicleCount === null || vehicleCount <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((activeVehicleCount / vehicleCount) * 100)))
  })()

  const handleLogout = () => {
    void clearPanelAuthSession()
    onMobileClose()
    router.push("/giris")
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
          isCollapsed ? "w-[70px]" : "w-[260px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "flex items-center h-16 border-b border-sidebar-border px-4",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            {!isCollapsed && (
              <Link href="/panel" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-sidebar-primary-foreground" />
                </div>
                <span className="font-bold text-sidebar-foreground">
                  Cebindegaleri
                </span>
              </Link>
            )}
            {isCollapsed && (
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <QrCode className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
            )}
            <button 
              onClick={onToggle}
              className={cn(
                "hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-sidebar-accent transition-colors",
                isCollapsed && "absolute -right-3 top-6 bg-sidebar border border-sidebar-border"
              )}
            >
              <ChevronLeft className={cn(
                "w-4 h-4 text-sidebar-muted transition-transform",
                isCollapsed && "rotate-180"
              )} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/panel" && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.title}</span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-sidebar-border">
            {!isCollapsed && (
              <div className="mb-3 p-3 bg-sidebar-accent rounded-lg">
                <p className="text-xs text-sidebar-muted mb-1">Canlı Galeri Özeti</p>
                {isSummaryLoading ? (
                  <p className="text-sm font-medium text-sidebar-foreground">Yükleniyor...</p>
                ) : (
                  <p className="text-sm font-medium text-sidebar-foreground">
                    {activeVehicleCount ?? 0}/{vehicleCount ?? 0} Yayında Araç
                  </p>
                )}
                {galleryName && (
                  <p className="mt-1 text-xs text-sidebar-muted truncate">{galleryName}</p>
                )}
                <div className="mt-2 h-1.5 bg-sidebar-border rounded-full overflow-hidden">
                  <div className="h-full bg-sidebar-primary rounded-full" style={{ width: `${usagePercent}%` }} />
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
                isCollapsed && "justify-center px-0"
              )}
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="ml-3 text-sm">Çıkış Yap</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
      aria-label="Menü"
    >
      <Menu className="w-6 h-6" />
    </button>
  )
}
