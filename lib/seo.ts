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
  keywords?: string[]
  noIndex?: boolean
}

export function createPageMetadata({
  title,
  description,
  path,
  keywords = [],
  noIndex = false,
}: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path)

  return {
    title,
    description,
    keywords: [...siteConfig.defaultKeywords, ...keywords],
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      siteName: siteConfig.name,
      locale: 'tr_TR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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
