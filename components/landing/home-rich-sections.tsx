import { CheckCircle2, Headset, PhoneCall, QrCode, ScanLine, Settings2, ShieldCheck, Workflow } from "lucide-react"

const problemSolutionItems = [
  {
    title: "Dağınık müşteri akışı",
    problem: "QR tarama, WhatsApp ve telefon temasları farklı kanallarda kalınca ekip aynı müşteriyi farklı kişilerle takip ediyor.",
    solution: "Cebindegaleri, araç sayfası temaslarını lead kaydıyla aynı operasyon paneline toplar.",
  },
  {
    title: "Güncel olmayan vitrin bilgisi",
    problem: "Araç bilgisi, fiyat ve görsel güncellemeleri geciktiğinde müşteri güveni düşüyor.",
    solution: "Tek panelden araç kartı, iletişim butonları ve QR yönlendirmesi birlikte güncellenir.",
  },
]

const qrJourney = [
  {
    title: "Araç başında ilk temas",
    customer: "Müşteri QR kodu okutur ve mobil araç sayfasını açar.",
    team: "Ekip panelde hangi aracın görüntülendiğini ve temas kaynağını görür.",
    icon: QrCode,
  },
  {
    title: "Detay ve iletişim",
    customer: "Müşteri araç detayını inceler, tek dokunuşla arama veya WhatsApp başlatır.",
    team: "Lead kaydı ilgili araçla eşleşir, not ve takip tarihi eklenir.",
    icon: ScanLine,
  },
  {
    title: "Satış takibi",
    customer: "Müşteri test sürüşü ve satın alma adımlarına net şekilde ilerler.",
    team: "Durum adımları panelde güncellenir, dönüşüm hunisi operasyonel olarak izlenir.",
    icon: Workflow,
  },
]

const operations = [
  {
    title: "Araç Vitrini Yönetimi",
    detail: "Model, fiyat, açıklama ve medya içeriklerini tek noktadan yönetin.",
    icon: Settings2,
  },
  {
    title: "Lead Süreci Disiplini",
    detail: "Yeni lead, arandı, görüşülüyor ve satışa döndü adımlarını standardize edin.",
    icon: PhoneCall,
  },
  {
    title: "Destek ve Geçiş",
    detail: "Onboarding, tema uyarlama ve operasyon kurgusunda doğrudan destek alın.",
    icon: Headset,
  },
]

const trustItems = [
  "Sahte başarı oranı veya uydurma performans yüzdesi kullanılmaz.",
  "Galeri operasyonu, panel verisiyle ölçülür ve ekip tarafından doğrulanabilir.",
  "Süreçler demo görüşmesinde gerçek işleyişinize göre netleştirilir.",
]

export function HomeRichSections() {
  return (
    <>
      <section className="border-y border-border/60 bg-muted/20 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Problemden operasyona, satış odaklı net çözüm
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Galerilerin günlük satış sürecinde en çok zaman kaybettiren alanları sadeleştirir; müşteri temasını hızlı, ekip yönetimini düzenli hale getirir.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {problemSolutionItems.map((item) => (
              <article key={item.title} className="rounded-xl border border-border/70 bg-card p-6">
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Sorun:</span> {item.problem}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Çözüm:</span> {item.solution}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">QR müşteri akışı nasıl işler?</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Müşteri deneyimi ile ekip operasyonu aynı akışta birleşir; temasın nerede başladığı ve satışın nasıl ilerlediği kaybolmaz.
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {qrJourney.map((step) => (
              <article key={step.title} className="rounded-xl border border-border/70 bg-card p-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Müşteri:</span> {step.customer}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Panel Ekibi:</span> {step.team}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/20 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Panelden yönetilen operasyon</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Araç vitrini, lead takibi ve müşteri iletişimi dağınık kalmadan aynı operasyon çerçevesinde yürütülür.
              </p>
              <div className="mt-6 space-y-3">
                {operations.map((item) => (
                  <div key={item.title} className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                <ShieldCheck className="h-3.5 w-3.5" />
                Güven ve Destek
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Doğrulanabilir içerik, sürdürülebilir destek</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Web tarafında yalnızca gerçek işleyişi temsil eden içerikler kullanılır. Operasyon ve geçiş adımları satış görüşmesinde canlı akışla birlikte planlanır.
              </p>
              <ul className="mt-5 space-y-2">
                {trustItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
