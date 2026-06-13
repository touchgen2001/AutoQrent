// Client-side "favourite vehicles" model. Visitors save vehicles to localStorage
// (no account needed) so they can revisit and compare cars side by side across
// galleries. Pure module — no React, no DOM — so it stays unit-testable; the
// React glue lives in lib/client/use-favorites.ts.
import type { PublicLocale } from '@/lib/public-i18n'

export const FAVORITES_STORAGE_KEY = 'cebindegaleri.favorites.v1'
// Custom event name used to keep every mounted hook in sync within one tab
// (the native `storage` event only fires in *other* tabs).
export const FAVORITES_EVENT = 'cebindegaleri:favorites'
// Custom event that asks the (single) FavoritesTray to open. Lets other
// entry points (e.g. a "Karşılaştır (N)" button in the showroom header) open
// the same sheet without lifting its state. detail: { mode?: 'list'|'compare' }.
export const FAVORITES_OPEN_EVENT = 'cebindegaleri:favorites:open'
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
  share: string
  shareIntro: string
  price: string
  year: string
  mileage: string
  fuel: string
  transmission: string
  body: string
  /** Social-proof suffix, e.g. "12 {social}" → "12 kişi favoriledi". */
  social: string
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
    share: 'Paylaş',
    shareIntro: 'Beğendiğim araçlar',
    price: 'Fiyat',
    year: 'Yıl',
    mileage: 'KM',
    fuel: 'Yakıt',
    transmission: 'Vites',
    body: 'Kasa',
    social: 'kişi favoriledi',
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
    share: 'Share',
    shareIntro: 'Vehicles I like',
    price: 'Price',
    year: 'Year',
    mileage: 'Mileage',
    fuel: 'Fuel',
    transmission: 'Transmission',
    body: 'Body',
    social: 'people favourited',
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
    share: 'Teilen',
    shareIntro: 'Fahrzeuge, die mir gefallen',
    price: 'Preis',
    year: 'Jahr',
    mileage: 'KM',
    fuel: 'Kraftstoff',
    transmission: 'Getriebe',
    body: 'Karosserie',
    social: 'Personen favorisiert',
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
    share: 'Поделиться',
    shareIntro: 'Понравившиеся авто',
    price: 'Цена',
    year: 'Год',
    mileage: 'Пробег',
    fuel: 'Топливо',
    transmission: 'КПП',
    body: 'Кузов',
    social: 'чел. в избранном',
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
    share: 'مشاركة',
    shareIntro: 'سيارات أعجبتني',
    price: 'السعر',
    year: 'السنة',
    mileage: 'كم',
    fuel: 'الوقود',
    transmission: 'ناقل الحركة',
    body: 'الهيكل',
    social: 'شخصًا أضافوها للمفضلة',
  },
}

// Labels for the vehicle-page "notify me when the price drops" opt-in.
export const PRICE_ALERT_I18N: Record<
  PublicLocale,
  { cta: string; done: string; denied: string; unsupported: string }
> = {
  tr: {
    cta: 'Fiyat düşünce haber ver',
    done: 'Tamam! Fiyat düşünce bildirim göndereceğiz',
    denied: 'Bildirim izni verilmedi',
    unsupported: 'Tarayıcınız bildirimi desteklemiyor',
  },
  en: {
    cta: 'Notify me on price drop',
    done: "Done! We'll notify you when the price drops",
    denied: 'Notification permission denied',
    unsupported: 'Your browser does not support notifications',
  },
  de: {
    cta: 'Bei Preissenkung benachrichtigen',
    done: 'Erledigt! Wir benachrichtigen Sie bei einer Preissenkung',
    denied: 'Benachrichtigung nicht erlaubt',
    unsupported: 'Ihr Browser unterstützt keine Benachrichtigungen',
  },
  ru: {
    cta: 'Сообщить о снижении цены',
    done: 'Готово! Сообщим, когда цена снизится',
    denied: 'Уведомления запрещены',
    unsupported: 'Браузер не поддерживает уведомления',
  },
  ar: {
    cta: 'أبلغني عند انخفاض السعر',
    done: 'تم! سنبلغك عند انخفاض السعر',
    denied: 'لم يُسمح بالإشعارات',
    unsupported: 'متصفحك لا يدعم الإشعارات',
  },
}

