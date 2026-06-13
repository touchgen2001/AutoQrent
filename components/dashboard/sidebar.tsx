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
  ClipboardList,
  CalendarDays,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  ExternalLink,
  CalendarCheck2,
  MessageSquareText,
  ArchiveRestore,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BrandLogo, BrandMark } from "@/components/brand/brand-logo"
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
    slug: string
    vehicleCount: number
    activeVehicleCount: number
  }
}

const navItems = [
  {
    title: "Genel Bakış",
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
    title: "Müşteri Talepleri",
    href: "/panel/leadler",
    icon: Users
  },
  {
    title: "Rezervasyonlar",
    href: "/panel/rezervasyonlar",
    icon: CalendarCheck2
  },
  {
    title: "Galeri Yorumları",
    href: "/panel/yorumlar",
    icon: MessageSquareText
  },
  {
    title: "Takvim & Takip",
    href: "/panel/takvim",
    icon: CalendarDays
  },
  {
    title: "Analitik",
    href: "/panel/analitik",
    icon: BarChart3
  },
  {
    title: "Yönetici Raporu",
    href: "/panel/raporlar",
    icon: ClipboardList
  },
  {
    title: "Denetim Kayıtları",
    href: "/panel/audit-logs",
    icon: ShieldCheck
  },
  {
    title: "Araç Çöp Kutusu",
    href: "/panel/arsiv",
    icon: ArchiveRestore
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
  const [showroomPath, setShowroomPath] = useState<string | null>(null)
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
          setShowroomPath(null)
          return
        }

        setGalleryName(data.settings.name || null)
        setVehicleCount(data.settings.vehicleCount)
        setActiveVehicleCount(data.settings.activeVehicleCount)
        setShowroomPath(data.settings.slug ? `/showroom/${data.settings.slug}` : null)
      } catch {
        if (abortController.signal.aborted) return
        setGalleryName(null)
        setVehicleCount(null)
        setActiveVehicleCount(null)
        setShowroomPath(null)
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
          "fixed top-0 left-0 z-50 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 print:hidden",
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
              <BrandLogo href="/panel" tone="sidebar" />
            )}
            {isCollapsed && (
              <BrandMark tone="sidebar" className="[&_span]:size-9" />
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
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground font-semibold ring-1 ring-sidebar-border shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary [&_svg]:text-sidebar-primary"
                      : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0 transition-colors" />
                  {!isCollapsed && (
                    <span className="text-sm">{item.title}</span>
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
                {showroomPath && (
                  <Link
                    href={showroomPath}
                    target="_blank"
                    className="mt-3 flex items-center justify-center gap-2 rounded-md border border-sidebar-border px-2 py-2 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Galeri Sayfam
                  </Link>
                )}
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
