'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

export type LandingCtaVariant = 'A' | 'B'
export type LandingCtaSurface = 'header' | 'hero' | 'cta_section' | 'mobile_sticky' | 'pricing' | 'contact'

export type LandingCtaAction =
  | 'primary'
  | 'secondary'
  | 'call'
  | 'whatsapp'
  | 'demo'
  | 'plan_start'
  | 'contact_submit'
  | 'billing_toggle'

type VariantConfig = {
  primaryLabel: string
  primaryHref: string
  heroSecondaryLabel: string
  heroSecondaryHref: string
  sectionSecondaryLabel: string
  sectionSecondaryHref: string
}

type TrackEventPayload = {
  eventType: 'impression' | 'click'
  variant: LandingCtaVariant
  surface: LandingCtaSurface
  sessionId: string
  action?: LandingCtaAction
  href?: string
  label?: string
  pagePath: string
}

type LandingCtaConfigResponse =
  | {
      ok: true
      mode: 'auto' | 'forced'
      forcedVariant: LandingCtaVariant | null
  }
  | {
      ok: false
    }

let forcedVariantRequest: Promise<LandingCtaVariant | null> | null = null

const VARIANT_COOKIE_KEY = 'cg_landing_cta_variant'
const VARIANT_STORAGE_KEY = 'cg_landing_cta_variant'
const SESSION_STORAGE_KEY = 'cg_landing_cta_session_id'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const VARIANT_CONFIGS: Record<LandingCtaVariant, VariantConfig> = {
  A: {
    primaryLabel: '14 Gün Ücretsiz Başla',
    primaryHref: '/kayit',
    heroSecondaryLabel: 'Canlı Demoyu İncele',
    heroSecondaryHref: '/demo',
    sectionSecondaryLabel: 'Canlı Demoyu İncele',
    sectionSecondaryHref: '/demo',
  },
  B: {
    primaryLabel: '14 Gün Ücretsiz Başla',
    primaryHref: '/kayit',
    heroSecondaryLabel: 'Canlı Demoyu İncele',
    heroSecondaryHref: '/demo',
    sectionSecondaryLabel: 'Canlı Demoyu İncele',
    sectionSecondaryHref: '/demo',
  },
}

function isLandingCtaVariant(value: string | null): value is LandingCtaVariant {
  return value === 'A' || value === 'B'
}

function readCookieVariant() {
  if (typeof document === 'undefined') return null

  const chunks = document.cookie.split(';').map((part) => part.trim())
  const targetPrefix = `${VARIANT_COOKIE_KEY}=`
  const matched = chunks.find((chunk) => chunk.startsWith(targetPrefix))
  if (!matched) return null

  const value = matched.slice(targetPrefix.length)
  return isLandingCtaVariant(value) ? value : null
}

function pickVariant() {
  return Math.random() < 0.5 ? 'A' : 'B'
}

async function fetchForcedVariant(): Promise<LandingCtaVariant | null> {
  if (forcedVariantRequest) {
    return forcedVariantRequest
  }

  forcedVariantRequest = (async () => {
    try {
      const response = await fetch('/api/landing/cta-config', {
        cache: 'no-store',
      })
      const data = (await response.json()) as LandingCtaConfigResponse
      if (!response.ok || !data.ok) return null
      if (data.mode !== 'forced') return null
      return data.forcedVariant === 'A' || data.forcedVariant === 'B' ? data.forcedVariant : null
    } catch {
      return null
    } finally {
      forcedVariantRequest = null
    }
  })()

  try {
    return await forcedVariantRequest
  } catch {
    return null
  }
}

function ensureSessionId() {
  if (typeof window === 'undefined') return 'server'

  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (stored) return stored

  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sid_${Date.now()}_${Math.round(Math.random() * 1_000_000)}`

  window.localStorage.setItem(SESSION_STORAGE_KEY, generated)
  return generated
}

function sendTrackEvent(payload: TrackEventPayload) {
  const body = JSON.stringify(payload)

  if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon('/api/landing/cta-events', blob)
    return
  }

  void fetch('/api/landing/cta-events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body,
    keepalive: true,
    cache: 'no-store',
  })
}

export function useLandingCtaExperiment(surface: LandingCtaSurface) {
  const pathname = usePathname()
  const [variant, setVariant] = useState<LandingCtaVariant>('A')
  const [sessionId, setSessionId] = useState<string>('server')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const cookieVariant = readCookieVariant()
        const storageVariant = window.localStorage.getItem(VARIANT_STORAGE_KEY)
        const forcedVariant = await fetchForcedVariant()

        const resolvedVariant = forcedVariant
          || cookieVariant
          || (isLandingCtaVariant(storageVariant) ? storageVariant : null)
          || pickVariant()

        window.localStorage.setItem(VARIANT_STORAGE_KEY, resolvedVariant)
        document.cookie = `${VARIANT_COOKIE_KEY}=${resolvedVariant}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`

        setVariant(resolvedVariant)
        setSessionId(ensureSessionId())
        setIsReady(true)
      })()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    if (!isReady) return

    const impressionKey = `landing-cta-impression:${pathname}:${surface}:${variant}`
    if (window.sessionStorage.getItem(impressionKey)) {
      return
    }

    window.sessionStorage.setItem(impressionKey, '1')
    sendTrackEvent({
      eventType: 'impression',
      variant,
      surface,
      sessionId,
      pagePath: pathname,
    })
  }, [isReady, pathname, sessionId, surface, variant])

  const trackClick = useCallback(
    (action: LandingCtaAction, href: string, label: string) => {
      sendTrackEvent({
        eventType: 'click',
        variant,
        surface,
        sessionId,
        action,
        href,
        label,
        pagePath: pathname,
      })
    },
    [pathname, sessionId, surface, variant],
  )

  const config = useMemo(() => VARIANT_CONFIGS[variant], [variant])

  return {
    variant,
    config,
    trackClick,
  }
}
