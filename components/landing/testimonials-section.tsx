import { Quote, Star } from 'lucide-react'

const testimonials = [
  {
    quote:
      'QR kodlu vitrinle müşteriler araç başında tüm detayı görüyor. Satış danışmanlarımızın ilk görüşme süresi kısaldı, dönüşüm oranı yükseldi.',
    author: 'Emre K.',
    role: 'Satış Müdürü',
    company: 'Prestij Otomotiv',
  },
  {
    quote:
      'Araçları tek panelden güncellemek ve lead akışını takip etmek ekip içi dağınıklığı bitirdi. Özellikle WhatsApp taleplerini kaçırmıyoruz.',
    author: 'Seda T.',
    role: 'İşletme Sahibi',
    company: 'Anadolu Motor',
  },
  {
    quote:
      'Müşteri bize gelmeden önce ilan detayını inceleyip hazır geliyor. Test sürüşü planlamamız daha verimli hale geldi.',
    author: 'Murat A.',
    role: 'Genel Koordinatör',
    company: 'Ege Car Plaza',
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-24 bg-muted/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Galerilerin doğrudan saha geri bildirimleri</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Platformu aktif kullanan ekiplerden gelen yorumlar; hız, güven ve satış verimliliğinde en çok nerede fark oluşturduğumuzu gösteriyor.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.author + item.company} className="relative rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
              <Quote className="h-7 w-7 text-accent/80" />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">“{item.quote}”</p>

              <div className="mt-5 flex items-center gap-1 text-accent">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>

              <div className="mt-4 border-t border-border/70 pt-4">
                <p className="text-sm font-semibold text-foreground">{item.author}</p>
                <p className="text-xs text-muted-foreground">{item.role} · {item.company}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
