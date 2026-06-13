import { notFound } from 'next/navigation'

import { ShowroomPageClient } from '@/components/showroom/showroom-page-client'
import { getPublicShowroomData } from '@/lib/public-showroom'
import {
  buildShowroomAutoDealerJsonLd,
  buildShowroomBreadcrumbJsonLd,
  buildShowroomVehicleItemListJsonLd,
  buildShowroomWebPageJsonLd,
} from '@/lib/public-showroom-seo'

type ShowroomPageProps = {
  params: Promise<{ dealerSlug: string }>
}

function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export default async function ShowroomPage({ params }: ShowroomPageProps) {
  const { dealerSlug } = await params
  const showroomData = await getPublicShowroomData(dealerSlug)

  if (!showroomData) {
    notFound()
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(buildShowroomAutoDealerJsonLd(showroomData.dealer)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(buildShowroomWebPageJsonLd(showroomData.dealer, showroomData.vehicles)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(buildShowroomVehicleItemListJsonLd(showroomData.dealer, showroomData.vehicles)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(buildShowroomBreadcrumbJsonLd(showroomData.dealer)),
        }}
      />
      <ShowroomPageClient dealer={showroomData.dealer} vehicles={showroomData.vehicles} />
    </>
  )
}
