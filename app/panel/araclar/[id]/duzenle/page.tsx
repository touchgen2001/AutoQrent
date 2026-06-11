'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ImageIcon, Info, Save, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { VehicleImageQuotaCard } from '@/components/dashboard/vehicle-image-quota-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  PanelVehicle,
  PanelVehicleImageQuotaResponse,
  PanelVehicleImageQuotaSnapshot,
} from '@/lib/panel-types'
import { parseVehicleIntegerFields, VEHICLE_INTEGER_LIMITS } from '@/lib/vehicle-limits'
import { ensureShareSafePhoto } from '@/lib/client/image-convert'
import {
  VehicleSocialImageDialog,
  toSocialImageVehicle,
  type SocialImageGallery,
} from '@/components/panel/vehicle-social-image-dialog'

type VehicleDetailApiResponse =
  | {
      ok: true
      source: 'supabase'
      item: PanelVehicle
    }

type ImageUploadApiResponse =
  | {
      ok: true
      source: 'supabase'
      items: Array<{
        assetId?: string
        path: string
        publicUrl: string
        name: string
        size: number
        mimeType: string
      }>
      quota?: {
        dailyRemaining: number
        totalRemaining: number
      }
    }
  | {
      ok: false
      message?: string
    }

type ImageQuotaApiResponse = PanelVehicleImageQuotaResponse | {
  ok: false
  message?: string
}
  | {
      ok: false
      message?: string
    }

const fuelTypes = ['Benzin', 'Dizel', 'Hibrit', 'Elektrik', 'LPG']
const transmissionTypes = ['Otomatik', 'Manuel', 'Yarı Otomatik']
const colors = ['Siyah', 'Beyaz', 'Gri', 'Gümüş', 'Lacivert', 'Kırmızı', 'Mavi', 'Yeşil', 'Kahverengi', 'Bej']
const bodyTypes = ['Sedan', 'Hatchback', 'SUV', 'Station Wagon', 'Coupe', 'Cabrio', 'Pickup', 'Panelvan']
const MAX_TOTAL_IMAGES = 30

type VehicleFormState = {
  brand: string
  model: string
  variant: string
  year: string
  price: string
  mileage: string
  fuel: string
  transmission: string
  color: string
  bodyType: string
  engineSize: string
  horsePower: string
  plateNumber: string
  hasDamage: string
  damageDetails: string
  previousOwners: string
  serviceHistory: string
  warrantyStatus: string
  description: string
  photos: string[]
}

const emptyForm: VehicleFormState = {
  brand: '',
  model: '',
  variant: '',
  year: '',
  price: '',
  mileage: '',
  fuel: '',
  transmission: '',
  color: '',
  bodyType: '',
  engineSize: '',
  horsePower: '',
  plateNumber: '',
  hasDamage: 'no',
  damageDetails: '',
  previousOwners: '1',
  serviceHistory: 'no',
  warrantyStatus: 'no',
  description: '',
  photos: [],
}

function toFormState(vehicle: PanelVehicle): VehicleFormState {
  return {
    brand: vehicle.brand,
    model: vehicle.model,
    variant: vehicle.variant || '',
    year: String(vehicle.year),
    price: String(vehicle.price),
    mileage: String(vehicle.mileage),
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    color: vehicle.color || '',
    bodyType: vehicle.bodyType || '',
    engineSize: vehicle.engineSize || '',
    horsePower: vehicle.horsePower || '',
    plateNumber: vehicle.plateNumber || '',
    hasDamage: vehicle.hasDamage || 'no',
    damageDetails: vehicle.damageDetails || '',
    previousOwners: vehicle.previousOwners || '1',
    serviceHistory: vehicle.serviceHistory || 'no',
    warrantyStatus: vehicle.warrantyStatus || 'no',
    description: vehicle.description || '',
    photos: vehicle.photos,
  }
}

function vehicleApiMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

export default function EditVehiclePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const vehicleId = typeof params?.id === 'string' ? params.id : ''
  const hasVehicleId = vehicleId.length > 0

  const [formData, setFormData] = useState<VehicleFormState>(emptyForm)
  const [isLoading, setIsLoading] = useState(hasVehicleId)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageQuota, setImageQuota] = useState<PanelVehicleImageQuotaSnapshot | null>(null)
  const [isImageQuotaLoading, setIsImageQuotaLoading] = useState(true)
  const [stagedPhotoPaths, setStagedPhotoPaths] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasVehicleId ? null : 'Araç kimliği bulunamadı.',
  )
  const [gallery, setGallery] = useState<SocialImageGallery>(null)
  const [isSocialOpen, setIsSocialOpen] = useState(false)
  const [shareInfo, setShareInfo] = useState<{
    routeId: string
    publicUrl: string
    status: string | null
    createdAt: string | null
    priceDroppedAt: string | null
    previousPrice: number | null
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!vehicleId) return

    const controller = new AbortController()

    const fetchVehicle = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch(`/api/panel/vehicles/${vehicleId}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const data = (await response.json()) as VehicleDetailApiResponse

        if (!response.ok || !data.ok) {
          setErrorMessage(vehicleApiMessage(data, 'Araç detayı alınamadı.'))
          return
        }

        setFormData(toFormState(data.item))
        setShareInfo({
          routeId: data.item.routeId,
          publicUrl: data.item.publicUrl,
          status: data.item.status ?? null,
          createdAt: data.item.createdAt ?? null,
          priceDroppedAt: data.item.priceDroppedAt ?? null,
          previousPrice: data.item.previousPrice ?? null,
        })
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setErrorMessage('Ağ hatası nedeniyle araç detayı alınamadı.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchVehicle()

    return () => {
      controller.abort()
    }
  }, [vehicleId])

  const fetchImageQuota = useCallback(async () => {
    setIsImageQuotaLoading(true)
    try {
      const response = await fetch('/api/panel/uploads/vehicle-images/quota', { cache: 'no-store' })
      const data = (await response.json()) as ImageQuotaApiResponse
      if (response.ok && data.ok) {
        setImageQuota(data.quota)
      }
    } catch {
      setImageQuota(null)
    } finally {
      setIsImageQuotaLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchImageQuota()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [fetchImageQuota])

  // Lightweight gallery identity for the social-image dialog (logo/monogram +
  // showroom link). Failures are silent — the dialog still renders without it.
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch('/api/panel/gallery-identity', { cache: 'no-store' })
        const data = (await response.json()) as { ok?: boolean; gallery?: SocialImageGallery }
        if (active && response.ok && data.ok) {
          setGallery(data.gallery ?? null)
        }
      } catch {
        // ignore — dialog falls back to a logo-less card
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const pageTitle = useMemo(() => {
    if (!formData.brand && !formData.model) return 'Araç Düzenle'
    return `${formData.brand} ${formData.model} Düzenle`
  }, [formData.brand, formData.model])

  const handleSave = async () => {
    if (!vehicleId || isSaving) return

    if (
      !formData.brand.trim()
      || !formData.model.trim()
      || !formData.year.trim()
      || !formData.price.trim()
      || !formData.mileage.trim()
      || !formData.fuel.trim()
      || !formData.transmission.trim()
    ) {
      setErrorMessage('Lütfen zorunlu alanları tamamlayın.')
      return
    }

    const parsedNumbers = parseVehicleIntegerFields({
      year: formData.year,
      price: formData.price,
      mileage: formData.mileage,
    })

    if (!parsedNumbers.ok) {
      setErrorMessage(parsedNumbers.message)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/panel/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          brand: formData.brand,
          model: formData.model,
          variant: formData.variant,
          year: parsedNumbers.values.year,
          price: parsedNumbers.values.price,
          mileage: parsedNumbers.values.mileage,
          fuel: formData.fuel,
          transmission: formData.transmission,
          color: formData.color,
          bodyType: formData.bodyType,
          engineSize: formData.engineSize,
          horsePower: formData.horsePower,
          plateNumber: formData.plateNumber,
          hasDamage: formData.hasDamage,
          damageDetails: formData.damageDetails,
          previousOwners: formData.previousOwners,
          serviceHistory: formData.serviceHistory,
          warrantyStatus: formData.warrantyStatus,
          description: formData.description,
          photos: formData.photos,
        }),
      })

      const data = (await response.json()) as VehicleDetailApiResponse
      if (!response.ok || !data.ok) {
        setErrorMessage(vehicleApiMessage(data, 'Araç güncellenemedi.'))
        return
      }

      router.push(`/panel/araclar/${vehicleId}`)
    } catch {
      setErrorMessage('Ağ hatası nedeniyle araç güncellenemedi.')
    } finally {
      setIsSaving(false)
    }
  }

  const openImagePicker = () => {
    fileInputRef.current?.click()
  }

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return

    if (formData.photos.length + files.length > MAX_TOTAL_IMAGES) {
      setImageError(`Maksimum ${MAX_TOTAL_IMAGES} fotoğraf yükleyebilirsiniz.`)
      return
    }

    if (imageQuota && files.length > imageQuota.maxFilesPerRequest) {
      setImageError(`Tek seferde en fazla ${imageQuota.maxFilesPerRequest} fotoğraf seçebilirsiniz.`)
      return
    }

    if (imageQuota && files.length > imageQuota.dailyRemaining) {
      setImageError(`Günlük fotoğraf yükleme hakkınız ${imageQuota.dailyRemaining}. Daha az fotoğraf seçin.`)
      return
    }

    if (imageQuota && files.length > imageQuota.totalRemaining) {
      setImageError(`Galeri arşivinde kalan aktif görsel hakkınız ${imageQuota.totalRemaining}.`)
      return
    }

    setIsUploadingImages(true)
    setImageError(null)

    try {
      // WebP photos can't be embedded in the social share card, so re-encode them
      // to JPEG before upload (PNG/JPEG pass through untouched, errors fall back to
      // the original file so the upload still succeeds).
      const preparedFiles = await Promise.all(files.map((file) => ensureShareSafePhoto(file)))
      const payload = new FormData()
      for (const file of preparedFiles) {
        payload.append('files', file)
      }

      const response = await fetch('/api/panel/uploads/vehicle-images', {
        method: 'POST',
        body: payload,
      })
      const data = (await response.json()) as ImageUploadApiResponse

      if (!response.ok || !data.ok) {
        setImageError(('message' in data && data.message) || 'Fotoğraflar yüklenemedi.')
        return
      }

      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...data.items.map((item) => item.publicUrl)],
      }))
      setStagedPhotoPaths((prev) => {
        const next = { ...prev }
        for (const item of data.items) {
          next[item.publicUrl] = item.path
        }
        return next
      })
      void fetchImageQuota()
    } catch {
      setImageError('Ağ hatası nedeniyle fotoğraflar yüklenemedi.')
    } finally {
      setIsUploadingImages(false)
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    event.target.value = ''
    void uploadFiles(files)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files || [])
    void uploadFiles(files)
  }

  const removePhoto = async (photo: string) => {
    setImageError(null)
    const stagedPath = stagedPhotoPaths[photo]

    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((item) => item !== photo),
    }))

    if (!stagedPath) return

    setStagedPhotoPaths((prev) => {
      const next = { ...prev }
      delete next[photo]
      return next
    })

    try {
      const response = await fetch('/api/panel/uploads/vehicle-images', {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          paths: [stagedPath],
        }),
      })
      const data = (await response.json()) as { ok?: boolean; message?: string }
      if (!response.ok || !data.ok) {
        setFormData((prev) => ({
          ...prev,
          photos: prev.photos.includes(photo) ? prev.photos : [...prev.photos, photo],
        }))
        setStagedPhotoPaths((prev) => ({ ...prev, [photo]: stagedPath }))
        setImageError(data.message ?? 'Fotoğraf silinemedi.')
        return
      }
      void fetchImageQuota()
    } catch {
      setFormData((prev) => ({
        ...prev,
        photos: prev.photos.includes(photo) ? prev.photos : [...prev.photos, photo],
      }))
      setStagedPhotoPaths((prev) => ({ ...prev, [photo]: stagedPath }))
      setImageError('Ağ hatası nedeniyle fotoğraf silinemedi.')
    }
  }

  const makeCover = (index: number) => {
    if (index <= 0) return
    setFormData((prev) => {
      if (index >= prev.photos.length) return prev
      const photos = [...prev.photos]
      const [picked] = photos.splice(index, 1)
      photos.unshift(picked)
      return { ...prev, photos }
    })
  }

  // Live "müşteri böyle görecek" preview — the listing as it will appear.
  const previewTitle = [formData.brand, formData.model, formData.variant]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ')
  const previewPriceDigits = formData.price.replace(/\D/g, '')
  const previewPrice = previewPriceDigits ? `${Number(previewPriceDigits).toLocaleString('tr-TR')} TL` : ''
  const previewKm = formData.mileage.replace(/\D/g, '')
  const previewSpecRows = [
    { label: 'Model Yılı', value: formData.year },
    { label: 'Kilometre', value: previewKm ? `${Number(previewKm).toLocaleString('tr-TR')} km` : '' },
    { label: 'Yakıt', value: formData.fuel },
    { label: 'Vites', value: formData.transmission },
    { label: 'Kasa Tipi', value: formData.bodyType },
    { label: 'Motor Hacmi', value: formData.engineSize },
    { label: 'Motor Gücü', value: formData.horsePower },
    { label: 'Renk', value: formData.color },
  ].filter((row) => row.value.trim().length > 0)
  const coverImage = formData.photos[0]

  const previewCard = (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-sm font-semibold text-foreground">Önizleme</p>
        <p className="text-xs text-muted-foreground">Müşteri ilanı böyle görecek</p>
      </div>
      <div className="relative aspect-[4/3] bg-muted">
        {coverImage ? (
          <Image src={coverImage} alt={previewTitle || 'Araç'} fill sizes="420px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Henüz fotoğraf eklenmedi</span>
          </div>
        )}
        {formData.photos.length > 0 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">
            {formData.photos.length} fotoğraf
          </span>
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="truncate text-lg font-semibold text-foreground">
            {previewTitle || <span className="text-muted-foreground">Marka ve model</span>}
          </p>
          <p className="mt-0.5 text-xl font-bold text-accent">
            {previewPrice || <span className="text-sm font-medium text-muted-foreground">Fiyat girilmedi</span>}
          </p>
        </div>
        {previewSpecRows.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border">
            {previewSpecRows.map((row, index) => (
              <div
                key={row.label}
                className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${index % 2 === 1 ? 'bg-muted/40' : ''}`}
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-right font-medium text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Detaylar doldukça burada özellik listesi oluşacak.</p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={vehicleId ? `/panel/araclar/${vehicleId}` : '/panel/araclar'}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Araç Detayına Dön
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSocialOpen(true)}
            disabled={isLoading}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Sosyal Görsel
          </Button>
          <Button
            onClick={() => void handleSave()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={isLoading || isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        {/* Sol sütun — form */}
        <div className="min-w-0 space-y-6">

      <Card>
        <CardContent className="p-6 md:p-8">
          {isLoading ? (
            <p className="text-muted-foreground">Araç bilgileri yükleniyor...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Marka *</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(event) => setFormData((prev) => ({ ...prev, brand: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(event) => setFormData((prev) => ({ ...prev, model: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variant">Versiyon</Label>
                <Input
                  id="variant"
                  value={formData.variant}
                  onChange={(event) => setFormData((prev) => ({ ...prev, variant: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Model Yılı *</Label>
                <Input
                  id="year"
                  type="number"
                  min={VEHICLE_INTEGER_LIMITS.year.min}
                  max={VEHICLE_INTEGER_LIMITS.year.max}
                  step={1}
                  inputMode="numeric"
                  value={formData.year}
                  onChange={(event) => setFormData((prev) => ({ ...prev, year: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Fiyat (TL) *</Label>
                <Input
                  id="price"
                  type="number"
                  min={VEHICLE_INTEGER_LIMITS.price.min}
                  max={VEHICLE_INTEGER_LIMITS.price.max}
                  step={1}
                  inputMode="numeric"
                  value={formData.price}
                  onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mileage">Kilometre *</Label>
                <Input
                  id="mileage"
                  type="number"
                  min={VEHICLE_INTEGER_LIMITS.mileage.min}
                  max={VEHICLE_INTEGER_LIMITS.mileage.max}
                  step={1}
                  inputMode="numeric"
                  value={formData.mileage}
                  onChange={(event) => setFormData((prev) => ({ ...prev, mileage: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel">Yakıt Tipi *</Label>
                <Select
                  value={formData.fuel}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, fuel: value }))}
                >
                  <SelectTrigger id="fuel">
                    <SelectValue placeholder="Yakıt tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map((fuel) => (
                      <SelectItem key={fuel} value={fuel}>
                        {fuel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transmission">Vites Tipi *</Label>
                <Select
                  value={formData.transmission}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, transmission: value }))}
                >
                  <SelectTrigger id="transmission">
                    <SelectValue placeholder="Vites tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {transmissionTypes.map((transmission) => (
                      <SelectItem key={transmission} value={transmission}>
                        {transmission}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Renk</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}
                >
                  <SelectTrigger id="color">
                    <SelectValue placeholder="Renk seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bodyType">Kasa Tipi</Label>
                <Select value={formData.bodyType} onValueChange={(value) => setFormData((prev) => ({ ...prev, bodyType: value }))}>
                  <SelectTrigger id="bodyType">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodyTypes.map((bodyType) => (
                      <SelectItem key={bodyType} value={bodyType}>
                        {bodyType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="engineSize">Motor Hacmi (cc)</Label>
                <Input
                  id="engineSize"
                  placeholder="Örn: 1600"
                  value={formData.engineSize}
                  onChange={(event) => setFormData((prev) => ({ ...prev, engineSize: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horsePower">Beygir Gücü (HP)</Label>
                <Input
                  id="horsePower"
                  placeholder="Örn: 184"
                  value={formData.horsePower}
                  onChange={(event) => setFormData((prev) => ({ ...prev, horsePower: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plateNumber">Plaka (Opsiyonel)</Label>
                <Input
                  id="plateNumber"
                  placeholder="Örn: 34 ABC 123"
                  value={formData.plateNumber}
                  onChange={(event) => setFormData((prev) => ({ ...prev, plateNumber: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Plaka bilgisi sadece yönetim panelinde görünür</p>
              </div>

              <div className="pt-2 md:col-span-2">
                <h3 className="text-sm font-semibold text-foreground">Ekspertiz Bilgileri</h3>
                <p className="text-xs text-muted-foreground">Araç geçmişi ve durum bilgileri</p>
              </div>
              <div className="space-y-2">
                <Label>Hasar Kaydı</Label>
                <Select value={formData.hasDamage} onValueChange={(value) => setFormData((prev) => ({ ...prev, hasDamage: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">Hasar kaydı yok</SelectItem>
                    <SelectItem value="yes">Hasar kaydı var</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Önceki Sahip Sayısı</Label>
                <Select value={formData.previousOwners} onValueChange={(value) => setFormData((prev) => ({ ...prev, previousOwners: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 (İlk sahibinden)</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4+">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Servis Bakım Geçmişi</Label>
                <Select value={formData.serviceHistory} onValueChange={(value) => setFormData((prev) => ({ ...prev, serviceHistory: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yetkili servis bakımlı</SelectItem>
                    <SelectItem value="partial">Kısmi kayıtlı</SelectItem>
                    <SelectItem value="no">Kayıt yok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Garanti Durumu</Label>
                <Select value={formData.warrantyStatus} onValueChange={(value) => setFormData((prev) => ({ ...prev, warrantyStatus: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Garanti kapsamında</SelectItem>
                    <SelectItem value="no">Garanti dışı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.hasDamage === 'yes' && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="damageDetails">Hasar Detayları</Label>
                  <Textarea
                    id="damageDetails"
                    rows={3}
                    placeholder="Hasar detaylarını açıklayın..."
                    value={formData.damageDetails}
                    onChange={(event) => setFormData((prev) => ({ ...prev, damageDetails: event.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>

              <div className="space-y-3 md:col-span-2">
                <div>
                  <Label>Kalıcı Fotoğraflar</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fotoğraflar araç kaydında kalır. Buradan kaldırıp kaydettiğinizde Storage’dan da silinir.
                  </p>
                </div>

                <VehicleImageQuotaCard quota={imageQuota} isLoading={isImageQuotaLoading} />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <div
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-accent/50"
                  onClick={openImagePicker}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Yeni fotoğraf eklemek için tıklayın</p>
                  <p className="mt-1 text-sm text-muted-foreground">veya sürükleyip bırakın</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    PNG, JPG veya WEBP. Dosyalar Storage’a yazılmadan önce güvenlik taramasından geçer.
                  </p>
                  {isUploadingImages && (
                    <p className="mt-2 text-xs text-accent">Fotoğraflar doğrulanıyor ve yükleniyor...</p>
                  )}
                </div>

                {imageError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {imageError}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Bu araçta seçili fotoğraf: {formData.photos.length} / {MAX_TOTAL_IMAGES}
                </div>

                {formData.photos.length === 0 && !isUploadingImages ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Bu araçta kayıtlı fotoğraf yok. Fotoğrafsız ilanlar paylaşımda zayıf görünür; WhatsApp ve
                      sosyal medyada gerçek araç fotoğrafı en çok dikkat çeken görseldir. En az 1 fotoğraf
                      eklemenizi öneririz. İlk fotoğraf hem kapak hem de paylaşım görseli olur.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {formData.photos.map((photo, index) => (
                      <div
                        key={photo}
                        className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted"
                      >
                        <Image
                          src={photo}
                          alt={`Araç fotoğrafı ${index + 1}`}
                          fill
                          sizes="(max-width: 640px) 50vw, 240px"
                          className="object-cover"
                        />
                        {index === 0 ? (
                          <span className="absolute left-2 top-2 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                            Kapak
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => makeCover(index)}
                            className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                          >
                            Kapak yap
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void removePhoto(photo)}
                          aria-label="Fotoğrafı kaldır"
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {isUploadingImages && (
                      <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-border bg-muted">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-accent" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </div>

        {/* Sağ sütun — canlı önizleme */}
        <aside className="space-y-4 xl:sticky xl:top-6">
          {previewCard}
        </aside>
      </div>

      <VehicleSocialImageDialog
        vehicle={toSocialImageVehicle({
          vehicleId,
          brand: formData.brand,
          model: formData.model,
          variant: formData.variant,
          year: Number(formData.year) || 0,
          mileage: Number(formData.mileage) || 0,
          fuel: formData.fuel,
          transmission: formData.transmission,
          price: Number(formData.price) || 0,
          image: formData.photos[0] ?? null,
          publicUrl: shareInfo?.publicUrl ?? '',
          status: shareInfo?.status ?? null,
          createdAt: shareInfo?.createdAt ?? null,
          priceDroppedAt: shareInfo?.priceDroppedAt ?? null,
          previousPrice: shareInfo?.previousPrice ?? null,
        })}
        gallery={gallery}
        open={isSocialOpen}
        onOpenChange={setIsSocialOpen}
        hideTrigger
      />
    </div>
  )
}
