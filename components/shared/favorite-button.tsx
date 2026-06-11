'use client'

import { Heart } from 'lucide-react'

import { useFavorites } from '@/lib/client/use-favorites'
import { FAVORITES_I18N, type SavedVehicleInput } from '@/lib/favorites'
import type { PublicLocale } from '@/lib/public-i18n'
import { cn } from '@/lib/utils'

type FavoriteButtonProps = {
  record: SavedVehicleInput
  locale: PublicLocale
  /** `overlay` = dark pill for a card corner; `ghost` = transparent for a dark header. */
  variant?: 'overlay' | 'ghost'
  className?: string
}

export function FavoriteButton({ record, locale, variant = 'overlay', className }: FavoriteButtonProps) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite(record.id)
  const labels = FAVORITES_I18N[locale]
  const label = active ? labels.removeAria : labels.addAria

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={(event) => {
        // Cards wrap the image in a link; don't navigate when toggling.
        event.preventDefault()
        event.stopPropagation()
        toggle(record)
      }}
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full transition active:scale-90',
        variant === 'overlay'
          ? 'bg-black/55 text-white backdrop-blur-sm hover:bg-black/70'
          : 'text-current hover:bg-current/10',
        className,
      )}
    >
      <Heart
        className={cn(
          'size-[18px] transition-colors',
          active ? 'fill-rose-500 text-rose-500' : 'fill-transparent',
        )}
      />
    </button>
  )
}
