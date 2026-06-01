'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLandingCtaExperiment } from '@/components/landing/use-landing-cta-experiment'

export function HeroCtaActions() {
  const { config, trackClick } = useLandingCtaExperiment('hero')

  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
      <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-8 text-base">
        <Link
          href={config.primaryHref}
          onClick={() => trackClick('primary', config.primaryHref, config.primaryLabel)}
        >
          {config.primaryLabel}
          <ArrowRight className="ml-2 w-5 h-5" />
        </Link>
      </Button>
      <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
        <Link
          href={config.heroSecondaryHref}
          onClick={() => trackClick('secondary', config.heroSecondaryHref, config.heroSecondaryLabel)}
        >
          {config.heroSecondaryLabel}
        </Link>
      </Button>
    </div>
  )
}
