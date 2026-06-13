'use client'

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Dot, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLandingCtaExperiment } from "@/components/landing/use-landing-cta-experiment"
import {
  SUBSCRIPTION_PLANS,
  formatPlanPrice,
  type BillingInterval,
  type SubscriptionPlanCode,
} from "@/lib/subscription-plans"

const plans = [
  {
    key: "starter" as SubscriptionPlanCode,
    plan: SUBSCRIPTION_PLANS.starter,
    focus: "Yeni başlayan galeriler için QR vitrin ve temel panel akışı",
    support: "Standart destek",
    cta: "14 Gün Ücretsiz Başla",
    popular: false,
    highlights: [
      "15 araç limiti",
      "QR kodlu araç vitrini",
      "Temel müşteri talebi toplama",
      "1 kullanıcı hesabı",
    ],
  },
  {
    key: "pro" as SubscriptionPlanCode,
    plan: SUBSCRIPTION_PLANS.pro,
    focus: "Aktif stok ve düzenli müşteri talebi takibi yapan galeriler için",
    support: "Öncelikli destek",
    cta: "14 Gün Ücretsiz Başla",
    popular: true,
    highlights: [
      "75 araç limiti",
      "1 kullanıcı hesabı",
      "Müşteri talebi takibi ve operasyon analitiği",
      "Toplu QR yazdırma",
      "Excel dışa aktarım",
    ],
  },
  {
    key: "premium" as SubscriptionPlanCode,
    plan: SUBSCRIPTION_PLANS.premium,
    focus: "Yüksek stok, marka kontrolü ve gelişmiş raporlama için",
    support: "Telefon ve kapsamlı destek",
    cta: "14 Gün Ücretsiz Başla",
    popular: false,
    highlights: [
      "200 araç limiti",
      "1 kullanıcı hesabı",
      "Marka kaldırma",
      "Gelişmiş analitik",
      "Öncelikli destek",
    ],
  },
  {
    key: "enterprise" as SubscriptionPlanCode,
    plan: SUBSCRIPTION_PLANS.enterprise,
    focus: "Özel limit, API ve geçiş danışmanlığı isteyen galeriler için",
    support: "Özel destek ve kurulum planı",
    cta: "Teklif Al",
    popular: false,
    highlights: [
      "Özel araç limiti",
      "1 kullanıcı hesabı",
      "API ve veri taşıma desteği",
      "Özel kurulum danışmanlığı",
    ],
  },
]

const comparisonRows = [
  {
    title: "QR Kod ve Vitrin Yönetimi",
    values: {
      starter: "Temel",
      pro: "Gelişmiş",
      premium: "Tam kapsam",
      enterprise: "Özel kapsam",
    },
  },
  {
    title: "Müşteri Talebi Takibi",
    values: {
      starter: "Temel akış",
      pro: "Detaylı durum yönetimi",
      premium: "Gelişmiş akış ve ölçek",
      enterprise: "Özel operasyon akışı",
    },
  },
  {
    title: "Hesap Kullanımı",
    values: {
      starter: "1 kullanıcı",
      pro: "1 kullanıcı",
      premium: "1 kullanıcı",
      enterprise: "1 kullanıcı",
    },
  },
  {
    title: "Destek Seviyesi",
    values: {
      starter: "Standart",
      pro: "Öncelikli",
      premium: "Telefon + öncelikli",
      enterprise: "Özel destek",
    },
  },
  {
    title: "Araç Limiti",
    values: {
      starter: "15 araç",
      pro: "75 araç",
      premium: "200 araç",
      enterprise: "Özel limit",
    },
  },
]

export function PricingSection() {
  const { trackClick } = useLandingCtaExperiment("pricing")
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly")

  const getPricingHref = (planKey: SubscriptionPlanCode) => {
    if (planKey === "enterprise") {
      return `/iletisim?konu=kurumsal-teklif&utm_source=pricing&utm_content=${planKey}`
    }

    return `/kayit?plan=${planKey}&billing=${billingInterval}&utm_source=pricing&utm_content=${planKey}`
  }

  const changeBillingInterval = (nextInterval: BillingInterval) => {
    setBillingInterval(nextInterval)
    trackClick(
      "billing_toggle",
      `/fiyatlar?billing=${nextInterval}`,
      nextInterval === "yearly" ? "Yıllık fiyatlandırma" : "Aylık fiyatlandırma",
    )
  }

  return (
    <section id="fiyatlar" className="py-20 md:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Net fiyatlı SaaS paketleri</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Başlangıç, Pro ve Premium paketlerde 14 gün ücretsiz deneme başlar; kredi kartı gerekmez. Yıllık ödemede iki ay avantaj sağlanır.
            </p>
          </div>
          <div
            className="inline-flex w-full rounded-xl border border-border/70 bg-card p-1 md:w-auto"
            aria-label="Faturalama dönemi"
          >
            <button
              type="button"
              onClick={() => changeBillingInterval("monthly")}
              className={cn(
                "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors md:flex-none",
                billingInterval === "monthly"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Aylık
            </button>
            <button
              type="button"
              onClick={() => changeBillingInterval("yearly")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors md:flex-none",
                billingInterval === "yearly"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Yıllık
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">2 ay avantaj</span>
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {plans.map((plan) => {
            const href = getPricingHref(plan.key)
            const selectedPrice = billingInterval === "yearly" ? plan.plan.yearlyPrice : plan.plan.monthlyPrice
            const monthlyEquivalent = plan.plan.yearlyPrice === null ? null : Math.round(plan.plan.yearlyPrice / 12)
            return (
              <article
                key={plan.key}
                className={cn(
                  "rounded-xl border bg-card p-6 transition-all",
                  plan.popular ? "border-accent/60 shadow-sm" : "border-border/70",
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-foreground">{plan.plan.name}</h3>
                  {plan.popular ? (
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                      Önerilen
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{plan.focus}</p>
                <div className="mt-5">
                  <p className="text-3xl font-black tracking-tight text-foreground">{formatPlanPrice(selectedPrice)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.key === "enterprise"
                      ? "Kurumsal teklif"
                      : billingInterval === "yearly"
                        ? `Yıllık toplam • aylık karşılığı ${formatPlanPrice(monthlyEquivalent)}`
                        : "Aylık, 14 gün ücretsiz deneme"}
                  </p>
                  {billingInterval === "yearly" && plan.key !== "enterprise" ? (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent">
                      <Sparkles className="h-3.5 w-3.5" />
                      Aylığa göre 2 ay avantaj
                    </p>
                  ) : null}
                </div>
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
                    onClick={() => trackClick("plan_start", href, `${plan.plan.name} ${plan.cta}`)}
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
                <th className="px-4 py-3 text-left font-semibold text-foreground">Pro</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Premium</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Kurumsal</th>
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
                    <span className="inline-flex items-center gap-1"><Dot className="h-4 w-4 text-accent" />{row.values.premium}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Dot className="h-4 w-4 text-accent" />{row.values.enterprise}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Deneme süresi kayıtla birlikte otomatik başlar. Seçilen plan bilgisi paneldeki abonelik ekranına bağlanır; ödeme sağlayıcısı bağlandığında tahsilat akışı aynı modelle çalışır.
        </p>
      </div>
    </section>
  )
}
