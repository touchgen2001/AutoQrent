import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Calendar, Clock3 } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { blogPosts } from '@/lib/blog-posts'
import { createPageMetadata } from '@/lib/seo'

type BlogPostPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = blogPosts.find((item) => item.slug === slug)

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
    keywords: ['blog', post.category.toLowerCase(), 'oto galeri operasyonu'],
  })
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = blogPosts.find((item) => item.slug === slug)

  if (!post) {
    notFound()
  }

  return (
    <MarketingPageLayout>
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
