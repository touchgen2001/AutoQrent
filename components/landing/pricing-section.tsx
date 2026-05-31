import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Başlangıç",
    price: "299",
    period: "ay",
    description: "Küçük galeriler için ideal başlangıç paketi",
    features: [
      "10 araç kaydı",
      "10 QR kod",
      "Temel araç sayfaları",
      "E-posta desteği"
    ],
    cta: "Başla",
    popular: false
  },
  {
    name: "Profesyonel",
    price: "599",
    period: "ay",
    description: "Büyüyen galeriler için tam özellikli paket",
    features: [
      "50 araç kaydı",
      "50 QR kod",
      "Lead takibi",
      "Detaylı analitik",
      "Özel galeri sayfası",
      "Toplu QR yazdırma",
      "3 kullanıcı",
      "Öncelikli destek"
    ],
    cta: "Başla",
    popular: true
  },
  {
    name: "Galeri Plus",
    price: "999",
    period: "ay",
    description: "Büyük galeriler için sınırsız paket",
    features: [
      "Sınırsız araç",
      "Sınırsız QR kod",
      "Tüm Profesyonel özellikleri",
      "10 kullanıcı",
      "API erişimi",
      "Özel entegrasyonlar",
      "Telefon desteği"
    ],
    cta: "Başla",
    popular: false
  }
]

export function PricingSection() {
  return (
    <section id="fiyatlar" className="py-20 md:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Şeffaf Fiyatlandırma
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Gizli ücret yok. İstediğiniz zaman iptal edin.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={cn(
                "relative p-8 bg-card rounded-2xl border transition-all",
                plan.popular 
                  ? "border-accent shadow-lg scale-105" 
                  : "border-border hover:border-accent/30 hover:shadow-md"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-accent-foreground text-sm font-medium rounded-full">
                  En Popüler
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
              </div>
              
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-foreground">₺{plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-accent" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                asChild 
                className={cn(
                  "w-full",
                  plan.popular 
                    ? "bg-accent hover:bg-accent/90 text-accent-foreground" 
                    : ""
                )}
                variant={plan.popular ? "default" : "outline"}
              >
                <Link href="/kayit">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
        
        <p className="text-center text-muted-foreground mt-8">
          Tüm planlar 14 gün ücretsiz deneme içerir. Kredi kartı gerektirmez.
        </p>
      </div>
    </section>
  )
}
