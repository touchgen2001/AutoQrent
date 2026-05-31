import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, QrCode, Smartphone, BarChart3 } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative pt-24 md:pt-32 pb-16 md:pb-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium mb-6">
              <QrCode className="w-4 h-4" />
              <span>Türkiye&apos;nin 1 Numaralı Galeri Yazılımı</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight text-balance">
              Galerinin Cebindeki{" "}
              <span className="text-accent">Dijital Vitrini</span>
            </h1>
            
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Araç camındaki QR kod ile müşteriyi direkt mobil ilana bağlayan, 
              stok yönetimi ve müşteri takibini tek panelden yapmanızı sağlayan 
              profesyonel galeri yazılımı.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-8 text-base">
                <Link href="/kayit">
                  Ücretsiz Başla
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
                <Link href="#nasil-calisir">
                  Nasıl Çalışır?
                </Link>
              </Button>
            </div>
            
            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8 pt-8 border-t border-border">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">500+</div>
                <div className="text-sm text-muted-foreground mt-1">Aktif Galeri</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">25K+</div>
                <div className="text-sm text-muted-foreground mt-1">Araç Kaydı</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">1M+</div>
                <div className="text-sm text-muted-foreground mt-1">QR Tarama</div>
              </div>
            </div>
          </div>
          
          {/* Right Content - Optimized Hero Visual */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px]">
              <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-2xl">
                <Image
                  src="/hero-showroom-preview.svg"
                  alt="Cebindegaleri mobil vitrin ekranı"
                  width={900}
                  height={1200}
                  preload
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 70vw, 420px"
                  className="h-auto w-full"
                />
              </div>

              {/* Floating Elements */}
              <div className="absolute -left-8 top-20 p-4 bg-card rounded-xl shadow-lg border border-border hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">QR Tarandı</div>
                    <div className="text-xs text-muted-foreground">Az önce</div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-8 top-1/2 p-4 bg-card rounded-xl shadow-lg border border-border hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Yeni Lead</div>
                    <div className="text-xs text-muted-foreground">+3 bugün</div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-4 bottom-20 p-4 bg-card rounded-xl shadow-lg border border-border hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">%45 Artış</div>
                    <div className="text-xs text-muted-foreground">Bu hafta</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
