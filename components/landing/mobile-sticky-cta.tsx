'use client'

import Link from 'next/link'
import { MessageCircle, Phone, PlayCircle } from 'lucide-react'
import { useLandingCtaExperiment } from '@/components/landing/use-landing-cta-experiment'

const PHONE_DISPLAY = '0530 973 82 40'
const PHONE_TEL = '+905309738240'
const WHATSAPP_URL = 'https://wa.me/905309738240'

export function MobileStickyCta() {
  const { variant, trackClick } = useLandingCtaExperiment('mobile_sticky')
  const demoHref =
    variant === 'B'
      ? '/demo?utm_campaign=landing_cta_mobile_b&utm_source=mobile_sticky'
      : '/demo'

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
      <div className="relative px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-background/95 p-2 shadow-2xl backdrop-blur">
          <a
            href={`tel:${PHONE_TEL}`}
            aria-label={`Ara ${PHONE_DISPLAY}`}
            onClick={() => trackClick('call', `tel:${PHONE_TEL}`, `Ara ${PHONE_DISPLAY}`)}
            className="inline-flex flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/40 px-2 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Phone className="mb-1 h-4 w-4" />
            Ara
          </a>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp ile iletişime geç"
            onClick={() => trackClick('whatsapp', WHATSAPP_URL, 'WhatsApp ile iletisime gec')}
            className="inline-flex flex-col items-center justify-center rounded-xl bg-accent px-2 py-2 text-[11px] font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <MessageCircle className="mb-1 h-4 w-4" />
            WhatsApp
          </a>

          <Link
            href={demoHref}
            aria-label="Canlı demoyu incele"
            onClick={() => trackClick('demo', demoHref, 'Canli demo incele')}
            className="inline-flex flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/40 px-2 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <PlayCircle className="mb-1 h-4 w-4" />
            Demo
          </Link>
        </div>
      </div>
    </div>
  )
}
