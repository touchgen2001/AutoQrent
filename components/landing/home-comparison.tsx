import Link from "next/link"
import { ArrowRight, Check, Minus, TableProperties } from "lucide-react"

import { Button } from "@/components/ui/button"

const comparisonRows = [
  {
    topic: "Araç bilgisi güncelleme",
    manual: "İlan, mesaj ve notlar ayrı ayrı güncellenir",
    platform: "Araç bilgisi tek panelden güncellenir",
  },
  {
    topic: "QR kod yönetimi",
    manual: "QR bağlantıları ayrı hazırlanır ve takip edilmez",
    platform: "Araç bazlı QR kod ve tarama hareketleri birlikte yönetilir",
  },
  {
    topic: "Müşteri talebi takibi",
    manual: "WhatsApp geçmişi ve kişisel notlara bağlı kalır",
    platform: "Talep durumu, kaynak, not ve takip tarihi kayıt altındadır",
  },
  {
    topic: "Dijital galeri vitrini",
    manual: "Ayrı site kurulumu ve teknik güncelleme gerekir",
    platform: "Galeri ve araç sayfaları paneldeki stokla birlikte yayınlanır",
  },
  {
    topic: "Operasyon görünürlüğü",
    manual: "Hangi aracın ilgi gördüğünü ölçmek zordur",
    platform: "QR taraması, müşteri talebi ve araç ilgisi panelde görünür",
  },
]

export function HomeComparison() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <TableProperties className="h-3.5 w-3.5" />
            Operasyon karşılaştırması
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Excel ve WhatsApp ile yönetim yerine tek panel
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Cebindegaleri mevcut iletişim kanallarınızı kaldırmaz; araç, QR ve müşteri takibini düzenli ve ölçülebilir hale getirir.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="hidden grid-cols-[1fr_1.15fr_1.15fr] border-b border-border/70 bg-muted/40 md:grid">
            <div className="p-5 text-sm font-semibold text-foreground">Operasyon alanı</div>
            <div className="border-l border-border/70 p-5 text-sm font-semibold text-muted-foreground">
              Excel + WhatsApp ile manuel yönetim
            </div>
            <div className="border-l border-border/70 bg-accent/5 p-5 text-sm font-semibold text-accent">
              Cebindegaleri ile yönetim
            </div>
          </div>

          {comparisonRows.map((row) => (
            <div key={row.topic} className="grid gap-3 border-b border-border/60 p-5 last:border-b-0 md:grid-cols-[1fr_1.15fr_1.15fr] md:gap-0 md:p-0">
              <div className="font-semibold text-foreground md:p-5">{row.topic}</div>
              <div className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground md:border-l md:border-border/70 md:p-5">
                <Minus className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{row.manual}</span>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-accent/5 p-3 text-sm leading-relaxed text-foreground md:rounded-none md:border-l md:border-border/70 md:p-5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{row.platform}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button asChild>
            <Link href="/demo">
              Canlı Akışı Karşılaştır
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
