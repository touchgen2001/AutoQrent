import { ArrowRightLeft, BadgeCheck, CalendarCheck, Headset, ReceiptText, ShieldCheck } from "lucide-react"

// Pre-purchase reassurance strip shown right before the final CTA. Every claim
// below is grounded in verifiable product behaviour (lib/faq-items.ts) or real
// platform security (components/landing/trust-section.tsx) — no fabricated
// metrics, ratings, or unverified customer quotes, matching the brand stance.
const guarantees = [
  {
    icon: CalendarCheck,
    title: "14 gün ücretsiz deneme",
    description:
      "Kredi kartı istemeden galeri, araç, QR ve panel akışının tamamını kendi araçlarınızla test edersiniz.",
  },
  {
    icon: ArrowRightLeft,
    title: "Verileriniz taşınır",
    description:
      "Mevcut araç listeniz, görselleriniz ve temel ilan bilgileriniz aktarım planıyla yeni panele taşınabilir.",
  },
  {
    icon: Headset,
    title: "Türkçe destek",
    description:
      "Kurulum, tema düzeni, veri aktarımı ve operasyon iyileştirmesinde destek ekibiyle doğrudan iletişim kurarsınız.",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli altyapı",
    description:
      "Oturum korumalı panel, sunucu taraflı görsel kontrolü ve güvenli QR bağlantı standardıyla verileriniz korunur.",
  },
  {
    icon: BadgeCheck,
    title: "Şeffaf içerik",
    description:
      "Sahte başarı oranı veya doğrulanmamış müşteri yorumu göstermeyiz; performans gerçek panel verisiyle ölçülür.",
  },
  {
    icon: ReceiptText,
    title: "Net fiyatlandırma",
    description:
      "999 TL, 2.500 TL ve 4.990 TL paketler fiyatlar sayfasında açıkça listelenir; kapsamı baştan görürsünüz.",
  },
]

type HomeTrustGuaranteesProps = {
  // Fiyatlar sayfasında fiyatlar zaten yukarıda listelendiği için
  // "Net fiyatlandırma" kartının açıklaması döngüsel olmasın diye bu
  // metin dışarıdan değiştirilebilir. Verilmezse anasayfa metni kullanılır.
  pricingDescription?: string
}

export function HomeTrustGuarantees({ pricingDescription }: HomeTrustGuaranteesProps = {}) {
  const items = pricingDescription
    ? guarantees.map((item) =>
        item.title === "Net fiyatlandırma"
          ? { ...item, description: pricingDescription }
          : item,
      )
    : guarantees

  return (
    <section className="border-t border-border/60 bg-muted/20 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            Güvenle başlayın
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Denemeye başlamak için riskiniz yok
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Aşağıdaki güvenceler her galeri hesabı için geçerlidir. Karar vermeden önce tüm akışı kendi araçlarınızla test edebilirsiniz.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border/70 bg-card p-6 transition-colors hover:border-accent/40"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
