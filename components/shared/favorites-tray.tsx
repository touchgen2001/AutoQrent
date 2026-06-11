'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Heart, Share2, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { VehicleImageFrame } from '@/components/shared/vehicle-image-frame'
import { useFavorites } from '@/lib/client/use-favorites'
import { FAVORITES_I18N, FAVORITES_OPEN_EVENT, type SavedVehicle } from '@/lib/favorites'
import type { PublicLocale } from '@/lib/public-i18n'
import { cn } from '@/lib/utils'

export function FavoritesTray({ locale }: { locale: PublicLocale }) {
  const { items, ready, count, remove, clear } = useFavorites()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'compare'>('list')
  const labels = FAVORITES_I18N[locale]

  // Allow other entry points (e.g. the header "Karşılaştır" button) to open
  // this single sheet, optionally jumping straight to a mode.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: 'list' | 'compare' }>).detail
      if (detail?.mode === 'compare' || detail?.mode === 'list') setMode(detail.mode)
      setOpen(true)
    }
    window.addEventListener(FAVORITES_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(FAVORITES_OPEN_EVENT, onOpen)
  }, [])

  if (!ready || count === 0) return null

  const compareRows: { key: string; label: string; get: (v: SavedVehicle) => string; strong?: boolean }[] = [
    { key: 'price', label: labels.price, get: (v) => v.priceLabel, strong: true },
    { key: 'year', label: labels.year, get: (v) => v.yearLabel },
    { key: 'mileage', label: labels.mileage, get: (v) => v.mileageLabel },
    { key: 'fuel', label: labels.fuel, get: (v) => v.fuelLabel || '—' },
    { key: 'transmission', label: labels.transmission, get: (v) => v.transmissionLabel || '—' },
    { key: 'body', label: labels.body, get: (v) => v.bodyType || '—' },
  ]

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const origin = window.location.origin
    const lines = items.map((vehicle) => {
      const url = vehicle.href.startsWith('/') ? `${origin}${vehicle.href}` : ''
      return url ? `• ${vehicle.title} — ${vehicle.priceLabel}\n${url}` : `• ${vehicle.title} — ${vehicle.priceLabel}`
    })
    const text = `${labels.shareIntro}:\n\n${lines.join('\n\n')}`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: labels.open, text })
        return
      }
    } catch {
      // User dismissed the native share sheet — do nothing.
      return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={labels.open}
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-rose-600/30 transition hover:bg-rose-700 active:scale-95 md:bottom-8"
        >
          <Heart className="size-5 fill-current" />
          <span className="hidden sm:inline">{labels.open}</span>
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-bold tabular-nums">
            {count}
          </span>
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Heart className="size-5 fill-rose-500 text-rose-500" />
            {labels.open}
            <span className="text-muted-foreground">({count})</span>
          </SheetTitle>
          <div className="mt-3 inline-flex w-fit rounded-full border bg-muted p-1 text-sm">
            {(['list', 'compare'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  'rounded-full px-4 py-1.5 font-medium transition',
                  mode === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {value === 'list' ? labels.list : labels.compare}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {mode === 'list' ? (
            <ul className="divide-y">
              {items.map((vehicle) => (
                <li key={vehicle.id} className="flex items-center gap-3 p-3">
                  <Link href={vehicle.href} className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <VehicleImageFrame
                      src={vehicle.image}
                      alt={vehicle.title}
                      sizes="64px"
                      quality={55}
                      imageClassName="object-cover"
                      loading="lazy"
                      placeholderClassName="[&_svg]:h-4 [&_svg]:w-4 [&_span]:sr-only"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={vehicle.href} className="line-clamp-1 text-sm font-semibold hover:underline">
                      {vehicle.title}
                    </Link>
                    <p className="mt-0.5 text-sm font-bold text-foreground">{vehicle.priceLabel}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {vehicle.yearLabel} · {vehicle.mileageLabel} · {vehicle.fuelLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={labels.removeAria}
                    onClick={() => remove(vehicle.id)}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto p-3">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-background" />
                    {items.map((vehicle) => (
                      <th key={vehicle.id} className="min-w-[140px] p-2 align-top">
                        <Link href={vehicle.href} className="block">
                          <span className="relative block aspect-[16/10] overflow-hidden rounded-lg bg-muted">
                            <VehicleImageFrame
                              src={vehicle.image}
                              alt={vehicle.title}
                              sizes="160px"
                              quality={55}
                              imageClassName="object-cover"
                              loading="lazy"
                              placeholderClassName="[&_svg]:h-4 [&_svg]:w-4 [&_span]:sr-only"
                            />
                          </span>
                          <span className="mt-1.5 line-clamp-2 text-left text-xs font-semibold leading-tight text-foreground">
                            {vehicle.title}
                          </span>
                        </Link>
                        <button
                          type="button"
                          aria-label={labels.removeAria}
                          onClick={() => remove(vehicle.id)}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.key} className="border-t">
                      <th className="sticky left-0 z-10 whitespace-nowrap bg-background py-2 pr-3 text-left text-xs font-medium text-muted-foreground">
                        {row.label}
                      </th>
                      {items.map((vehicle) => (
                        <td
                          key={vehicle.id}
                          className={cn(
                            'p-2 text-center align-middle',
                            row.strong ? 'font-bold text-foreground' : 'text-foreground/90',
                          )}
                        >
                          {row.get(vehicle)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t">
                    <th className="sticky left-0 z-10 bg-background" />
                    {items.map((vehicle) => (
                      <td key={vehicle.id} className="p-2 text-center">
                        <Button asChild size="sm" variant="outline" className="h-8 w-full text-xs">
                          <Link href={vehicle.href}>
                            {labels.detail}
                            <ArrowRight className="ml-1 size-3" />
                          </Link>
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t p-3">
          <Button type="button" onClick={handleShare} className="flex-1 bg-rose-600 text-white hover:bg-rose-700">
            <Share2 className="mr-2 size-4" />
            {labels.share}
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label={labels.clear}
            title={labels.clear}
            onClick={clear}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
