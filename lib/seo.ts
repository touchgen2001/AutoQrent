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
  // Fall back to the branded /og share card so every page emits a real Open
  // Graph / Twitter image (the opengraph-image.tsx file convention only covered
  // the root segment, not nested marketing pages).
  const imageUrl = image ? (image.startsWith('http') ? image : absoluteUrl(image)) : absoluteUrl('/og')

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
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
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
