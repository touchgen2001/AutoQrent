import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/lib/utils'

type BrandLogoTone = 'light' | 'dark' | 'sidebar'
type BrandLogoMode = 'full' | 'compact' | 'stacked'

type BrandLogoProps = {
  href?: string
  tone?: BrandLogoTone
  mode?: BrandLogoMode
  subtitle?: string
  className?: string
  /** Add a subtle hover lift to the QR-integrated CG mark. */
  shimmer?: boolean
}

const subtitleClasses: Record<BrandLogoTone, string> = {
  light: 'text-muted-foreground',
  dark: 'text-white/70',
  sidebar: 'text-sidebar-muted',
}

function BrandImage({ mode, shimmer }: { mode: BrandLogoMode; shimmer?: boolean }) {
  const compact = mode === 'compact'

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center',
        compact
          ? 'size-10 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg shadow-black/20'
          : mode === 'stacked'
            ? 'h-24 w-64'
            : 'h-12 w-36 md:h-14 md:w-44',
        shimmer && 'transition-transform duration-300 hover:scale-105',
      )}
    >
      <Image
        src={compact ? '/brand/cebindegaleri-mark.png' : '/brand/cebindegaleri-mark-transparent.png'}
        alt=""
        width={compact ? 320 : 1000}
        height={compact ? 320 : 360}
        priority
        className={cn(
          'size-full',
          compact ? 'object-cover' : 'object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]',
        )}
      />
    </span>
  )
}

export function BrandLogo({ href = '/', tone = 'light', mode = 'full', subtitle, className, shimmer }: BrandLogoProps) {
  const content = (
    <span className="inline-flex min-w-0 flex-col items-center">
      <BrandImage mode={mode} shimmer={shimmer} />
      {subtitle && mode !== 'compact' ? (
        <span className={cn('mt-1 text-center text-xs font-medium leading-none', subtitleClasses[tone])}>{subtitle}</span>
      ) : null}
    </span>
  )

  const baseClassName = cn(
    'inline-flex min-w-0 items-center rounded-2xl outline-none transition focus-visible:ring-[3px] focus-visible:ring-ring/40',
    className,
  )

  if (!href) {
    return <div className={baseClassName}>{content}</div>
  }

  return (
    <Link href={href} className={baseClassName}>
      {content}
    </Link>
  )
}

export function BrandMark({ className }: { tone?: BrandLogoTone; className?: string }) {
  return (
    <span className={className}>
      <BrandImage mode="compact" />
    </span>
  )
}
