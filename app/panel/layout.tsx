import type { Metadata } from "next"
import { PanelLayoutClient } from "@/components/dashboard/panel-layout-client"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Galeri Paneli",
  description: "Cebindegaleri panelinde araç, müşteri talebi ve QR operasyonlarını yönetin.",
  path: "/panel",
  noIndex: true,
})

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PanelLayoutClient>{children}</PanelLayoutClient>
}
