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
    createdAt: string | null
    priceDroppedAt: string | null
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
          createdAt: data.item.createdAt ?? null,
          priceDroppedAt: data.item.priceDroppedAt ?? null,
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

                {formData.photos.length === 0 ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Bu araçta kayıtlı fotoğraf yok. Fotoğrafsız ilanlar paylaşımda zayıf görünür; WhatsApp ve
                      sosyal medyada gerçek araç fotoğrafı en çok dikkat çeken görseldir. En az 1 fotoğraf
                      eklemenizi öneririz. İlk fotoğraf hem kapak hem de paylaşım görseli olur.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {formData.photos.map((photo, index) => (
                      <div key={photo} className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                        <Image
                          src={photo}
                          alt={`Araç fotoğrafı ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />
                        {index === 0 && (
                          <span className="absolute left-2 top-2 rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                            Kapak
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void removePhoto(photo)}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                          aria-label="Fotoğrafı kaldır"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <VehicleSocialImageDialog
        vehicle={toSocialImageVehicle({
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
          createdAt: shareInfo?.createdAt ?? null,
          priceDroppedAt: shareInfo?.priceDroppedAt ?? null,
        })}
        gallery={gallery}
        open={isSocialOpen}
        onOpenChange={setIsSocialOpen}
        hideTrigger
      />
    </div>
  )
}
