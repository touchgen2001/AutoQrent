import Image from "next/image"
import { QrCode, Smartphone, BarChart3 } from "lucide-react"
import { HeroCtaActions } from "@/components/landing/hero-cta-actions"
import { IMAGE_PRESETS } from "@/lib/image-presets"

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
              <span>QR odaklı galeri dijital vitrin altyapısı</span>
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
            
            <HeroCtaActions />
            
            <div className="mt-12 grid grid-cols-3 gap-8 pt-8 border-t border-border">
              <div>
                <div className="text-base sm:text-lg font-semibold text-foreground">Gerçek Zamanlı QR Akışı</div>
                <div className="text-sm text-muted-foreground mt-1">Tarama ve yönlendirme araç bazında izlenir</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-semibold text-foreground">Panelden Tek Nokta Yönetim</div>
                <div className="text-sm text-muted-foreground mt-1">Araç, lead ve içerik aynı panelde güncellenir</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-semibold text-foreground">Mobil Müşteri Teması</div>
                <div className="text-sm text-muted-foreground mt-1">WhatsApp, arama ve konum aksiyonları hazır gelir</div>
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
                  loading="eager"
                  fetchPriority="high"
                  quality={IMAGE_PRESETS.landingHero.quality}
                  sizes={IMAGE_PRESETS.landingHero.sizes}
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
                    <div className="text-sm font-medium">QR Ziyaret Akışı</div>
                    <div className="text-xs text-muted-foreground">Anlık panel kaydı</div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-8 top-1/2 p-4 bg-card rounded-xl shadow-lg border border-border hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Lead Kaydı</div>
                    <div className="text-xs text-muted-foreground">Form, telefon, WhatsApp</div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-4 bottom-20 p-4 bg-card rounded-xl shadow-lg border border-border hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Analitik İzleme</div>
                    <div className="text-xs text-muted-foreground">Araç bazlı takip görünümü</div>
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
