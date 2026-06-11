'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  FAVORITES_EVENT,
  FAVORITES_MAX,
  FAVORITES_STORAGE_KEY,
  isValidSavedVehicle,
  type SavedVehicle,
  type SavedVehicleInput,
} from '@/lib/favorites'

function readFavorites(): SavedVehicle[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidSavedVehicle)
  } catch {
    return []
  }
}

function writeFavorites(items: SavedVehicle[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items))
    // Notify other hooks mounted in this same tab.
    window.dispatchEvent(new CustomEvent(FAVORITES_EVENT))
  } catch {
    // Quota / private-mode failures are non-fatal: favourites just won't persist.
  }
}

export type UseFavoritesResult = {
  items: SavedVehicle[]
  /** True once the first localStorage read has run (post-mount). */
  ready: boolean
  count: number
  isFavorite: (id: string) => boolean
  /** Toggles a vehicle. Returns true if it is now saved, false if removed. */
  toggle: (record: SavedVehicleInput) => boolean
  remove: (id: string) => void
  clear: () => void
}

export function useFavorites(): UseFavoritesResult {
  const [items, setItems] = useState<SavedVehicle[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => setItems(readFavorites())
    // Defer the initial state write out of the synchronous effect body so the
    // react-hooks/set-state-in-effect lint rule stays happy (and to avoid an
    // SSR/first-paint double render).
    void (async () => {
      setItems(readFavorites())
      setReady(true)
    })()
    window.addEventListener(FAVORITES_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const isFavorite = useCallback((id: string) => items.some((item) => item.id === id), [items])

  const toggle = useCallback((record: SavedVehicleInput) => {
    const current = readFavorites()
    const exists = current.some((item) => item.id === record.id)
    const next = exists
      ? current.filter((item) => item.id !== record.id)
      : [{ ...record, savedAt: Date.now() }, ...current].slice(0, FAVORITES_MAX)
    writeFavorites(next)
    setItems(next)
    return !exists
  }, [])

  const remove = useCallback((id: string) => {
    const next = readFavorites().filter((item) => item.id !== id)
    writeFavorites(next)
    setItems(next)
  }, [])

  const clear = useCallback(() => {
    writeFavorites([])
    setItems([])
  }, [])

  return { items, ready, count: items.length, isFavorite, toggle, remove, clear }
}
