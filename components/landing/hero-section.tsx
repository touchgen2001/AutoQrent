import Image from "next/image"
import { Check, QrCode } from "lucide-react"
import { HeroCtaActions } from "@/components/landing/hero-cta-actions"
import { IMAGE_PRESETS } from "@/lib/image-presets"

export function HeroSection() {
  return (
    <section className="relative pt-24 md:pt-32 pb-16 md:pb-24 overflow-hidden">
      {/* Background gradient + brand-gold / indigo glows for warmth */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/30" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(55% 50% at 88% -5%, rgba(217,167,79,0.22), transparent 60%), radial-gradient(45% 45% at -5% 105%, rgba(99,102,241,0.12), transparent 55%)",
        }}
      />
      
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/25 rounded-full text-sm font-medium mb-6">
              <QrCode className="w-4 h-4" />
              <span>14 gün ücretsiz deneme + QR odaklı dijital showroom</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight text-balance">
              QR Okutan Müşteriyi{" "}
              <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 bg-clip-text text-transparent">Araç Sayfasına</span> Taşıyın
            </h1>
            
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Cebindegaleri; size özel galeri sitenizi, araç sayfalarınızı, QR kodlarınızı ve müşteri taleplerini tek panelde toplar.
              Galerici aracı yönetir, müşteri telefondan doğru bilgiye ulaşır.
            </p>
            
            <HeroCtaActions />

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground lg:justify-start">
              {["Kredi kartı gerekmez", "2 dakikada kurulum", "14 gün ücretsiz"].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
            
            <div className="mt-10 grid gap-4 border-t border-border pt-8 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-card/70 p-4">
                <div className="text-base font-semibold text-foreground">Size Özel Galeri Sitesi</div>
                <div className="mt-1 text-sm text-muted-foreground">Her galeri kendi logosu, iletişimi ve araçlarıyla yayınlanır</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/70 p-4">
                <div className="text-base font-semibold text-foreground">Standart QR Kod</div>
                <div className="mt-1 text-sm text-muted-foreground">Araç başındaki QR doğrudan ilgili mobil araç sayfasını açar</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/70 p-4">
                <div className="text-base font-semibold text-foreground">Tekil Kullanıcı Paneli</div>
                <div className="mt-1 text-sm text-muted-foreground">Araç, müşteri talebi ve abonelik işlemleri tek hesapta yönetilir</div>
              </div>
            </div>
          </div>
          
          {/* Right Content - Optimized Hero Visual */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px]">
              <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-2xl">
                <Image
                  src="/landing-hero-qr-flow-simple.png"
                  alt="Cebindegaleri QR ziyaret, müşteri talebi ve analiz akışını gösteren mobil vitrin görseli"
                  width={1024}
                  height={1024}
                  preload
                  loading="eager"
                  fetchPriority="high"
                  quality={IMAGE_PRESETS.landingHero.quality}
                  sizes={IMAGE_PRESETS.landingHero.sizes}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
