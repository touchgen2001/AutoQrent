import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { faqItems } from '@/lib/faq-items'

export function FaqSection() {
  return (
    <section id="sss" className="py-20 md:py-24 border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Sık Sorulan Sorular</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Kurulum, QR akışı, tema yönetimi ve günlük operasyonla ilgili en çok sorulan soruların yanıtları.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/85 p-5 sm:p-6">
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={item.question} value={`item-${index + 1}`} className="border-border/70">
                  <AccordionTrigger className="text-sm sm:text-base">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  )
}
