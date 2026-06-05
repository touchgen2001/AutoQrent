import { notFound } from 'next/navigation'

import { PublicVehiclePageClient } from '@/components/public/public-vehicle-page-client'
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

  return <PublicVehiclePageClient routeId={id} vehicle={vehicle} />
}
