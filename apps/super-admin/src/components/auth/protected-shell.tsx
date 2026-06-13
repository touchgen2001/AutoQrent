import type { ReactNode } from 'react'

import { useAuth } from '@/lib/auth'

export function ProtectedShell({ children }: { children: ReactNode }) {
  const { session } = useAuth()

  if (!session) {
    return null
  }

  return children
}
