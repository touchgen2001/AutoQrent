"use client"

import { useState } from "react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar 
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />
      
      <div className={cn(
        "transition-all duration-300",
        isCollapsed ? "lg:ml-[70px]" : "lg:ml-[260px]"
      )}>
        <DashboardHeader onMobileMenuClick={() => setIsMobileOpen(true)} />
        
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
