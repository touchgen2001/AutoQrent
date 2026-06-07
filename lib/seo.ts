import type { Metadata } from 'next'

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cebindegaleri.com'

export const siteConfig = {
  name: 'Cebindegaleri',
  siteUrl: rawSiteUrl.replace(/\/$/, ''),
  defaultTitle: 'Cebindegaleri - Dijital Araç Vitrini',
  defaultDescription:
    'Araç galerileri için QR kodlu dijital showroom, stok yönetimi, lead takibi ve satış analitiği platformu.',
  defaultKeywords: [
    'araç galerisi yazılımı',
    'QR kodlu dijital vitrin',
    'oto galeri stok yönetimi',
    'galeri lead takibi',
    'mobil araç sayfası',
  ],
}

export function absoluteUrl(path: string) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${siteConfig.siteUrl}${cleanPath}`
}

type PageMetadataInput = {
  title: string
  description: string
  path: string
  canonicalPath?: string
  keywords?: string[]
  noIndex?: boolean
  openGraphType?: 'website' | 'article'
  image?: string | null
}

export function createPageMetadata({
  title,
  description,
  path,
  canonicalPath,
  keywords = [],
  noIndex = false,
  openGraphType = 'website',
  image,
}: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(canonicalPath || path)
  const imageUrl = image ? (image.startsWith('http') ? image : absoluteUrl(image)) : undefined

  return {
    title,
    description,
    keywords: [...siteConfig.defaultKeywords, ...keywords],
    alternates: {
      canonical,
    },
    openGraph: {
      type: openGraphType,
      url: canonical,
      title,
      description,
      siteName: siteConfig.name,
      locale: 'tr_TR',
      // Only set images when an explicit one is passed; otherwise omit the key
      // so the root-level opengraph-image.tsx file convention is inherited
      // instead of being suppressed by an `images: undefined` override.
      ...(imageUrl ? { images: [{ url: imageUrl, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
        }
      : {
          index: true,
          follow: true,
        },
  }
}
