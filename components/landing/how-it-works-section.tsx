import { CheckCircle2, QrCode, ScanLine, Settings2, Smartphone, Target, Users } from "lucide-react"

const steps = [
  {
    step: "01",
    title: "Galeri kurulumu",
    detail: "Galeri adı, iletişim kanalları ve temel vitrin ayarları panelde tamamlanır.",
    icon: Settings2,
  },
  {
    step: "02",
    title: "Araç kartı hazırlığı",
    detail: "Araç bilgisi ve medya içeriği eklenir; vitrin sayfası satış görüşmesine hazır hale getirilir.",
    icon: Users,
  },
  {
    step: "03",
    title: "QR üretimi ve saha yerleşimi",
    detail: "Araç bazlı QR kodlar üretilir, vitrin ve araç camına uygun şablonlarla yazdırılır.",
    icon: QrCode,
  },
  {
    step: "04",
    title: "Müşteri etkileşimi",
    detail: "Müşteri QR okutur, mobil araç sayfasına geçer ve doğrudan iletişim aksiyonu başlatır.",
    icon: Smartphone,
  },
  {
    step: "05",
    title: "Lead takibi",
    detail: "Temas kaynağı, notlar ve takip adımları tek lead akışında güncellenir.",
    icon: ScanLine,
  },
  {
    step: "06",
    title: "Satış sonrası yönetim",
    detail: "Durum kapanışı, ekip değerlendirmesi ve bir sonraki aksiyonlar operasyon panelinde düzenlenir.",
    icon: Target,
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
    title: "Panelde ekip ne yapar?",
    points: [
      "Araç kartlarını ve QR yönlendirmesini günceller",
      "Lead durumlarını, notları ve takip tarihlerini yönetir",
      "Operasyon verisini ekranlardan izleyip aksiyon alır",
    ],
  },
]

export function HowItWorksSection() {
  return (
    <section id="nasil-calisir" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Operasyon akışı adım adım</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Kurulumdan satış sonrası takibe kadar süreç iki tarafta netleşir: araç başındaki müşteri deneyimi ve paneldeki ekip yönetimi.
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
