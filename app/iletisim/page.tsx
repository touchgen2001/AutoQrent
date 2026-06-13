import type { Metadata } from 'next'

import IletisimClientPage from './iletisim-client'
import { absoluteUrl, createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'İletişim ve Demo Talebi',
  description:
    'Cebindegaleri satis, demo ve teknik destek ekiplerine hizlica ulasin. Telefon, WhatsApp ve form uzerinden ayni gun geri donus alin.',
  path: '/iletisim',
  keywords: ['iletisim', 'satis destegi', 'demo randevusu', 'whatsapp destek', 'galeri onboarding'],
})

const organizationId = absoluteUrl('/#organization')

const contactPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Cebindegaleri Iletisim',
  url: absoluteUrl('/iletisim'),
  mainEntity: {
    '@type': 'Organization',
    '@id': organizationId,
    name: 'Cebindegaleri',
    email: 'destek@cebindegaleri.com',
    telephone: '+905309738240',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: '+905309738240',
        email: 'destek@cebindegaleri.com',
        availableLanguage: ['tr'],
        areaServed: 'TR',
      },
    ],
  },
}

function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export default function IletisimPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(contactPageJsonLd) }} />
      <IletisimClientPage />
    </>
  )
}
