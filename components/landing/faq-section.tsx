import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { faqItems, type FaqCategory } from '@/lib/faq-items'

const categoryOrder: FaqCategory[] = ["Kurulum", "QR Kod", "Panel", "Lead Takibi", "Fiyatlandırma", "Destek"]

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
              <Accordion type="single" collapsible className="mt-3 w-full">
                {group.items.map((item, index) => (
                  <AccordionItem key={item.question} value={`${group.category}-${index}`} className="border-border/70">
                    <AccordionTrigger className="text-sm sm:text-base">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
