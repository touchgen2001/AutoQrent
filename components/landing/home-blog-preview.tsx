import Link from "next/link"
import { ArrowRight, BookOpenText, Newspaper } from "lucide-react"

import { Button } from "@/components/ui/button"
import { blogPosts } from "@/lib/blog-posts"

const latestPosts = blogPosts.slice(0, 3)

export function HomeBlogPreview() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Newspaper className="h-3.5 w-3.5" />
              Otomobil haberleri ve galeri rehberi
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Galeri sahipleri için güncel okuma alanı
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Blog alanı otomobil pazarı, araç fotoğrafı, QR vitrin ve galeri web sitesi konularında pratik rehberler sunar.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full md:w-auto">
            <Link href="/blog">
              Tüm Yazıları Gör
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {latestPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl border border-border/70 bg-card p-6 transition-all hover:border-accent/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {post.category}
                </span>
                <span className="text-xs text-muted-foreground">{post.readingTime}</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold leading-tight text-foreground group-hover:text-accent">
                {post.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                <span className="text-xs text-muted-foreground">{post.date}</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                  <BookOpenText className="h-3.5 w-3.5" />
                  Oku
                </span>
              </div>
              {post.sourceLinks?.length ? (
                <p className="mt-3 text-xs text-muted-foreground">Kaynak bağlantıları yazı içinde listelenir.</p>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
