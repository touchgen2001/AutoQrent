import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Calendar, Clock3, ExternalLink, ShieldCheck } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { blogPosts, getBlogPostBySlug, getRelatedPosts } from '@/lib/blog-posts'
import { absoluteUrl } from '@/lib/seo'
import { createPageMetadata } from '@/lib/seo'

type BlogPostPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    return createPageMetadata({
      title: 'Yazı Bulunamadı',
      description: 'İstenen blog yazısı bulunamadı.',
      path: `/blog/${slug}`,
      noIndex: true,
    })
  }

  return createPageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    keywords: ['blog', post.category.toLowerCase(), ...post.keywords],
    openGraphType: 'article',
  })
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = getRelatedPosts(post.slug, 3)
  const blogPostingJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    articleSection: post.category,
    inLanguage: 'tr-TR',
    author: {
      '@type': 'Organization',
      name: 'Cebindegaleri',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Cebindegaleri',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/icon.svg'),
      },
    },
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    keywords: post.keywords.join(', '),
    citation: post.sourceLinks?.map((source) => source.href),
  }).replace(/</g, '\\u003c')

  return (
    <MarketingPageLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: blogPostingJsonLd }} />
      <MarketingPageHero badge={post.category} title={post.title} description={post.excerpt} />

      <MarketingPageSection className="max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {post.date}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-4 w-4" />
            {post.readingTime} okuma
          </span>
        </div>

        <Card className="border-border/70 bg-card/80">
          <CardContent className="space-y-5 py-8">
            {post.content.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {paragraph}
              </p>
            ))}
          </CardContent>
        </Card>

        {post.sourceLinks?.length ? (
          <Card className="mt-6 border-border/70 bg-card/80">
            <CardContent className="py-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <ShieldCheck className="h-5 w-5 text-accent" />
                Doğrulama Kaynakları
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Haber ve regülasyon içeriklerinde yalnızca doğrulanabilir kurumsal kaynaklar kullanılır.
              </p>
              <div className="mt-4 grid gap-2">
                {post.sourceLinks.map((source) => (
                  <Link
                    key={source.href}
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    {source.label}
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="mt-6 border-border/70 bg-card/80">
          <CardContent className="py-6">
            <h2 className="text-lg font-semibold text-foreground">Yazı İçindeki Hızlı Adımlar</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {post.internalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/50 hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {relatedPosts.length > 0 && (
          <Card className="mt-6 border-border/70 bg-card/80">
            <CardContent className="py-6">
              <h2 className="text-lg font-semibold text-foreground">Benzer İçerikler</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}`}
                    className="rounded-xl border border-border/70 bg-muted/30 p-4 transition-colors hover:border-accent/50"
                  >
                    <p className="text-xs text-accent">{related.category}</p>
                    <p className="mt-1 font-medium text-foreground">{related.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{related.excerpt}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Bloga Geri Dön
            </Link>
          </Button>
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/iletisim">
              Galerinize Özel Plan İsteyin
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
