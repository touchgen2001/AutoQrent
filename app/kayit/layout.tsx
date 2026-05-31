import type { Metadata } from 'next'

import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Kayıt Ol',
  description: 'Cebindegaleri hesabınızı oluşturun ve QR kodlu dijital vitrininizi başlatın.',
  path: '/kayit',
  noIndex: true,
})

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
