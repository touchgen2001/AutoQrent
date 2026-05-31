import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Calendar, Clock3, Newspaper } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { blogPosts } from '@/lib/blog-posts'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Blog',
  description:
    'Araç galerileri için satış, lead yönetimi, QR dönüşümü ve dijital vitrin operasyonlarına yönelik pratik içerikler.',
  path: '/blog',
  keywords: ['galeri blog', 'oto galeri ipuçları', 'lead yönetimi rehberi'],
})

export default function BlogPage() {
  return (
    <MarketingPageLayout>
      <MarketingPageHero
        badge="Blog"
        title="Galeri Operasyonları İçin Uygulanabilir İçerikler"
        description="Satış ekibinizin günlük operasyonuna doğrudan katkı sağlayacak pratik rehberler, büyüme ipuçları ve dijital vitrin stratejileri burada."
      />

      <MarketingPageSection>
        <div className="grid gap-6 md:grid-cols-2">
          {blogPosts.map((post) => (
            <Card key={post.title} className="border-border/70 bg-card/80 transition-colors hover:border-accent/40">
              <CardHeader className="space-y-3">
                <div className="inline-flex w-fit items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  {post.category}
                </div>
                <CardTitle className="text-xl leading-snug">{post.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {post.date}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {post.readingTime} okuma
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="inline-flex items-center text-sm font-medium text-accent hover:text-accent/80">
                  Yazıyı Oku
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-10 border-border/70 bg-card/80">
          <CardContent className="flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-medium text-accent">
                <Newspaper className="h-4 w-4" />
                Haftalık içerik planı
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">Galeriye özel içerik önerisi alın</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                İş modelinize uygun satış ve CRM içerik planı için ekibimizle iletişime geçin. Size özel konu başlıkları ve uygulama adımları paylaşalım.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/iletisim">İçerik Planı Talep Et</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/demo">Canlı Demoyu Gör</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
