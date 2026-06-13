import { Building2, ScanLine, ShieldCheck } from 'lucide-react'

import { BrandLogo } from '@/components/brand/brand-logo'

const trustStandards = [
  { label: 'Galeri kimliği', value: 'Logo, iletişim ve showroom bilgileri panelden yönetilir.' },
  { label: 'QR takip akışı', value: 'Tarama, tıklama ve müşteri talepleri araç bazında ayrıştırılır.' },
  { label: 'Görsel güvenliği', value: 'Fotoğraf yüklemeleri sunucu tarafında imza ve boyut kontrolünden geçer.' },
  { label: 'Erişim kontrolü', value: 'Panel ve admin alanları oturum kontrolüyle korunur.' },
]

const platformStandards = [
  'Araç sayfası, showroom ve panel görünümü aynı marka dilinde kalır.',
  'Sabit başarı yüzdesi veya doğrulanmamış galeri yorumu gösterilmez.',
  'Kurulum kapsamı ve destek seviyesi demo görüşmesinde netleştirilir.',
  'Paylaşılan araç ve galeri bağlantıları güvenli bağlantı standardıyla korunur.',
]

export function TrustSection() {
  return (
    <section id="guven" className="border-y border-border/60 bg-gradient-to-b from-muted/30 via-background to-background py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Güven ve Marka Standardı
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Galeri markanız her temas noktasında aynı premium görünümü korur
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Cebindegaleri; logo, araç vitrini, QR müşteri akışı ve panel yönetimini tek görsel standartta birleştirir.
              Bu bölümde sahte başarı oranı veya doğrulanmamış müşteri logosu kullanılmaz.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {trustStandards.map((item) => (
                <div key={item.label} className="rounded-xl border border-border/70 bg-card/85 p-4">
                  <p className="text-base font-semibold text-foreground">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/90 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <BrandLogo href="/" tone="light" />
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="mt-6 grid gap-3">
              {platformStandards.map((item) => (
                <div key={item} className="rounded-xl border border-border/60 bg-muted/35 p-3 text-sm leading-6 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <ScanLine className="h-3.5 w-3.5" />
                QR performans takibi altyapısı
              </p>
              <p className="mt-1">Tarama, tıklama ve müşteri talepleri panelde araç bazında izlenir.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
