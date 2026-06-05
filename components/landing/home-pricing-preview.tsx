import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SUBSCRIPTION_PLANS, formatPlanPrice, type SubscriptionPlanCode } from "@/lib/subscription-plans"
import { cn } from "@/lib/utils"

const previewPlans: Array<{
  code: SubscriptionPlanCode
  note: string
  href: string
  featured?: boolean
}> = [
  {
    code: "starter",
    note: "QR vitrine yeni başlayan galeriler için",
    href: "/kayit?plan=starter&utm_source=home_pricing&utm_content=starter",
  },
  {
    code: "pro",
    note: "Aktif stok ve düzenli müşteri talebi takibi için",
    href: "/kayit?plan=pro&utm_source=home_pricing&utm_content=pro",
    featured: true,
  },
  {
    code: "premium",
    note: "Yüksek stok, marka kontrolü ve gelişmiş raporlar için",
    href: "/kayit?plan=premium&utm_source=home_pricing&utm_content=premium",
  },
]

export function HomePricingPreview() {
  return (
    <section className="bg-muted/25 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Net paket özeti</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              14 gün ücretsiz deneyin, sonra ihtiyaca göre paket seçin
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Anasayfada sadece karar için gerekli özet yer alır. Detaylı kapsam ve karşılaştırma fiyatlar sayfasında bulunur.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full md:w-auto">
            <Link href="/fiyatlar">
              Tüm Paketleri Karşılaştır
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {previewPlans.map((preview) => {
            const plan = SUBSCRIPTION_PLANS[preview.code]
            return (
              <article
                key={plan.code}
                className={cn(
                  "rounded-2xl border bg-card p-6 transition-all",
                  preview.featured ? "border-accent/50 shadow-sm" : "border-border/70",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{preview.note}</p>
                  </div>
                  {preview.featured ? (
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                      Önerilen
                    </span>
                  ) : null}
                </div>

                <div className="mt-6">
                  <p className="text-3xl font-black tracking-tight text-foreground">
                    {formatPlanPrice(plan.monthlyPrice)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Aylık, 14 gün ücretsiz deneme</p>
                </div>

                <ul className="mt-5 space-y-2">
                  {plan.highlights.slice(0, 3).map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link href={preview.href}>14 Gün Ücretsiz Başla</Link>
                </Button>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
