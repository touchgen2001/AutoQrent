import { SectionCtaActions } from "@/components/landing/section-cta-actions"

export function CtaSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-card px-6 py-14 text-center shadow-sm md:px-12"
          style={{
            backgroundImage:
              "radial-gradient(70% 90% at 50% -10%, rgba(217,167,79,0.16), transparent 60%), radial-gradient(60% 80% at 105% 110%, rgba(99,102,241,0.12), transparent 55%)",
          }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Galerinizi Bugün{" "}
            <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 bg-clip-text text-transparent">Dijitale Taşıyın</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            14 günlük ücretsiz deneme ile galeri hesabınız, paneliniz ve QR vitrin altyapınız hazır başlar.
            Demo isterseniz ikinci adımda birlikte akışı inceleyebiliriz.
          </p>
          <SectionCtaActions />
        </div>
      </div>
    </section>
  )
}
