"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { BrandLogo } from "@/components/brand/brand-logo"
import { useLandingCtaExperiment } from "@/components/landing/use-landing-cta-experiment"

const navLinks = [
  { name: "Özellikler", href: "/ozellikler" },
  { name: "Nasıl Çalışır", href: "/nasil-calisir" },
  { name: "Fiyatlar", href: "/fiyatlar" },
  { name: "SSS", href: "/sss" },
  { name: "İletişim", href: "/iletisim" },
]

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { config, trackClick } = useLandingCtaExperiment('header')

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <BrandLogo href="/" tone="light" />

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/giris">Giriş Yap</Link>
            </Button>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link
                href={config.primaryHref}
                onClick={() => trackClick('primary', config.primaryHref, config.primaryLabel)}
              >
                {config.primaryLabel}
              </Link>
            </Button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 space-y-2">
              <Button variant="outline" asChild className="w-full">
                <Link href="/giris">Giriş Yap</Link>
              </Button>
              <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link
                  href={config.primaryHref}
                  onClick={() => trackClick('primary', config.primaryHref, config.primaryLabel)}
                >
                  {config.primaryLabel}
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
