'use client'

import { useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export type RegistrationFunnelEventType =
  | 'registration_view'
  | 'registration_submit'
  | 'registration_success'
  | 'onboarding_view'
  | 'onboarding_step'
  | 'onboarding_complete'
  | 'onboarding_skip'

type RegistrationFunnelEventInput = {
  eventType: RegistrationFunnelEventType
  step?: number
  planCode?: string
  billingInterval?: string
}

const SESSION_STORAGE_KEY = 'cg_landing_cta_session_id'

function ensureSessionId() {
  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (stored) return stored

  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sid_${Date.now()}_${Math.round(Math.random() * 1_000_000)}`

  window.localStorage.setItem(SESSION_STORAGE_KEY, generated)
  return generated
}

function sendRegistrationEvent(input: RegistrationFunnelEventInput & { pagePath: string }) {
  const body = JSON.stringify({
    ...input,
    sessionId: ensureSessionId(),
  })

  if ('sendBeacon' in navigator) {
    navigator.sendBeacon(
      '/api/landing/registration-events',
      new Blob([body], { type: 'application/json' }),
    )
    return
  }

  void fetch('/api/landing/registration-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
    cache: 'no-store',
  })
}

export function useRegistrationFunnel(initialEvent?: RegistrationFunnelEventInput) {
  const pathname = usePathname()

  const trackEvent = useCallback((input: RegistrationFunnelEventInput) => {
    sendRegistrationEvent({ ...input, pagePath: pathname })
  }, [pathname])

  useEffect(() => {
    if (!initialEvent) return

    const stepKey = initialEvent.step ? `:${initialEvent.step}` : ''
    const key = `registration-funnel:${pathname}:${initialEvent.eventType}${stepKey}`
    if (window.sessionStorage.getItem(key)) return

    window.sessionStorage.setItem(key, '1')
    sendRegistrationEvent({ ...initialEvent, pagePath: pathname })
  }, [initialEvent, pathname])

  return { trackEvent }
}
