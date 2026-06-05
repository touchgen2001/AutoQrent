import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo'
import { formatDealerNameFromSlug, getPublicShowroomData } from '@/lib/public-showroom'
import {
  getShowroomSeoDescription,
  getShowroomSeoImage,
  getShowroomSeoKeywords,
  getShowroomSeoTitle,
} from '@/lib/public-showroom-seo'

type ShowroomLayoutProps = {
  children: React.ReactNode
  params: Promise<{ dealerSlug: string }>
}

export async function generateMetadata({ params }: ShowroomLayoutProps): Promise<Metadata> {
  const { dealerSlug } = await params
  const showroomData = await getPublicShowroomData(dealerSlug)

  if (showroomData) {
    return createPageMetadata({
      title: getShowroomSeoTitle(showroomData.dealer, showroomData.vehicles),
      description: getShowroomSeoDescription(showroomData.dealer, showroomData.vehicles),
      path: `/showroom/${dealerSlug}`,
      keywords: getShowroomSeoKeywords(showroomData.dealer, showroomData.vehicles),
      image: getShowroomSeoImage(showroomData.dealer, showroomData.vehicles),
    })
  }

  const dealerName = formatDealerNameFromSlug(dealerSlug || 'galeri')

  return createPageMetadata({
    title: `${dealerName} Showroom Bulunamadı`,
    description: 'Talep edilen public galeri vitrini bulunamadı.',
    path: `/showroom/${dealerSlug}`,
    keywords: ['showroom', dealerName.toLowerCase(), 'galeri araç listesi'],
    noIndex: true,
  })
}

export default function ShowroomLayout({ children }: ShowroomLayoutProps) {
  return children
}
