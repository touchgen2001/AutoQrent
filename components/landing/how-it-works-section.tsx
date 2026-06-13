import { CarFront, CheckCircle2, MessageCircle, QrCode } from "lucide-react"

const steps = [
  {
    step: "01",
    title: "Aracı ekle",
    detail: "Araç bilgilerini, fiyatını ve fotoğraflarını panele ekleyin. Araç sayfası otomatik hazırlansın.",
    icon: CarFront,
  },
  {
    step: "02",
    title: "QR kodu araca yerleştir",
    detail: "Araç için oluşan QR kodu indirin, yazdırın ve müşterinin kolayca görebileceği yere yerleştirin.",
    icon: QrCode,
  },
  {
    step: "03",
    title: "Müşteri taleplerini takip et",
    detail: "Arama, WhatsApp ve form taleplerini ilgili araçla birlikte görün; notları ve sonraki adımı kaydedin.",
    icon: MessageCircle,
  },
]

const perspective = [
  {
    title: "Araç başında müşteri ne görür?",
    points: [
      "Mobil uyumlu araç vitrini ve temel araç detayları",
      "Tek dokunuşla arama ve WhatsApp aksiyonları",
      "Galeri iletişim ve çalışma bilgileri",
    ],
  },
  {
    title: "Panelde ne yönetilir?",
    points: [
      "Araç kartlarını ve QR yönlendirmesini günceller",
      "Müşteri taleplerini, notları ve takip tarihlerini yönetir",
      "Satış sürecini ekranlardan izleyip sonraki adımı planlar",
    ],
  },
]

export function HowItWorksSection() {
  return (
    <section id="nasil-calisir" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Üç adımda kullanmaya başlayın</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Aracı ekleyin, QR kodunu yerleştirin ve gelen müşteri taleplerini tek panelden takip edin.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <article key={step.step} className="rounded-xl border border-border/70 bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">{step.step}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {perspective.map((item) => (
            <article key={item.title} className="rounded-xl border border-border/70 bg-muted/30 p-6">
              <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
              <ul className="mt-4 space-y-2">
                {item.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
