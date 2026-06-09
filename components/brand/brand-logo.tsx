import type { CSSProperties } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

// Metallic monogram fills, mirroring the master logo (scripts/brand/logo.html).
// Gold C + silver G on dark tiles; on light/white tiles the pair steps down to
// antique-gold + graphite so both letters stay legible.
const GOLD_ON_DARK = 'linear-gradient(160deg,#7c5f1f 0%,#d8b757 32%,#fff7da 50%,#ca9d38 68%,#7c5f1f 100%)'
const SILVER_ON_DARK = 'linear-gradient(160deg,#71777d 0%,#c4cacf 32%,#ffffff 50%,#aab0b6 68%,#71777d 100%)'
const GOLD_ON_LIGHT = 'linear-gradient(160deg,#5e4715 0%,#a87f24 50%,#6b521a 100%)'
const GRAPHITE_ON_LIGHT = 'linear-gradient(160deg,#3a3a3d 0%,#19191b 100%)'

const CLIP_TEXT: CSSProperties = { WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }

type BrandLogoTone = 'light' | 'dark' | 'sidebar'
type BrandLogoMode = 'full' | 'compact' | 'stacked'

type BrandLogoProps = {
  href?: string
  tone?: BrandLogoTone
  mode?: BrandLogoMode
  subtitle?: string
  className?: string
  /** Animate a subtle metallic sweep across the CG monogram (e.g. landing header). */
  shimmer?: boolean
}

type TileTheme = {
  style: CSSProperties
  mono: { c: CSSProperties; g: CSSProperties }
  border: string
}

// Premium tile surfaces — a single layered background paints a soft radial
// sheen on top of a graphite→ink (or white→pearl) gradient, with a baked-in
// drop shadow + inner top highlight for genuine SaaS depth.
const DARK_TILE: TileTheme = {
  style: {
    backgroundImage:
      'radial-gradient(110% 72% at 28% -10%, rgba(255,255,255,0.24), transparent 55%), linear-gradient(152deg, oklch(0.33 0.004 60) 0%, oklch(0.17 0.004 60) 52%, oklch(0.09 0.004 60) 100%)',
    boxShadow: '0 1px 2px rgba(8,8,10,0.40), 0 14px 30px -12px rgba(8,8,10,0.72), inset 0 1px 0 rgba(255,255,255,0.14)',
  },
  mono: { c: { backgroundImage: GOLD_ON_DARK }, g: { backgroundImage: SILVER_ON_DARK } },
  border: 'border border-white/10',
}

const LIGHT_TILE: TileTheme = {
  style: {
    backgroundImage:
      'radial-gradient(110% 72% at 28% -10%, rgba(255,255,255,0.92), transparent 60%), linear-gradient(152deg, #ffffff 0%, oklch(0.95 0.002 75) 55%, oklch(0.88 0.003 75) 100%)',
    boxShadow: '0 1px 2px rgba(8,8,10,0.10), 0 14px 28px -14px rgba(8,8,10,0.40), inset 0 1px 0 rgba(255,255,255,0.92)',
  },
  mono: { c: { backgroundImage: GOLD_ON_LIGHT }, g: { backgroundImage: GRAPHITE_ON_LIGHT } },
  border: 'border border-black/5',
}

const toneClasses: Record<BrandLogoTone, { text: string; muted: string; word: string; tile: TileTheme }> = {
  light: {
    text: 'text-foreground',
    muted: 'text-muted-foreground',
    word: 'text-muted-foreground',
    tile: DARK_TILE,
  },
  dark: {
    text: 'text-white',
    muted: 'text-white/70',
    word: 'text-white/60',
    tile: LIGHT_TILE,
  },
  sidebar: {
    text: 'text-sidebar-foreground',
    muted: 'text-sidebar-muted',
    word: 'text-sidebar-muted',
    tile: LIGHT_TILE,
  },
}

// Bespoke monogram mark — the interlocked metallic "CG" (gold C over silver G),
// matching the master logo. Decorative; the wordmark carries the accessible name.
function BrandMonogram({ paint, shimmer }: { paint: TileTheme['mono']; shimmer?: boolean }) {
  const shine = shimmer ? 'brand-shimmer' : undefined
  return (
    <span aria-hidden className="flex items-center font-black leading-none tracking-tight" style={{ fontSize: '1.6rem' }}>
      <span className={cn('relative z-[2]', shine)} style={{ ...CLIP_TEXT, ...paint.c }}>C</span>
      <span className={cn('relative z-[1]', shine)} style={{ ...CLIP_TEXT, ...paint.g, marginLeft: '-0.2em' }}>G</span>
    </span>
  )
}

function BrandIcon({ tone, shimmer }: { tone: BrandLogoTone; shimmer?: boolean }) {
  const { tile } = toneClasses[tone]

  return (
    <span
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', tile.border)}
      style={tile.style}
    >
      <BrandMonogram paint={tile.mono} shimmer={shimmer} />
    </span>
  )
}

function Wordmark({ tone, mode, subtitle, shimmer }: { tone: BrandLogoTone; mode: BrandLogoMode; subtitle?: string; shimmer?: boolean }) {
  const classes = toneClasses[tone]

  if (mode === 'compact') {
    return <BrandIcon tone={tone} shimmer={shimmer} />
  }

  return (
    <span className={cn('relative inline-flex min-w-0 flex-col', mode === 'stacked' ? 'items-center text-center' : 'items-start')}>
      <span className={cn('text-[1.05rem] font-black leading-none tracking-tight', classes.text)}>
        Cebinde<span className={classes.word}>galeri</span>
      </span>
      {subtitle ? <span className={cn('mt-1 text-xs font-medium leading-none', classes.muted)}>{subtitle}</span> : null}
    </span>
  )
}

export function BrandLogo({ href = '/', tone = 'light', mode = 'full', subtitle, className, shimmer }: BrandLogoProps) {
  const content = (
    <>
      {mode !== 'compact' ? <BrandIcon tone={tone} shimmer={shimmer} /> : null}
      <Wordmark tone={tone} mode={mode} subtitle={subtitle} shimmer={shimmer} />
    </>
  )

  const baseClassName = cn(
    'inline-flex min-w-0 items-center gap-3 rounded-2xl outline-none transition focus-visible:ring-[3px] focus-visible:ring-ring/40',
    mode === 'stacked' && 'flex-col gap-2',
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

export function BrandMark({ tone = 'light', className }: { tone?: BrandLogoTone; className?: string }) {
  return (
    <span className={className}>
      <BrandIcon tone={tone} />
    </span>
  )
}
