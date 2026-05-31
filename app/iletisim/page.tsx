import type { Metadata } from 'next'

import IletisimClientPage from './iletisim-client'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'İletişim',
  description:
    'Cebindegaleri satış, demo ve teknik destek ekiplerine hızlıca ulaşın. Telefon, WhatsApp ve form üzerinden iletişim kurun.',
  path: '/iletisim',
  keywords: ['iletişim', 'satış desteği', 'demo randevusu', 'whatsapp destek'],
})

export default function IletisimPage() {
  return <IletisimClientPage />
}
