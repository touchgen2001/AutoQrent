import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo'
import { getPublicShowroomData } from '@/lib/public-showroom'
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

  notFound()
}

export default function ShowroomLayout({ children }: ShowroomLayoutProps) {
  return children
}
