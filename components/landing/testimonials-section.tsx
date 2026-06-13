import Link from 'next/link'
import { CheckCircle2, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'

const feedbackTopics = [
  {
    title: 'Araç başında müşteri deneyimi',
    description: 'Demo sırasında QR okutulduğunda müşteri hangi bilgileri görür, hangi aksiyonları alır birlikte test edilir.',
  },
  {
    title: 'Satış ekibi müşteri talebi takibi',
    description: 'Telefon, WhatsApp ve form taleplerinin panelde nasıl ayrıştığı gerçek akış üzerinden gösterilir.',
  },
  {
    title: 'Galeri marka görünümü',
    description: 'Logo, iletişim, konum ve çalışma saatleri gibi alanların showroom sayfasına nasıl yansıdığı doğrulanır.',
  },
]

export function TestimonialsSection() {
  return (
    <section className="bg-muted/25 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
            <MessageSquareText className="h-3.5 w-3.5" />
            Demo görüşmesinde doğrulanır
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Sahte yorum yerine gerçek akış kontrolü</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Doğrulanmamış müşteri yorumu veya yıldız puanı göstermiyoruz. Demo sırasında galeri operasyonunuz için önemli olan akışlar birlikte test edilir.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {feedbackTopics.map((item) => (
            <article key={item.title} className="relative rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
              <CheckCircle2 className="h-7 w-7 text-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/demo">Canlı demoyu inceleyin</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Demo galeri, araç sayfası ve QR akışını müşteri gözüyle test edin.
          </p>
        </div>
      </div>
    </section>
  )
}
