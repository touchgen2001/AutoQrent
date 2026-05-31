import { QrCode, Smartphone, Users, TrendingUp } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: QrCode,
    title: "Araç Ekleyin",
    description: "Araç bilgilerini ve fotoğraflarını yükleyin. Sistem otomatik olarak benzersiz bir QR kod oluşturur."
  },
  {
    number: "02",
    icon: Smartphone,
    title: "QR Kodu Yazdırın",
    description: "Oluşturulan QR kodları araç camına veya vitrinine yapıştırmak için yazdırın."
  },
  {
    number: "03",
    icon: Users,
    title: "Müşteri Gelsin",
    description: "Müşteriler QR kodu tarayarak araç detaylarına, fiyatına ve iletişim bilgilerine ulaşır."
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Satışa Dönüştürün",
    description: "Gelen leadleri takip edin, notlar ekleyin ve satış sürecini yönetin."
  }
]

export function HowItWorksSection() {
  return (
    <section id="nasil-calisir" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Nasıl Çalışır?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            4 basit adımda dijital vitrin oluşturun
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
              )}
              
              <div className="relative text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 bg-card rounded-2xl border border-border flex items-center justify-center mx-auto shadow-sm">
                    <step.icon className="w-10 h-10 text-accent" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground text-sm font-bold">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
