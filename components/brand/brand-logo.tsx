import type { CSSProperties } from 'react'
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

const toneClasses: Record<BrandLogoTone, { text: string; muted: string; word: string; line: string; tile: TileTheme }> = {
  light: {
    text: 'text-foreground',
    muted: 'text-muted-foreground',
    word: 'text-muted-foreground',
    line: 'text-foreground',
    tile: DARK_TILE,
  },
  dark: {
    text: 'text-white',
    muted: 'text-white/70',
    word: 'text-white/60',
    line: 'text-white',
    tile: LIGHT_TILE,
  },
  sidebar: {
    text: 'text-sidebar-foreground',
    muted: 'text-sidebar-muted',
    word: 'text-sidebar-muted',
    line: 'text-sidebar-foreground',
    tile: LIGHT_TILE,
  },
}

// Bespoke automotive mark — a sleek car drawn as a single, confident line.
function CarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 28" fill="none" aria-hidden className={className}>
      <path
        d="M3 17C3 15.6 3.9 14.8 5.4 14.5L9 13.8C10.4 13.6 11.4 12.8 12.4 11.6C14.2 9.4 16.6 7 21 7H28C31 7 32.6 8.4 34.2 10.4L36.4 12.6C37.3 13.3 38.2 13.6 39.6 13.6H40.8C42 13.6 42.8 14.4 42.8 15.6V17"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 17.7H38.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
      <circle cx="13" cy="18.2" r="3.5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="31" cy="18.2" r="3.5" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  )
}

// The same car read as one elegant line — a slim side profile that "parks" above the wordmark.
function CarLine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 152 30" fill="none" aria-hidden className={cn('w-32', className)}>
      <path
        d="M6 21.5C6 19 8 18 12 17.6L30 17C37 16.6 40 16 45 12C49 9 55 7.6 69 7.6L95 7.6C107 7.6 112 9.6 117 13.4L129 16.8C135 17.2 139 18 142 18.4C146 19 148 20 148 21.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="44" cy="22.5" r="4.2" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="112" cy="22.5" r="4.2" stroke="currentColor" strokeWidth="2.2" />
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
      <CarGlyph className={cn('w-7', tile.glyph)} />
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
      <CarLine className={cn('-mb-1', classes.line, mode === 'stacked' ? 'w-36' : 'w-32')} />
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
      {mode === 'full' ? <BrandIcon tone={tone} /> : null}
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
