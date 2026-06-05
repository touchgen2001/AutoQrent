import Link from 'next/link'
import { QrCode } from 'lucide-react'

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

const toneClasses: Record<BrandLogoTone, { text: string; muted: string; mark: string; line: string }> = {
  light: {
    text: 'text-foreground',
    muted: 'text-muted-foreground',
    mark: 'bg-primary text-primary-foreground',
    line: 'text-foreground',
  },
  dark: {
    text: 'text-white',
    muted: 'text-white/70',
    mark: 'bg-white text-black',
    line: 'text-white',
  },
  sidebar: {
    text: 'text-sidebar-foreground',
    muted: 'text-sidebar-muted',
    mark: 'bg-white text-sidebar',
    line: 'text-sidebar-foreground',
  },
}

function CarLine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 168 38" aria-hidden className={cn('h-7 w-32', className)}>
      <path
        d="M8 27.2c15.4-12 27.5-17.9 44.2-17.9h24.3c9.8 0 16.2 1.8 23.9 7.4l8.1 5.9c4 2.9 8.3 4.3 13.2 4.3H160"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48.5 9.7c8.1-6.3 25.9-7 38.5-.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 27.5h18.6M120.8 27.5h23.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.72"
      />
    </svg>
  )
}

function BrandIcon({ tone }: { tone: BrandLogoTone }) {
  const classes = toneClasses[tone]

  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm', classes.mark)}>
      <QrCode className="size-5" />
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
      <CarLine className={cn('-mb-3', classes.line, mode === 'stacked' ? 'w-36' : 'w-32')} />
      <span className={cn('text-[1.05rem] font-black leading-none tracking-tight', classes.text)}>Cebindegaleri</span>
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
