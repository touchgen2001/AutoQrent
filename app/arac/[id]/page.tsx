import { notFound } from 'next/navigation'

import { PublicVehiclePageClient } from '@/components/public/public-vehicle-page-client'
import type { PublicVehicle } from '@/lib/public-catalog-types'
import { getPublicShowroomData } from '@/lib/public-showroom'
import { getPublicVehicleDetail } from '@/lib/public-vehicle-seo'

type PublicVehiclePageProps = {
  params: Promise<{ id: string }>
}

export default async function PublicVehiclePage({ params }: PublicVehiclePageProps) {
  const { id } = await params
  const vehicle = await getPublicVehicleDetail(id)

  if (!vehicle) {
    notFound()
  }

  // Sibling vehicles from the same gallery — keeps a QR visitor browsing the
  // dealer's inventory. Best-effort; a failure never blocks the page.
  let otherVehicles: PublicVehicle[] = []
  try {
    const showroom = await getPublicShowroomData(vehicle.gallery.slug)
    if (showroom) {
      otherVehicles = showroom.vehicles
        .filter((item) => item.routeId !== vehicle.routeId && item.id !== id)
        .slice(0, 4)
    }
  } catch {
    otherVehicles = []
  }

  return <PublicVehiclePageClient routeId={id} vehicle={vehicle} otherVehicles={otherVehicles} />
}
