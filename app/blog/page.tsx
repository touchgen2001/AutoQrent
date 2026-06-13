import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Calendar, Clock3, Newspaper, ShieldCheck, Tag } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { blogPosts } from '@/lib/blog-posts'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Blog, Otomobil Haberleri ve Galeri Büyüme Rehberleri',
  description:
    'Araç galerileri için otomobil haberleri, elektrikli araç pazarı, güvenlik, satış, lead yönetimi, QR dönüşümü ve dijital vitrin rehberleri.',
  path: '/blog',
  keywords: ['otomobil haberleri', 'galeri blog', 'oto galeri ipuclari', 'lead yonetimi rehberi', 'qr donusum rehberi'],
})

export default function BlogPage() {
  const [featuredPost, ...regularPosts] = blogPosts
  const categorySummaries = Array.from(
    blogPosts.reduce((map, post) => {
      map.set(post.category, (map.get(post.category) || 0) + 1)
      return map
    }, new Map<string, number>()),
  )

  return (
    <MarketingPageLayout>
      <MarketingPageHero
        badge="Blog"
        title="Otomobil Haberleri ve Galeri Büyüme Rehberleri"
        description="Araç pazarı, elektrikli otomobil gündemi, güvenlik gelişmeleri ve galeri satış operasyonuna doğrudan katkı sağlayacak pratik içerikler burada."
      />

      <MarketingPageSection>
        <Card className="overflow-hidden border-border/70 bg-card/80">
          <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5 p-6 md:p-8">
              <div className="inline-flex w-fit items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                Öne çıkan haber
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">{featuredPost.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">{featuredPost.excerpt}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {featuredPost.date}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {featuredPost.readingTime} okuma
                </span>
                {featuredPost.sourceLinks?.length ? (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Kaynaklı içerik
                  </span>
                ) : null}
              </div>
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href={`/blog/${featuredPost.slug}`}>
                  Haberi Oku
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="border-t border-border bg-neutral-950 p-6 text-white lg:border-l lg:border-t-0 md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/50">İçerik başlıkları</p>
              <div className="mt-5 grid gap-3">
                {categorySummaries.map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <Tag className="h-4 w-4" />
                      {category}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-black">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {regularPosts.map((post) => (
            <Card key={post.title} className="border-border/70 bg-card/80 transition-colors hover:border-accent/40">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex w-fit items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                    {post.category}
                  </span>
                  {post.sourceLinks?.length ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3 w-3" />
                      Kaynaklı
                    </span>
                  ) : null}
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
