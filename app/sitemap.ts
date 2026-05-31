import type { MetadataRoute } from 'next'

import { blogPosts } from '@/lib/blog-posts'
import { absoluteUrl } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
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
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...blogRoutes]
}
