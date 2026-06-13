import Image from 'next/image'
import { LockKeyhole, ShieldCheck } from 'lucide-react'

import { BrandLogo } from '@/components/brand/brand-logo'
import { cn } from '@/lib/utils'

type AuthBrandPanelProps = {
  title: string
  description: string
  footer?: string
  securityLabel?: string
  className?: string
}

export function AuthBrandPanel({ title, description, footer, securityLabel, className }: AuthBrandPanelProps) {
  return (
    <aside
      className={cn(
        'relative hidden min-h-[640px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#050505] p-8 text-white shadow-2xl lg:flex lg:flex-col',
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_36%)]" />
      <div className="absolute inset-x-8 top-1/2 h-px bg-white/10" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <BrandLogo href="/" tone="dark" mode="stacked" subtitle={securityLabel} />
        <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/80">
          Secure
        </div>
      </div>

      <div className="relative z-10 mt-8 flex flex-1 flex-col justify-center">
        <div className="-mx-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="relative aspect-[7/4]">
            <Image
              src="/gallery-panel-login-car.jpg"
              alt="Cebindegaleri galeri panel giriş görseli"
              fill
              priority
              sizes="390px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,transparent_0%,rgba(0,0,0,0.18)_48%,rgba(0,0,0,0.62)_100%)]" />
          </div>
        </div>
        <div className="mt-8 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/75">
            <ShieldCheck className="size-3.5" />
            Galeri operasyonu için güvenli erişim
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-white/68">{description}</p>
        </div>
      </div>

      <div className="relative z-10 mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-white/58">
        <span>{footer ?? '© 2026 Cebindegaleri. Tüm hakları saklıdır.'}</span>
        <LockKeyhole className="size-4" />
      </div>
    </aside>
  )
}
