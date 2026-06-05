import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo'
import { getPublicVehicleDetail, getVehicleSeoDescription, getVehicleSeoImage, getVehicleSeoTitle } from '@/lib/public-vehicle-seo'

type VehicleLayoutProps = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: VehicleLayoutProps): Promise<Metadata> {
  const { id } = await params
  const vehicle = await getPublicVehicleDetail(id)

  if (!vehicle) {
    return createPageMetadata({
      title: 'Araç Bulunamadı',
      description: 'Talep edilen araç kaydı bulunamadı.',
      path: `/arac/${id}`,
      keywords: ['arac', 'galeri', 'qr'],
    })
  }

  return createPageMetadata({
    title: getVehicleSeoTitle(vehicle),
    description: getVehicleSeoDescription(vehicle),
    path: `/arac/${id}`,
    keywords: [
      'araç detayı',
      'qr araç sayfası',
      'mobil araç vitrini',
      'whatsapp araç iletişim',
      `${vehicle.brand.toLowerCase()} ${vehicle.model.toLowerCase()}`,
      `${vehicle.year} ikinci el araç`,
    ],
    image: getVehicleSeoImage(vehicle),
  })
}

export default function VehicleLayout({ children }: VehicleLayoutProps) {
  return children
}
