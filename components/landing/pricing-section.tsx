'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, Dot } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLandingCtaExperiment } from "@/components/landing/use-landing-cta-experiment"

const plans = [
  {
    key: "starter",
    name: "Başlangıç",
    focus: "Temel dijital vitrin akışı",
    support: "Standart destek",
    cta: "Teklif Al",
    popular: false,
    highlights: [
      "QR kodlu araç vitrini",
      "Temel araç ve galeri yönetimi",
      "İlk kurulum yönlendirmesi",
    ],
  },
  {
    key: "pro",
    name: "Profesyonel",
    focus: "Aktif operasyon ve ekip yönetimi",
    support: "Öncelikli destek",
    cta: "Demo Planla",
    popular: true,
    highlights: [
      "Lead takibi ve operasyon analitiği",
      "Toplu QR yazdırma",
      "Çoklu ekip kullanımı",
    ],
  },
  {
    key: "plus",
    name: "Galeri Plus",
    focus: "Kurumsal ve geniş kapsam",
    support: "Telefon ve kapsamlı destek",
    cta: "Teklif Al",
    popular: false,
    highlights: [
      "Gelişmiş yetkilendirme",
      "API ve entegrasyon desteği",
      "Özel operasyon kurgusu",
    ],
  },
]

const comparisonRows = [
  {
    title: "QR Kod ve Vitrin Yönetimi",
    values: {
      starter: "Temel",
      pro: "Gelişmiş",
      plus: "Tam kapsam",
    },
  },
  {
    title: "Lead Takibi",
    values: {
      starter: "Temel akış",
      pro: "Detaylı durum yönetimi",
      plus: "Gelişmiş akış ve ölçek",
    },
  },
  {
    title: "Ekip Kullanımı",
    values: {
      starter: "Sınırlı",
      pro: "Çoklu ekip desteği",
      plus: "Kurumsal ekip yapısı",
    },
  },
  {
    title: "Destek Seviyesi",
    values: {
      starter: "Standart",
      pro: "Öncelikli",
      plus: "Telefon + öncelikli",
    },
  },
]

export function PricingSection() {
  const { variant, trackClick } = useLandingCtaExperiment("pricing")

  const getPricingHref = (planKey: string, cta: string) => {
    if (cta === "Demo Planla") {
      return variant === "B"
        ? `/demo?utm_campaign=landing_cta_pricing_b&utm_source=pricing&utm_content=${planKey}`
        : `/demo?utm_source=pricing&utm_content=${planKey}`
    }

    return variant === "B"
      ? `/iletisim?konu=teklif&utm_campaign=landing_cta_pricing_b&utm_source=pricing&utm_content=${planKey}`
      : `/iletisim?konu=teklif&utm_source=pricing&utm_content=${planKey}`
  }

  return (
    <section id="fiyatlar" className="py-20 md:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Kapsam odaklı plan yapısı</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Sabit fiyat etiketi yerine galeri ölçeği, ekip yapısı ve operasyon ihtiyacına göre netleşen bir teklif modeli uygulanır.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const href = getPricingHref(plan.key, plan.cta)
            return (
              <article
                key={plan.key}
                className={cn(
                  "rounded-xl border bg-card p-6 transition-all",
                  plan.popular ? "border-accent/60 shadow-sm" : "border-border/70",
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                  {plan.popular ? (
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                      Önerilen
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{plan.focus}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Destek:</span> {plan.support}
                </p>

                <ul className="mt-4 space-y-2">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild className="mt-6 w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link
                    href={href}
                    onClick={() => trackClick("plan_start", href, `${plan.name} ${plan.cta}`)}
                  >
                    {plan.cta}
                  </Link>
                </Button>
              </article>
            )
          })}
        </div>

        <div className="mt-8 overflow-x-auto rounded-xl border border-border/70 bg-card">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Karşılaştırma</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Başlangıç</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Profesyonel</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Galeri Plus</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.title} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-3 text-foreground">{row.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Dot className="h-4 w-4 text-accent" />{row.values.starter}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Dot className="h-4 w-4 text-accent" />{row.values.pro}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Dot className="h-4 w-4 text-accent" />{row.values.plus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Plan kapsamı ve teklif koşulları, demo görüşmesinde mevcut galeri operasyonuna göre netleştirilir.
        </p>
      </div>
    </section>
  )
}
