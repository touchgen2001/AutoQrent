import { QrCode } from 'lucide-react'

import { cn } from '@/lib/utils'

type SuperAdminLogoProps = {
  compact?: boolean
  subtitle?: string
  tone?: 'dark' | 'light'
  className?: string
  onClick?: () => void
}

function CarLine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 168 38" aria-hidden className={cn('h-7 w-32', className)}>
      <path
        d="M8 27.2c15.4-12 27.5-17.9 44.2-17.9h24.3c9.8 0 16.2 1.8 23.9 7.4l8.1 5.9c4 2.9 8.3 4.3 13.2 4.3H160"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path d="M48.5 9.7c8.1-6.3 25.9-7 38.5-.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M22 27.5h18.6M120.8 27.5h23.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" opacity="0.72" />
    </svg>
  )
}

export function SuperAdminLogo({ compact = false, subtitle, tone = 'dark', className, onClick }: SuperAdminLogoProps) {
  const dark = tone === 'dark'
  const content = compact ? (
    <span className={cn('flex size-10 items-center justify-center rounded-2xl shadow-sm', dark ? 'bg-white text-black' : 'bg-black text-white')}>
      <QrCode />
    </span>
  ) : (
    <>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm', dark ? 'bg-white text-black' : 'bg-black text-white')}>
        <QrCode />
      </span>
      <span className="relative inline-flex min-w-0 flex-col items-start">
        <CarLine className={cn('-mb-3', dark ? 'text-white' : 'text-black')} />
        <span className={cn('text-[1.05rem] font-black leading-none tracking-tight', dark ? 'text-white' : 'text-black')}>Cebindegaleri</span>
        {subtitle ? <span className={cn('mt-1 text-xs font-medium leading-none', dark ? 'text-white/60' : 'text-black/55')}>{subtitle}</span> : null}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn('inline-flex min-w-0 items-center gap-3 text-left', className)}>
        {content}
      </button>
    )
  }

  return <div className={cn('inline-flex min-w-0 items-center gap-3', className)}>{content}</div>
}
