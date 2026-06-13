'use client'

import { ChangeEvent, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Building2, Car, ImagePlus, MapPin, ShieldCheck, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEMO_PUBLIC_VEHICLE } from '@/lib/demo-public-experience'

const accentOptions = [
  { label: 'Premium Siyah', value: '#171717' },
  { label: 'Güven Mavisi', value: '#1d4ed8' },
  { label: 'Sport Kırmızı', value: '#b91c1c' },
]

function getInitials(value: string) {
  const initials = value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('')

  return initials || 'CG'
}

export function PersonalizedDemoBuilder() {
  const [galleryName, setGalleryName] = useState('Örnek Otomotiv')
  const [city, setCity] = useState('İstanbul')
  const [accent, setAccent] = useState(accentOptions[0].value)
  const [logoPreview, setLogoPreview] = useState('')

  const registrationHref = useMemo(() => {
    const params = new URLSearchParams({
      source: 'demo-builder',
      gallery: galleryName.trim() || 'Örnek Otomotiv',
    })
    return `/kayit?${params.toString()}`
  }, [galleryName])

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setLogoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm">
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b border-border p-6 md:p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">Kendi demo vitrininizi oluşturun</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Galeri adınızı, şehrinizi ve logonuzu girin. Ön izleme anında bu cihazda oluşur.
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="demoGalleryName">Galeri adı</Label>
              <Input
                id="demoGalleryName"
                value={galleryName}
                maxLength={80}
                onChange={(event) => setGalleryName(event.target.value)}
                placeholder="Örnek Otomotiv"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demoGalleryCity">Şehir</Label>
              <Input
                id="demoGalleryCity"
                value={city}
                maxLength={60}
                onChange={(event) => setCity(event.target.value)}
                placeholder="İstanbul"
              />
            </div>
            <div className="space-y-2">
              <Label>Vitrin rengi</Label>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {accentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccent(option.value)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      accent === option.value ? 'border-accent bg-accent/10 text-foreground' : 'border-border text-muted-foreground hover:border-accent/40'
                    }`}
                  >
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: option.value }} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="demoGalleryLogo">Logo ön izlemesi</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild type="button" variant="outline" size="sm">
                  <label htmlFor="demoGalleryLogo" className="cursor-pointer">
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Logo Seç
                  </label>
                </Button>
                {logoPreview ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLogoPreview('')}>
                    <X className="mr-2 h-4 w-4" />
                    Kaldır
                  </Button>
                ) : null}
                <input
                  id="demoGalleryLogo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className="sr-only"
                />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Logo dosyası sunucuya yüklenmez; yalnızca tarayıcınızda ön izlenir.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-950 p-5 text-white md:p-8">
          <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-neutral-900 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-sm font-black text-neutral-950">
                  {logoPreview ? (
                    <Image src={logoPreview} alt="Seçilen galeri logosu" fill unoptimized className="object-contain p-1.5" />
                  ) : (
                    getInitials(galleryName)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{galleryName.trim() || 'Örnek Otomotiv'}</p>
                  <p className="flex items-center gap-1 text-xs text-white/55">
                    <MapPin className="h-3 w-3" />
                    {city.trim() || 'Türkiye'}
                  </p>
                </div>
              </div>
              <span className="hidden rounded-full border border-white/10 px-3 py-1 text-xs text-white/65 sm:inline-flex">
                Dijital Showroom
              </span>
            </div>

            <div className="p-5 md:p-6">
              <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
                    Galeri vitrini
                  </p>
                  <h3 className="mt-3 text-2xl font-black">Araçlarınızı tek linkte sergileyin</h3>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    Müşterileriniz QR koddan güncel araç detayına, WhatsApp iletişimine ve galeri bilgilerinize ulaşır.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/70">
                    <span className="rounded-full border border-white/10 px-3 py-1.5">QR araç sayfası</span>
                    <span className="rounded-full border border-white/10 px-3 py-1.5">Mobil vitrin</span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={DEMO_PUBLIC_VEHICLE.images[0]}
                      alt={DEMO_PUBLIC_VEHICLE.title}
                      fill
                      sizes="360px"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs text-white/55">
                      <Car className="h-3.5 w-3.5" />
                      Örnek araç
                    </div>
                    <p className="mt-2 font-semibold">{DEMO_PUBLIC_VEHICLE.title}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-white/10">
                      <div className="h-full w-3/4 rounded-full" style={{ backgroundColor: accent }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-white/55">
              Bu ön izleme temsili arayüzdür. Kayıt sonrası gerçek araç ve iletişim bilgilerinizle yayınlanır.
            </p>
            <Button asChild className="shrink-0 bg-white text-neutral-950 hover:bg-white/90">
              <Link href={registrationHref}>
                Bu Galeriyle Başla
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
