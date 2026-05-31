import type { Metadata } from 'next'

import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Onboarding',
  description: 'Galeri profilinizi tamamlayarak panel kullanımına başlayın.',
  path: '/onboarding',
  noIndex: true,
})

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children
}
