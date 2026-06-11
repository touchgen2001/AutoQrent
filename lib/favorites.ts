// Client-side "favourite vehicles" model. Visitors save vehicles to localStorage
// (no account needed) so they can revisit and compare cars side by side across
// galleries. Pure module — no React, no DOM — so it stays unit-testable; the
// React glue lives in lib/client/use-favorites.ts.
import type { PublicLocale } from '@/lib/public-i18n'

export const FAVORITES_STORAGE_KEY = 'cebindegaleri.favorites.v1'
// Custom event name used to keep every mounted hook in sync within one tab
// (the native `storage` event only fires in *other* tabs).
export const FAVORITES_EVENT = 'cebindegaleri:favorites'
// Hard cap so a runaway loop or odd usage can never bloat localStorage.
export const FAVORITES_MAX = 50

// We store pre-localized display strings (priceLabel, fuelLabel, …) rather than
// raw values, so the tray/compare view can render without re-deriving locale
// formatting or refetching the vehicle. The locale is whatever the visitor used
// when they saved it — good enough; switching language later keeps saved labels.
export type SavedVehicle = {
  id: string
  title: string
  href: string
  image: string | null
  priceLabel: string
  yearLabel: string
  mileageLabel: string
  fuelLabel: string
  transmissionLabel: string
  bodyType: string
  savedAt: number
}

export type SavedVehicleInput = Omit<SavedVehicle, 'savedAt'>

export function isValidSavedVehicle(value: unknown): value is SavedVehicle {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.title === 'string' &&
    typeof v.href === 'string' &&
    (v.image === null || typeof v.image === 'string') &&
    typeof v.priceLabel === 'string' &&
    typeof v.savedAt === 'number'
  )
}

export type FavoritesLabels = {
  open: string
  addAria: string
  removeAria: string
  empty: string
  emptyHint: string
  list: string
  compare: string
  clear: string
  detail: string
  price: string
  year: string
  mileage: string
  fuel: string
  transmission: string
  body: string
}

export const FAVORITES_I18N: Record<PublicLocale, FavoritesLabels> = {
  tr: {
    open: 'Favorilerim',
    addAria: 'Favorilere ekle',
    removeAria: 'Favorilerden çıkar',
    empty: 'Henüz favori araç yok',
    emptyHint: 'Beğendiğiniz araçlardaki kalbe dokunun.',
    list: 'Liste',
    compare: 'Karşılaştır',
    clear: 'Tümünü temizle',
    detail: 'İncele',
    price: 'Fiyat',
    year: 'Yıl',
    mileage: 'KM',
    fuel: 'Yakıt',
    transmission: 'Vites',
    body: 'Kasa',
  },
  en: {
    open: 'My favourites',
    addAria: 'Add to favourites',
    removeAria: 'Remove from favourites',
    empty: 'No saved vehicles yet',
    emptyHint: 'Tap the heart on a vehicle you like.',
    list: 'List',
    compare: 'Compare',
    clear: 'Clear all',
    detail: 'View',
    price: 'Price',
    year: 'Year',
    mileage: 'Mileage',
    fuel: 'Fuel',
    transmission: 'Transmission',
    body: 'Body',
  },
  de: {
    open: 'Meine Favoriten',
    addAria: 'Zu Favoriten hinzufügen',
    removeAria: 'Aus Favoriten entfernen',
    empty: 'Noch keine Favoriten',
    emptyHint: 'Tippen Sie auf das Herz eines Fahrzeugs.',
    list: 'Liste',
    compare: 'Vergleichen',
    clear: 'Alle löschen',
    detail: 'Ansehen',
    price: 'Preis',
    year: 'Jahr',
    mileage: 'KM',
    fuel: 'Kraftstoff',
    transmission: 'Getriebe',
    body: 'Karosserie',
  },
  ru: {
    open: 'Избранное',
    addAria: 'В избранное',
    removeAria: 'Убрать из избранного',
    empty: 'Пока нет избранного',
    emptyHint: 'Нажмите на сердечко у понравившегося авто.',
    list: 'Список',
    compare: 'Сравнить',
    clear: 'Очистить всё',
    detail: 'Открыть',
    price: 'Цена',
    year: 'Год',
    mileage: 'Пробег',
    fuel: 'Топливо',
    transmission: 'КПП',
    body: 'Кузов',
  },
  ar: {
    open: 'المفضلة',
    addAria: 'أضف إلى المفضلة',
    removeAria: 'إزالة من المفضلة',
    empty: 'لا توجد سيارات محفوظة بعد',
    emptyHint: 'اضغط على القلب في السيارة التي تعجبك.',
    list: 'قائمة',
    compare: 'قارن',
    clear: 'مسح الكل',
    detail: 'عرض',
    price: 'السعر',
    year: 'السنة',
    mileage: 'كم',
    fuel: 'الوقود',
    transmission: 'ناقل الحركة',
    body: 'الهيكل',
  },
}
