import { faqItems, type FaqCategory } from '@/lib/faq-items'

const categoryOrder: FaqCategory[] = ["Kurulum", "QR Kod", "Panel", "Müşteri Talepleri", "Fiyatlandırma", "Destek"]

const groupedFaqs = categoryOrder.map((category) => ({
  category,
  items: faqItems.filter((item) => item.category === category),
}))

export function FaqSection() {
  return (
    <section id="sss" className="py-20 md:py-24 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Kategori bazlı sık sorulan sorular</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Kurulumdan fiyatlandırmaya kadar karar sürecinde kritik olan başlıkları kısa ve doğrudan yanıtlarla topladık.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {groupedFaqs.map((group) => (
            <article key={group.category} className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-foreground">{group.category}</h3>
              <div className="mt-4 space-y-4">
                {group.items.map((item) => (
                  <div key={item.question} className="rounded-lg border border-border/60 bg-background/60 p-4">
                    <h4 className="text-sm font-semibold leading-6 text-foreground sm:text-base">{item.question}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
