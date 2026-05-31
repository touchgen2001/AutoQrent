"use client"

import { Bell, Search, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MobileMenuButton } from "./sidebar"

interface HeaderProps {
  onMobileMenuClick: () => void
}

export function DashboardHeader({ onMobileMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-background border-b border-border">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <MobileMenuButton onClick={onMobileMenuClick} />
          
          {/* Search */}
          <div className="hidden sm:flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <Input 
              type="search"
              placeholder="Araç, müşteri veya QR kodu ara..."
              className="w-64 lg:w-80 pl-9 h-9 bg-muted border-0"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Mobile Search */}
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Search className="w-5 h-5" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">AY</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">Ahmet Yılmaz</p>
                  <p className="text-xs text-muted-foreground">ABC Otomotiv</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profil</DropdownMenuItem>
              <DropdownMenuItem>Galeri Ayarları</DropdownMenuItem>
              <DropdownMenuItem>Abonelik</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
