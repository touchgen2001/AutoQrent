"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"

const tourSteps = [
  { until: 3.4, label: "QR kodları oluşturun ve tarama hareketlerini izleyin" },
  { until: 6.8, label: "Müşteri taleplerini kaynak ve durumuyla takip edin" },
  { until: Number.POSITIVE_INFINITY, label: "Yeni aracı birkaç adımda yayına alın" },
]

export function ProductTourVideo() {
  const [currentTime, setCurrentTime] = useState(0)
  const activeStep = tourSteps.find((step) => currentTime < step.until) ?? tourSteps[tourSteps.length - 1]

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-foreground p-2 shadow-2xl">
      <video
        className="aspect-video w-full rounded-[1.25rem] bg-black object-cover"
        controls
        muted
        playsInline
        preload="metadata"
        poster="/product-tour/panel-qr-codes.png"
        aria-label="Cebindegaleri kısa ürün turu"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)}
      >
        <source src="/product-tour/cebindegaleri-product-tour.webm" type="video/webm" />
        Tarayıcınız video oynatmayı desteklemiyor.
      </video>
      <div className="pointer-events-none absolute bottom-14 left-4 right-4 flex justify-center md:justify-start">
        <div className="inline-flex max-w-xl items-center gap-2 rounded-full border border-white/20 bg-black/75 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm sm:text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{activeStep.label}</span>
        </div>
      </div>
    </div>
  )
}
