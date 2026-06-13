import type { MetadataRoute } from 'next'

import { blogPosts } from '@/lib/blog-posts'
import { DEMO_VEHICLE_ROUTE_ID, getDemoShowroomHref } from '@/lib/demo-public-experience'
import { getPublicSitemapEntries } from '@/lib/public-sitemap'
import { absoluteUrl } from '@/lib/seo'
import { cityLandings } from '@/lib/city-landing'
import { comparisonLandings } from '@/lib/comparison-landings'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl('/hakkimizda'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/demo'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/basari-hikayeleri'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.82,
    },
    {
      url: absoluteUrl(getDemoShowroomHref()),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.65,
    },
    {
      url: absoluteUrl(`/arac/${DEMO_VEHICLE_ROUTE_ID}`),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.65,
    },
    {
      url: absoluteUrl('/ozellikler'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: absoluteUrl('/nasil-calisir'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: absoluteUrl('/fiyatlar'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: absoluteUrl('/sss'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/blog'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: absoluteUrl('/iletisim'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: absoluteUrl('/guvenlik'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: absoluteUrl('/kariyer'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/gizlilik'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/kvkk'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/kullanim-kosullari'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/cerez-politikasi'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const cityRoutes: MetadataRoute.Sitemap = cityLandings.map((city) => ({
    url: absoluteUrl(`/galeri-yazilimi/${city.slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.72,
  }))

  const comparisonRoutes: MetadataRoute.Sitemap = comparisonLandings.map((landing) => ({
    url: absoluteUrl(`/karsilastir/${landing.slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.76,
  }))

  const publicRoutes = await getPublicSitemapEntries(now)

  return [...staticRoutes, ...cityRoutes, ...comparisonRoutes, ...blogRoutes, ...publicRoutes]
}
