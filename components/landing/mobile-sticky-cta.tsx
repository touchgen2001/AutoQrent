'use client'

import Link from 'next/link'
import { ArrowRight, PlayCircle, Rocket } from 'lucide-react'
import { useLandingCtaExperiment } from '@/components/landing/use-landing-cta-experiment'

export function MobileStickyCta() {
  const { trackClick } = useLandingCtaExperiment('mobile_sticky')
  const demoHref = '/demo'
  const signupHref = '/kayit'

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
      <div className="relative px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2">
        <div className="grid grid-cols-[1.65fr_1fr] gap-2 rounded-2xl border border-border/70 bg-background/95 p-2 shadow-2xl backdrop-blur">
          <Link
            href={signupHref}
            aria-label="14 gün ücretsiz başla"
            onClick={() => trackClick('primary', signupHref, '14 Gün Ücretsiz Başla')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Rocket className="h-4 w-4" />
            Ücretsiz Başla
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href={demoHref}
            aria-label="Canlı demoyu incele"
            onClick={() => trackClick('demo', demoHref, 'Canlı demo incele')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <PlayCircle className="h-4 w-4" />
            Demo
          </Link>
        </div>
      </div>
    </div>
  )
}
