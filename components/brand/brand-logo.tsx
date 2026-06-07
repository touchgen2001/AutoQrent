import type { CSSProperties } from 'react'
import Link from 'next/link'

import { BRAND_GLYPH_PATH, BRAND_GLYPH_STROKE_WIDTH } from '@/lib/brand-glyph'
import { cn } from '@/lib/utils'

type BrandLogoTone = 'light' | 'dark' | 'sidebar'
type BrandLogoMode = 'full' | 'compact' | 'stacked'

type BrandLogoProps = {
  href?: string
  tone?: BrandLogoTone
  mode?: BrandLogoMode
  subtitle?: string
  className?: string
}

type TileTheme = {
  style: CSSProperties
  glyph: string
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
  glyph: 'text-white',
  border: 'border border-white/10',
}

const LIGHT_TILE: TileTheme = {
  style: {
    backgroundImage:
      'radial-gradient(110% 72% at 28% -10%, rgba(255,255,255,0.92), transparent 60%), linear-gradient(152deg, #ffffff 0%, oklch(0.95 0.002 75) 55%, oklch(0.88 0.003 75) 100%)',
    boxShadow: '0 1px 2px rgba(8,8,10,0.10), 0 14px 28px -14px rgba(8,8,10,0.40), inset 0 1px 0 rgba(255,255,255,0.92)',
  },
  glyph: 'text-neutral-900',
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

// Bespoke monogram mark — the shared monoline "G" (see lib/brand-glyph.ts).
function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden className={className}>
      <path
        d={BRAND_GLYPH_PATH}
        stroke="currentColor"
        strokeWidth={BRAND_GLYPH_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BrandIcon({ tone }: { tone: BrandLogoTone }) {
  const { tile } = toneClasses[tone]

  return (
    <span
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', tile.border)}
      style={tile.style}
    >
      <BrandGlyph className={cn('size-6', tile.glyph)} />
    </span>
  )
}

function Wordmark({ tone, mode, subtitle }: { tone: BrandLogoTone; mode: BrandLogoMode; subtitle?: string }) {
  const classes = toneClasses[tone]

  if (mode === 'compact') {
    return <BrandIcon tone={tone} />
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

export function BrandLogo({ href = '/', tone = 'light', mode = 'full', subtitle, className }: BrandLogoProps) {
  const content = (
    <>
      {mode !== 'compact' ? <BrandIcon tone={tone} /> : null}
      <Wordmark tone={tone} mode={mode} subtitle={subtitle} />
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
