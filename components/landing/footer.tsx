import Link from "next/link"
import { ArrowRight, Mail, Phone, QrCode } from "lucide-react"

const footerLinks = {
  product: [
    { name: "Özellikler", href: "/ozellikler" },
    { name: "Nasıl Çalışır", href: "/nasil-calisir" },
    { name: "Fiyatlandırma", href: "/fiyatlar" },
    { name: "SSS", href: "/sss" },
    { name: "Canlı Demo", href: "/demo" },
  ],
  company: [
    { name: "Hakkımızda", href: "/hakkimizda" },
    { name: "Kariyer", href: "/kariyer" },
    { name: "Blog", href: "/blog" },
    { name: "İletişim", href: "/iletisim" },
  ],
  legal: [
    { name: "Gizlilik Politikası", href: "/gizlilik" },
    { name: "Kullanım Koşulları", href: "/kullanim-kosullari" },
    { name: "KVKK", href: "/kvkk" },
    { name: "Çerez Politikası", href: "/cerez-politikasi" },
  ],
}

const currentYear = new Date().getFullYear()

export function LandingFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="mb-10 overflow-hidden rounded-2xl border border-primary-foreground/15 bg-gradient-to-r from-primary-foreground/8 via-primary-foreground/4 to-primary-foreground/8 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/12 px-3 py-1 text-xs font-medium text-primary-foreground/90">
                <QrCode className="h-3.5 w-3.5" />
                Cebindegaleri Footer Banner
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">Markanızı dijital vitrine taşıyın</h3>
              <p className="mt-2 text-sm text-primary-foreground/75">
                Logo görünürlüğü güçlü, mobilde hızlı ve satışa odaklı bir galeri sitesi için hemen başlayın.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/kayit"
                className="inline-flex items-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
              >
                Ücretsiz Başla
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center rounded-lg border border-primary-foreground/20 px-4 py-2.5 text-sm font-medium text-primary-foreground/90 transition-colors hover:bg-primary-foreground/10"
              >
                Demoyu İncele
              </Link>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-8 md:gap-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">Cebindegaleri</span>
            </Link>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Araç galerileri için QR kodlu dijital showroom, stok yönetimi, lead takibi ve satış analitiği.
            </p>

            <div className="mt-5 space-y-2 text-sm text-primary-foreground/80">
              <a href="tel:+905309738240" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
                <Phone className="h-4 w-4" />
                0530 973 82 40
              </a>
              <a href="mailto:destek@cebindegaleri.com" className="flex items-center gap-2 hover:text-primary-foreground transition-colors">
                <Mail className="h-4 w-4" />
                destek@cebindegaleri.com
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Ürün</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Şirket</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Yasal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-primary-foreground/60 text-sm">© {currentYear} Cebindegaleri. Tüm hakları saklıdır.</p>
          <p className="text-primary-foreground/60 text-sm text-center sm:text-right">
            Türkiye genelindeki galeriler için dijital vitrin altyapısı
          </p>
        </div>
      </div>
    </footer>
  )
}
