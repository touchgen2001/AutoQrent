import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Compass, Home, LifeBuoy } from "lucide-react"
import { BrandLogo } from "@/components/brand/brand-logo"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Sayfa Bulunamadı",
  description: "Aradığınız sayfa taşınmış, kaldırılmış ya da hiç var olmamış olabilir.",
  robots: { index: false, follow: false },
}

const suggestedLinks = [
  { title: "Ana Sayfa", description: "Cebindegaleri'nin tüm modüllerine buradan ulaşın.", href: "/" },
  { title: "Fiyatlar", description: "Galeriniz için uygun paketi seçin.", href: "/fiyatlar" },
  { title: "Sık Sorulan Sorular", description: "Kurulum, QR ve panel hakkında hızlı yanıtlar.", href: "/sss" },
  { title: "İletişim", description: "Takıldığınız noktada ekibimize yazın.", href: "/iletisim" },
]

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-2xl text-center">
        <div className="flex justify-center">
          <BrandLogo href="/" mode="full" />
        </div>

        <div className="mt-12 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Compass className="h-8 w-8" />
        </div>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          404 · Sayfa Bulunamadı
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Aradığınız sayfaya ulaşamadık
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Bu sayfa taşınmış, kaldırılmış ya da adresi yanlış yazılmış olabilir. Bir aracın QR kodunu
          okuttuysanız ilan yayından kaldırılmış olabilir. Aşağıdaki bağlantılardan devam edebilirsiniz.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="accent" size="lg">
            <Link href="/">
              <Home className="h-4 w-4" />
              Ana sayfaya dön
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/iletisim">
              <LifeBuoy className="h-4 w-4" />
              Destek ile iletişime geç
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-3 text-left sm:grid-cols-2">
          {suggestedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-accent/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{link.title}</h2>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
