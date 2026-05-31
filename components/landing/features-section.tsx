import { QrCode, Smartphone, BarChart3, MessageCircle, Shield, Zap } from "lucide-react"

const features = [
  {
    icon: QrCode,
    title: "QR Kod Sistemi",
    description: "Her araç için benzersiz QR kod oluşturun. Müşteriler kodu tarayarak detaylı araç bilgilerine anında ulaşsın."
  },
  {
    icon: Smartphone,
    title: "Mobil Uyumlu Sayfalar",
    description: "Araç sayfaları tamamen mobil uyumlu. WhatsApp, arama ve konum butonları tek tıkla erişilebilir."
  },
  {
    icon: BarChart3,
    title: "Detaylı Analitik",
    description: "Hangi araçların ilgi gördüğünü, tarama sayılarını ve müşteri davranışlarını takip edin."
  },
  {
    icon: MessageCircle,
    title: "Lead Takibi",
    description: "WhatsApp, telefon ve form üzerinden gelen tüm müşteri ilgilerini tek panelden yönetin."
  },
  {
    icon: Shield,
    title: "Güvenli Altyapı",
    description: "Verileriniz güvende. SSL şifrelemesi ve düzenli yedekleme ile koruma altında."
  },
  {
    icon: Zap,
    title: "Hızlı Kurulum",
    description: "5 dakikada galerinizi oluşturun. Teknik bilgi gerektirmez, hemen kullanmaya başlayın."
  }
]

export function FeaturesSection() {
  return (
    <section id="ozellikler" className="py-20 md:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Galerinizi Dijitale Taşıyın
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Modern galeri yönetimi için ihtiyacınız olan tüm araçlar tek platformda
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-6 bg-card rounded-2xl border border-border hover:border-accent/30 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
