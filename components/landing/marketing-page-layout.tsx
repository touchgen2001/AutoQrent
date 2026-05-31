import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { LandingFooter } from '@/components/landing/footer'
import { LandingHeader } from '@/components/landing/header'
import { Badge } from '@/components/ui/badge'

type MarketingPageLayoutProps = {
  children: ReactNode
  className?: string
}

type MarketingPageHeroProps = {
  badge: string
  title: string
  description: string
  actions?: ReactNode
  className?: string
}

type MarketingPageSectionProps = {
  children: ReactNode
  className?: string
}

export function MarketingPageLayout({ children, className }: MarketingPageLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <LandingHeader />
      <main className="pt-16">{children}</main>
      <LandingFooter />
    </div>
  )
}

export function MarketingPageHero({
  badge,
  title,
  description,
  actions,
  className,
}: MarketingPageHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-muted/35 via-background to-background',
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 md:pb-16 md:pt-20 lg:px-8">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-4 border-accent/20 bg-accent/10 text-accent">
            {badge}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
          {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
    </section>
  )
}

export function MarketingPageSection({ children, className }: MarketingPageSectionProps) {
  return <section className={cn('mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8', className)}>{children}</section>
}
