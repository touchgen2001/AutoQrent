import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CarFront, MessageCircle, QrCode, ScanLine } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DEMO_PUBLIC_DEALER,
  DEMO_PUBLIC_VEHICLE,
  getDemoQrImageSrc,
  getDemoShowroomHref,
  getDemoVehicleHref,
} from "@/lib/demo-public-experience"

const vehicleImage = DEMO_PUBLIC_VEHICLE.images[0] || "/vehicles/demo-mercedes-amg-gt-1.jpg"

const vehiclePrice = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
}).format(DEMO_PUBLIC_VEHICLE.price)

const flowItems = [
  {
    title: "Aracı ekle",
    description: "Araç bilgilerini ve fotoğraflarını panele ekle.",
    icon: CarFront,
  },
  {
    title: "QR kodu araca yerleştir",
    description: "Oluşan QR kodu indirip araç üzerinde kullan.",
    icon: QrCode,
  },
  {
    title: "Müşteri taleplerini takip et",
    description: "Arama, WhatsApp ve form taleplerini tek yerden yönet.",
    icon: MessageCircle,
  },
]

export function HomeDemoExperience() {
  const showroomHref = getDemoShowroomHref()
  const vehicleHref = getDemoVehicleHref("direct")

  return (
    <section className="border-y border-border/60 bg-foreground py-16 text-background md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
            <ScanLine className="h-3.5 w-3.5" />
            Canlı demo QR deneyimi
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Üç adımda dijital vitrininizi kullanmaya başlayın
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">
            Aracı ekleyin, QR kodunu yerleştirin ve gelen müşteri taleplerini panelden takip edin.
            Hazır demo üzerinden hem galeri sitesini hem araç sayfasını deneyebilirsiniz.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {flowItems.map((item) => (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{item.description}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90">
              <Link href={showroomHref}>
                Demo Galeri Sitesini Aç
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href={vehicleHref}>Demo Araç Sayfasını Gör</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[0.72fr_1fr] lg:items-center">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <div className="rounded-2xl bg-white p-4 text-center shadow-2xl">
              <Image
                src={getDemoQrImageSrc(220)}
                alt="Demo araç sayfasına giden standart QR kod"
                width={220}
                height={220}
                unoptimized
                className="mx-auto h-auto w-full max-w-[220px]"
              />
            </div>
            <p className="mt-4 text-sm font-medium text-white">Standart QR kod</p>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Telefonla okutulduğunda demo araç sayfasına gider.
            </p>
          </div>

          <article className="overflow-hidden rounded-3xl border border-white/10 bg-white text-foreground shadow-2xl">
            <div className="relative aspect-[4/3] bg-muted">
              <Image
                src={vehicleImage}
                alt={`${DEMO_PUBLIC_VEHICLE.title} demo araç görseli`}
                fill
                sizes="(min-width: 1024px) 420px, 100vw"
                className="object-cover"
              />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <Image
                  src={DEMO_PUBLIC_DEALER.logo || "/icon.svg"}
                  alt={`${DEMO_PUBLIC_DEALER.name} logosu`}
                  width={42}
                  height={42}
                  className="rounded-xl border border-border bg-white p-1"
                />
                <div>
                  <p className="text-xs text-muted-foreground">Demo galeri</p>
                  <p className="text-sm font-semibold">{DEMO_PUBLIC_DEALER.name}</p>
                </div>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                <CarFront className="h-3.5 w-3.5" />
                Yayındaki demo araç
              </div>
              <h3 className="mt-3 text-xl font-bold tracking-tight">{DEMO_PUBLIC_VEHICLE.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {DEMO_PUBLIC_VEHICLE.mileage.toLocaleString("tr-TR")} km · {DEMO_PUBLIC_VEHICLE.transmission} · {DEMO_PUBLIC_VEHICLE.fuelType}
              </p>
              <p className="mt-4 text-3xl font-black text-accent">{vehiclePrice}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
