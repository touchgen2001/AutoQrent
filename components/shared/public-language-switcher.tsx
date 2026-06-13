'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Languages } from 'lucide-react'

import {
  getPublicTranslation,
  isPublicLocaleRtl,
  pickPublicLocale,
  PUBLIC_LOCALE_LABELS,
  PUBLIC_LOCALE_SHORT_LABELS,
  PUBLIC_LOCALE_STORAGE_KEY,
  PUBLIC_LOCALES,
  type PublicI18nKey,
  type PublicLocale,
} from '@/lib/public-i18n'
import { cn } from '@/lib/utils'

function getInitialPublicLocale() {
  if (typeof window === 'undefined') return 'tr'

  try {
    const stored = window.localStorage.getItem(PUBLIC_LOCALE_STORAGE_KEY)
    if (stored) return pickPublicLocale([stored])
  } catch {
    // Ignore storage access issues and fall back to browser language.
  }

  return pickPublicLocale(navigator.languages?.length ? navigator.languages : [navigator.language])
}

export function usePublicLocale() {
  const [locale, setLocaleState] = useState<PublicLocale>('tr')

  useEffect(() => {
    const timer = window.setTimeout(() => setLocaleState(getInitialPublicLocale()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = isPublicLocaleRtl(locale) ? 'rtl' : 'ltr'

    return () => {
      document.documentElement.lang = 'tr'
      document.documentElement.dir = 'ltr'
    }
  }, [locale])

  const setLocale = useCallback((nextLocale: PublicLocale) => {
    setLocaleState(nextLocale)
    try {
      window.localStorage.setItem(PUBLIC_LOCALE_STORAGE_KEY, nextLocale)
    } catch {
      // Locale choice still works for the current page even if storage is blocked.
    }
  }, [])

  const t = useCallback((key: PublicI18nKey) => getPublicTranslation(locale, key), [locale])
  const dir = useMemo(() => (isPublicLocaleRtl(locale) ? 'rtl' : 'ltr'), [locale])

  return { locale, setLocale, t, dir }
}

type PublicLanguageSwitcherProps = {
  locale: PublicLocale
  onLocaleChange: (locale: PublicLocale) => void
  label: string
  className?: string
  tone?: 'light' | 'dark'
}

export function PublicLanguageSwitcher({
  locale,
  onLocaleChange,
  label,
  className,
  tone = 'light',
}: PublicLanguageSwitcherProps) {
  const isDark = tone === 'dark'

  return (
    <label
      className={cn(
        'inline-flex h-10 min-w-0 items-center gap-2 rounded-full border px-3 text-sm font-bold shadow-sm backdrop-blur',
        isDark
          ? 'border-white/15 bg-white/10 text-white'
          : 'border-black/10 bg-white/90 text-neutral-950',
        className,
      )}
      title={label}
    >
      <Languages className="size-4 shrink-0" />
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(event) => onLocaleChange(event.target.value as PublicLocale)}
        aria-label={label}
        className={cn(
          'min-w-0 cursor-pointer appearance-none bg-transparent text-xs font-black outline-none',
          isDark ? 'text-white' : 'text-neutral-950',
        )}
      >
        {PUBLIC_LOCALES.map((option) => (
          <option key={option} value={option}>
            {PUBLIC_LOCALE_SHORT_LABELS[option]} - {PUBLIC_LOCALE_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  )
}
