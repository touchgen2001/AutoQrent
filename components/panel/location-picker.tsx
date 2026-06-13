'use client'

import { useMemo, useState, type MouseEvent } from 'react'
import { LocateFixed, MapPin, Search, ZoomIn, ZoomOut } from 'lucide-react'

import { Button } from '@/components/ui/button'

type LocationPickerProps = {
  address: string
  city: string
  district: string
  latitude: string
  longitude: string
  onLocationChange: (latitude: number, longitude: number) => void
}

type GeocodeResponse = {
  ok?: boolean
  message?: string
  item?: {
    latitude: number
    longitude: number
    displayName: string
  }
}

const DEFAULT_CENTER = { latitude: 41.0082, longitude: 28.9784 }
const MAP_WIDTH = 768
const MAP_HEIGHT = 320
const TILE_SIZE = 256
const MIN_ZOOM = 5
const MAX_ZOOM = 18

function parseCoordinate(value: string, fallback: number) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function latLngToWorld(latitude: number, longitude: number, zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom
  const sinLatitude = Math.sin((clamp(latitude, -85.05112878, 85.05112878) * Math.PI) / 180)
  return {
    x: ((longitude + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * worldSize,
    worldSize,
  }
}

function worldToLatLng(x: number, y: number, zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom
  const longitude = (x / worldSize) * 360 - 180
  const mercator = Math.PI - (2 * Math.PI * y) / worldSize
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(mercator))
  return {
    latitude: clamp(latitude, -85.05112878, 85.05112878),
    longitude: ((longitude + 540) % 360) - 180,
  }
}

function buildTiles(latitude: number, longitude: number, zoom: number) {
  const center = latLngToWorld(latitude, longitude, zoom)
  const minTileX = Math.floor((center.x - MAP_WIDTH / 2) / TILE_SIZE)
  const maxTileX = Math.floor((center.x + MAP_WIDTH / 2) / TILE_SIZE)
  const minTileY = Math.floor((center.y - MAP_HEIGHT / 2) / TILE_SIZE)
  const maxTileY = Math.floor((center.y + MAP_HEIGHT / 2) / TILE_SIZE)
  const tileCount = 2 ** zoom
  const tiles: Array<{ key: string; x: number; y: number; left: number; top: number }> = []

  for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      if (tileY < 0 || tileY >= tileCount) continue
      const wrappedX = ((tileX % tileCount) + tileCount) % tileCount
      tiles.push({
        key: `${zoom}-${tileX}-${tileY}`,
        x: wrappedX,
        y: tileY,
        left: tileX * TILE_SIZE - center.x + MAP_WIDTH / 2,
        top: tileY * TILE_SIZE - center.y + MAP_HEIGHT / 2,
      })
    }
  }

  return { center, tiles }
}

export function LocationPicker({
  address,
  city,
  district,
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerProps) {
  const [zoom, setZoom] = useState(15)
  const [isResolvingAddress, setIsResolvingAddress] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedLatitude = parseCoordinate(latitude, DEFAULT_CENTER.latitude)
  const selectedLongitude = parseCoordinate(longitude, DEFAULT_CENTER.longitude)
  const hasSelectedLocation = Number.isFinite(Number.parseFloat(latitude)) && Number.isFinite(Number.parseFloat(longitude))
  const map = useMemo(
    () => buildTiles(selectedLatitude, selectedLongitude, zoom),
    [selectedLatitude, selectedLongitude, zoom],
  )

  const setLocation = (nextLatitude: number, nextLongitude: number, nextMessage: string) => {
    onLocationChange(nextLatitude, nextLongitude)
    setMessage(nextMessage)
    setErrorMessage(null)
  }

  const resolveAddress = async () => {
    const query = [address, district, city, 'Türkiye'].map((part) => part.trim()).filter(Boolean).join(', ')
    if (query.length < 5) {
      setErrorMessage('Önce açık adres, ilçe veya il bilgisini girin.')
      return
    }

    setIsResolvingAddress(true)
    setMessage(null)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/public/geocode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await response.json().catch(() => null) as GeocodeResponse | null
      if (!response.ok || !data?.ok || !data.item) {
        setErrorMessage(data?.message || 'Adres haritada bulunamadı.')
        return
      }

      setLocation(data.item.latitude, data.item.longitude, 'Adres haritada bulundu. Noktayı kontrol edip kaydedin.')
      setZoom(17)
    } catch {
      setErrorMessage('Ağ hatası nedeniyle adres haritada bulunamadı.')
    } finally {
      setIsResolvingAddress(false)
    }
  }

  const useCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorMessage('Tarayıcınız konum servisini desteklemiyor.')
      return
    }

    setIsDetectingLocation(true)
    setMessage(null)
    setErrorMessage(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords.latitude, position.coords.longitude, 'Mevcut konum haritada seçildi.')
        setZoom(17)
        setIsDetectingLocation(false)
      },
      () => {
        setErrorMessage('Mevcut konum alınamadı. Tarayıcı konum iznini kontrol edin.')
        setIsDetectingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  const selectFromMap = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const xRatio = (event.clientX - rect.left) / rect.width
    const yRatio = (event.clientY - rect.top) / rect.height
    const worldX = map.center.x + (xRatio - 0.5) * MAP_WIDTH
    const worldY = map.center.y + (yRatio - 0.5) * MAP_HEIGHT
    const selected = worldToLatLng(worldX, worldY, zoom)
    setLocation(selected.latitude, selected.longitude, 'Haritadan yeni konum seçildi.')
  }

  return (
    <div className='space-y-3 rounded-xl border border-border bg-muted/20 p-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-sm font-semibold text-foreground'>Dükkan Konumu</p>
          <p className='mt-1 text-xs leading-5 text-muted-foreground'>
            Adresi otomatik bulun veya harita üzerinde dükkanın bulunduğu noktaya tıklayın.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' size='sm' variant='outline' onClick={() => void resolveAddress()} disabled={isResolvingAddress}>
            <Search className='h-4 w-4' />
            {isResolvingAddress ? 'Adres aranıyor...' : 'Adresten Bul'}
          </Button>
          <Button type='button' size='sm' variant='outline' onClick={useCurrentLocation} disabled={isDetectingLocation}>
            <LocateFixed className='h-4 w-4' />
            {isDetectingLocation ? 'Konum alınıyor...' : 'Mevcut Konum'}
          </Button>
        </div>
      </div>

      <div
        role='button'
        tabIndex={0}
        aria-label='Haritadan dükkan konumu seç'
        className='relative aspect-[12/5] min-h-64 cursor-crosshair overflow-hidden rounded-xl border border-border bg-sky-50'
        onClick={selectFromMap}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setLocation(selectedLatitude, selectedLongitude, 'Harita merkezindeki konum seçildi.')
          }
        }}
      >
        {map.tiles.map((tile) => (
          <div
            key={tile.key}
            className='pointer-events-none absolute bg-cover bg-center'
            style={{
              left: `${(tile.left / MAP_WIDTH) * 100}%`,
              top: `${(tile.top / MAP_HEIGHT) * 100}%`,
              width: `${(TILE_SIZE / MAP_WIDTH) * 100}%`,
              height: `${(TILE_SIZE / MAP_HEIGHT) * 100}%`,
              backgroundImage: `url("https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png")`,
            }}
          />
        ))}

        <div className='pointer-events-none absolute inset-0 bg-black/[0.02]' />
        <div className='pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full'>
          <MapPin className={`h-9 w-9 drop-shadow-md ${hasSelectedLocation ? 'fill-red-500 text-red-700' : 'fill-amber-400 text-amber-700'}`} />
        </div>
        <div className='absolute right-3 top-3 flex flex-col gap-1'>
          <Button
            type='button'
            size='icon-sm'
            variant='secondary'
            aria-label='Haritayı yakınlaştır'
            onClick={(event) => {
              event.stopPropagation()
              setZoom((current) => Math.min(MAX_ZOOM, current + 1))
            }}
          >
            <ZoomIn className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            size='icon-sm'
            variant='secondary'
            aria-label='Haritayı uzaklaştır'
            onClick={(event) => {
              event.stopPropagation()
              setZoom((current) => Math.max(MIN_ZOOM, current - 1))
            }}
          >
            <ZoomOut className='h-4 w-4' />
          </Button>
        </div>
        <a
          href='https://www.openstreetmap.org/copyright'
          target='_blank'
          rel='noreferrer'
          onClick={(event) => event.stopPropagation()}
          className='absolute bottom-1 right-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-slate-700'
        >
          © OpenStreetMap
        </a>
      </div>

      <div className='flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between'>
        <p className={errorMessage ? 'text-destructive' : 'text-muted-foreground'}>
          {errorMessage || message || (hasSelectedLocation ? 'Konum seçildi. Haritada düzeltmek için başka bir noktaya tıklayın.' : 'Henüz konum seçilmedi. Adresten bulun veya haritaya tıklayın.')}
        </p>
        {hasSelectedLocation && (
          <p className='font-medium text-foreground'>
            Seçilen nokta: {selectedLatitude.toFixed(5)}, {selectedLongitude.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  )
}
