'use client'

import { GitCompare } from 'lucide-react'

import { useFavorites } from '@/lib/client/use-favorites'
import { FAVORITES_I18N, FAVORITES_OPEN_EVENT } from '@/lib/favorites'
import type { PublicLocale } from '@/lib/public-i18n'
import { cn } from '@/lib/utils'

// A compact "Karşılaştır (N)" entry point (e.g. for the showroom header). Shows
// only when there are favourites; clicking opens the shared FavoritesTray sheet
// directly in compare mode via a window event (no shared state needed).
export function FavoritesCompareButton({ locale, className }: { locale: PublicLocale; className?: string }) {
  const { ready, count } = useFavorites()
  const labels = FAVORITES_I18N[locale]

  if (!ready || count === 0) return null

  return (
    <button
      type="button"
      aria-label={`${labels.compare} (${count})`}
      onClick={() => window.dispatchEvent(new CustomEvent(FAVORITES_OPEN_EVENT, { detail: { mode: 'compare' } }))}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full bg-rose-600 px-3 text-sm font-semibold text-white transition hover:bg-rose-700 md:h-10',
        className,
      )}
    >
      <GitCompare className="size-4" />
      <span className="hidden sm:inline">{labels.compare}</span>
      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-bold tabular-nums">
        {count}
      </span>
    </button>
  )
}
