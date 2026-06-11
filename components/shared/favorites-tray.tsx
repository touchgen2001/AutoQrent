'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Heart, Trash2, X } from 'lucide-react'

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
import { FAVORITES_I18N, type SavedVehicle } from '@/lib/favorites'
import type { PublicLocale } from '@/lib/public-i18n'
import { cn } from '@/lib/utils'

export function FavoritesTray({ locale }: { locale: PublicLocale }) {
  const { items, ready, count, remove, clear } = useFavorites()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'compare'>('list')
  const labels = FAVORITES_I18N[locale]

  if (!ready || count === 0) return null

  const compareRows: { key: string; label: string; get: (v: SavedVehicle) => string; strong?: boolean }[] = [
    { key: 'price', label: labels.price, get: (v) => v.priceLabel, strong: true },
    { key: 'year', label: labels.year, get: (v) => v.yearLabel },
    { key: 'mileage', label: labels.mileage, get: (v) => v.mileageLabel },
    { key: 'fuel', label: labels.fuel, get: (v) => v.fuelLabel || '—' },
    { key: 'transmission', label: labels.transmission, get: (v) => v.transmissionLabel || '—' },
    { key: 'body', label: labels.body, get: (v) => v.bodyType || '—' },
  ]

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

        <div className="border-t p-3">
          <Button
            type="button"
            variant="ghost"
            onClick={clear}
            className="w-full text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            {labels.clear}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
