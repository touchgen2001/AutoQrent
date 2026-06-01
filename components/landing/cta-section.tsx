import { SectionCtaActions } from "@/components/landing/section-cta-actions"

export function CtaSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Galerinizi Bugün Dijitale Taşıyın
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Demo görüşmesinde mevcut süreçlerinizi birlikte analiz edelim;
          QR akışı, panel yönetimi ve geçiş planını galerinize özel netleştirelim.
        </p>
        <SectionCtaActions />
      </div>
    </section>
  )
}
