import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CarFront, CirclePlay, QrCode, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProductTourVideo } from "@/components/landing/product-tour-video"

const productScreens = [
  {
    title: "QR kod yönetimi",
    description: "Araç bazlı QR kodları, tarama sayılarını ve son hareketleri tek ekranda görün.",
    image: "/product-tour/panel-qr-codes.png",
    alt: "Cebindegaleri panelindeki gerçek QR kod yönetimi ekranı",
    icon: QrCode,
  },
  {
    title: "Müşteri talebi takibi",
    description: "QR, WhatsApp ve showroom üzerinden gelen talepleri durumlarıyla birlikte yönetin.",
    image: "/product-tour/panel-customer-requests.png",
    alt: "Cebindegaleri panelindeki gerçek müşteri talepleri ekranı",
    icon: Users,
  },
  {
    title: "Kolay araç ekleme",
    description: "Araç bilgilerini, fotoğrafları ve ekspertiz detaylarını adım adım yayınlayın.",
    image: "/product-tour/panel-vehicle-create.png",
    alt: "Cebindegaleri panelindeki gerçek yeni araç ekleme ekranı",
    icon: CarFront,
  },
]

export function ProductProofSection() {
  return (
    <section className="border-y border-border/60 bg-muted/20 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <CirclePlay className="h-3.5 w-3.5" />
              Gerçek ürün turu
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Karar vermeden önce paneli görün
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Aşağıdaki görüntüler Cebindegaleri panelinin gerçek ekranlarıdır. Demo verileri kullanıldığı için kişisel müşteri bilgisi içermez.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/demo">
                Canlı Demoyu İncele
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <ProductTourVideo />
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {productScreens.map((screen) => (
            <article key={screen.title} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <div className="relative aspect-[16/10] overflow-hidden border-b border-border/70 bg-muted">
                <Image
                  src={screen.image}
                  alt={screen.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="object-cover object-top transition-transform duration-500 hover:scale-[1.02]"
                />
              </div>
              <div className="p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <screen.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{screen.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{screen.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
