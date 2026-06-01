import Image from 'next/image'
import { Building2, ScanLine, ShieldCheck, TrendingUp } from 'lucide-react'
import { IMAGE_PRESETS } from '@/lib/image-presets'

const partnerBrands = [
  {
    name: 'Prestij Otomotiv',
    city: 'İstanbul',
    logo: '/gallery-logos/prestij-otomotiv.svg',
    metric: '+38%',
    metricLabel: '3 ayda lead artışı',
  },
  {
    name: 'Anadolu Motor',
    city: 'Ankara',
    logo: '/gallery-logos/anadolu-motor.svg',
    metric: '+35%',
    metricLabel: 'WhatsApp dönüşüm artışı',
  },
  {
    name: 'Ege Car Plaza',
    city: 'İzmir',
    logo: '/gallery-logos/ege-car-plaza.svg',
    metric: '+42%',
    metricLabel: 'QR tarama artışı',
  },
  {
    name: 'Atlas Auto',
    city: 'Bursa',
    logo: '/gallery-logos/atlas-auto.svg',
    metric: '-27%',
    metricLabel: 'İlk cevap süresi düşüşü',
  },
  {
    name: 'Nova Motors',
    city: 'Konya',
    logo: '/gallery-logos/nova-motors.svg',
    metric: '+33%',
    metricLabel: 'Demo sonrası kayıt oranı',
  },
  {
    name: 'Vizyon Gallery',
    city: 'Antalya',
    logo: '/gallery-logos/vizyon-gallery.svg',
    metric: '+31%',
    metricLabel: 'Lead to satış verimi',
  },
]

const trustStats = [
  { label: 'Aktif Galeri', value: '500+' },
  { label: 'Aylık Araç Ziyareti', value: '1.2M+' },
  { label: 'Ortalama Lead Artışı', value: '+35%' },
  { label: 'Canlıya Alma Süresi', value: '5 dk' },
]

export function TrustSection() {
  return (
    <section id="guven" className="py-20 md:py-24 border-y border-border/60 bg-gradient-to-b from-muted/30 via-background to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <ShieldCheck className="h-3.5 w-3.5" />
              Güven ve Marka Standardı
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Galeri markalarının dijital vitrinde aynı kaliteyle görünmesini sağlıyoruz
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Sadece araç listeleme değil; QR kimliği, müşteri iletişimi ve satış akışıyla uçtan uca bir vitrin deneyimi kuruyoruz.
              Böylece markanız her temas noktasında daha güvenilir ve profesyonel görünür.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {trustStats.map((item) => (
                <div key={item.label} className="rounded-xl border border-border/70 bg-card/85 p-4">
                  <p className="text-xl font-semibold text-foreground">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/90 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Platformda Yer Alan Galeriler</h3>
              <Building2 className="h-5 w-5 text-accent" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {partnerBrands.map((brand) => (
                <div key={brand.name} className="rounded-xl border border-border/60 bg-muted/35 p-3">
                  <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
                    <Image
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      width={640}
                      height={220}
                      sizes={IMAGE_PRESETS.trustLogo.sizes}
                      quality={IMAGE_PRESETS.trustLogo.quality}
                      className="h-14 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-foreground">{brand.name}</p>
                    <p className="text-xs text-muted-foreground">{brand.city}</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                      <TrendingUp className="h-3 w-3" />
                      {brand.metric} {brand.metricLabel}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <ScanLine className="h-3.5 w-3.5 text-accent" />
                QR performans takibi aktif
              </p>
              <p className="mt-1">Tarama, tıklama ve lead verileri araç bazında aynı panelde izlenir.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
