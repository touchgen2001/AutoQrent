import Link from "next/link"
import { ArrowRight, Store } from "lucide-react"

import { galleryInitialsWithFallback } from "@/lib/gallery-monogram"
import type { PublicGallerySummary } from "@/lib/public-showroom"

// Homepage grid of live dealer showrooms — turns the marketing landing page into
// a marketplace front door (discovery + SEO). Renders nothing when there are no
// public galleries yet, so the section never shows an empty shell.
export function HomeShowrooms({ galleries }: { galleries: PublicGallerySummary[] }) {
  if (galleries.length === 0) return null

  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20">
            <Store className="h-4 w-4" />
            Galeriler
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Cebindegaleri&apos;deki dijital showroom&apos;lar
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            QR ile vitrinini yayınlayan galerilerin araçlarını keşfedin; beğendiğiniz aracın sayfasını
            telefonunuzdan saniyeler içinde açın.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {galleries.map((gallery) => (
            <Link
              key={gallery.slug}
              href={`/showroom/${gallery.slug}`}
              className="group flex flex-col rounded-2xl border border-border/70 bg-card p-5 transition-all hover:border-accent/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-sm font-bold text-muted-foreground">
                  {gallery.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary dealer logo host; plain img avoids next/image domain config
                    <img src={gallery.logo} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                  ) : (
                    galleryInitialsWithFallback(gallery.name)
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{gallery.name}</p>
                  {gallery.location ? (
                    <p className="truncate text-sm text-muted-foreground">{gallery.location}</p>
                  ) : null}
                </div>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                Showroom&apos;u gör
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
