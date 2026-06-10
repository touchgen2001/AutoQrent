"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Upload,
  Car,
  Info,
  Image as ImageIcon,
  FileText,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { VehicleImageQuotaCard } from "@/components/dashboard/vehicle-image-quota-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PanelVehicleImageQuotaResponse, PanelVehicleImageQuotaSnapshot } from "@/lib/panel-types"
import { parseVehicleIntegerFields, VEHICLE_INTEGER_LIMITS } from "@/lib/vehicle-limits"
import { ensureShareSafePhoto } from "@/lib/client/image-convert"

const brandSuggestions = [
  "Audi",
  "BMW",
  "Citroën",
  "Dacia",
  "Fiat",
  "Ford",
  "Honda",
  "Hyundai",
  "Kia",
  "Mercedes-Benz",
  "Nissan",
  "Opel",
  "Peugeot",
  "Renault",
  "Seat",
  "Škoda",
  "Toyota",
  "Volkswagen",
  "Volvo",
]
const fuelTypes = ["Benzin", "Dizel", "Hibrit", "Elektrik", "LPG"]
const transmissionTypes = ["Otomatik", "Manuel", "Yarı Otomatik"]
const colors = ["Siyah", "Beyaz", "Gri", "Gümüş", "Lacivert", "Kırmızı", "Mavi", "Yeşil", "Kahverengi", "Bej"]
const bodyTypes = ["Sedan", "Hatchback", "SUV", "Station Wagon", "Coupe", "Cabrio", "Pickup", "Panelvan"]
const currentYear = new Date().getFullYear()
const MAX_TOTAL_IMAGES = 30

type UploadedImage = {
  id: string
  path: string
  publicUrl: string
  name: string
  size: number
}

type ImageUploadApiResponse =
  | {
      ok: true
      source: "supabase"
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

export default function AddVehiclePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [imageQuota, setImageQuota] = useState<PanelVehicleImageQuotaSnapshot | null>(null)
  const [isImageQuotaLoading, setIsImageQuotaLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    variant: "",
    year: "",
    price: "",
    mileage: "",
    fuel: "",
    transmission: "",
    color: "",
    bodyType: "",
    engineSize: "",
    horsePower: "",
    plateNumber: "",
    hasDamage: "no",
    damageDetails: "",
    previousOwners: "1",
    serviceHistory: "yes",
    warrantyStatus: "no",
    description: "",
  })

  const handleSubmit = async () => {
    if (isLoading) return

    if (
      !formData.brand.trim() ||
      !formData.model.trim() ||
      !formData.year ||
      !formData.price ||
      !formData.mileage ||
      !formData.fuel ||
      !formData.transmission ||
      !formData.color
    ) {
      setSubmitError('Lütfen zorunlu alanları (yıldızlı) tamamlayın.')
      return
    }
    const parsedNumbers = parseVehicleIntegerFields({
      year: formData.year,
      price: formData.price,
      mileage: formData.mileage,
    })

    if (!parsedNumbers.ok) {
      setSubmitError(parsedNumbers.message)
      return
    }

    setIsLoading(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/panel/vehicles', {
        method: 'POST',
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
          photos: uploadedImages.map((image) => image.publicUrl),
        }),
      })

      const data = (await response.json()) as {
        ok?: boolean
        message?: string
        item?: { id: string }
      }

      if (!response.ok || !data.ok) {
        setSubmitError(data.message ?? 'Araç kaydedilemedi.')
        return
      }

      router.push("/panel/araclar")
    } catch {
      setSubmitError('Ağ hatası nedeniyle araç kaydedilemedi.')
    } finally {
      setIsLoading(false)
    }
  }

  const openImagePicker = () => {
    fileInputRef.current?.click()
  }

  const fetchImageQuota = useCallback(async () => {
    setIsImageQuotaLoading(true)
    try {
      const response = await fetch("/api/panel/uploads/vehicle-images/quota", { cache: "no-store" })
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

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return

    if (uploadedImages.length + files.length > MAX_TOTAL_IMAGES) {
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
        payload.append("files", file)
      }

      const response = await fetch("/api/panel/uploads/vehicle-images", {
        method: "POST",
        body: payload,
      })
      const data = (await response.json()) as ImageUploadApiResponse

      if (!response.ok || !data.ok) {
        setImageError(("message" in data && data.message) || "Fotoğraflar yüklenemedi.")
        return
      }

      setUploadedImages((previous) => [
        ...previous,
        ...data.items.map((item) => ({
          id: item.path,
          path: item.path,
          publicUrl: item.publicUrl,
          name: item.name,
          size: item.size,
        })),
      ])
      void fetchImageQuota()
      setImageError(null)
    } catch {
      setImageError("Ağ hatası nedeniyle fotoğraflar yüklenemedi.")
    } finally {
      setIsUploadingImages(false)
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    event.target.value = ""
    void uploadFiles(files)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files || [])
    void uploadFiles(files)
  }

  const removeImage = async (index: number) => {
    setImageError(null)
    const image = uploadedImages[index]
    if (!image) return

    setUploadedImages((previous) => previous.filter((_, i) => i !== index))

    try {
      const response = await fetch("/api/panel/uploads/vehicle-images", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          paths: [image.path],
        }),
      })

      const data = (await response.json()) as { ok?: boolean; message?: string }
      if (!response.ok || !data.ok) {
        setUploadedImages((previous) => {
          if (previous.some((item) => item.id === image.id)) return previous
          return [...previous.slice(0, index), image, ...previous.slice(index)]
        })
        setImageError(data.message ?? "Fotoğraf silinemedi.")
      } else {
        void fetchImageQuota()
      }
    } catch {
      setUploadedImages((previous) => {
        if (previous.some((item) => item.id === image.id)) return previous
        return [...previous.slice(0, index), image, ...previous.slice(index)]
      })
      setImageError("Ağ hatası nedeniyle fotoğraf silinemedi.")
    }
  }

  // Promote any photo to the cover slot (index 0 = cover everywhere).
  const makeCover = (index: number) => {
    if (index <= 0) return
    setUploadedImages((previous) => {
      if (index >= previous.length) return previous
      const next = [...previous]
      const [picked] = next.splice(index, 1)
      next.unshift(picked)
      return next
    })
  }

  const saveButton = (
    <Button
      onClick={() => void handleSubmit()}
      className="bg-accent hover:bg-accent/90 text-accent-foreground"
      disabled={isLoading || isUploadingImages}
    >
      {isLoading ? "Kaydediliyor..." : "Aracı Kaydet"}
      <Check className="w-4 h-4 ml-2" />
    </Button>
  )

  // Live "as the customer sees it" preview — one place where the photo + all the
  // key fields come together while the dealer fills the (otherwise long) form.
  const previewTitle = [formData.brand, formData.model, formData.variant]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ")
  const previewPriceDigits = formData.price.replace(/\D/g, "")
  const previewPrice = previewPriceDigits ? `${Number(previewPriceDigits).toLocaleString("tr-TR")} TL` : ""
  const previewKm = formData.mileage.replace(/\D/g, "")
  const previewSpecs = [
    formData.year,
    previewKm ? `${Number(previewKm).toLocaleString("tr-TR")} km` : "",
    formData.fuel,
    formData.transmission,
  ].filter(Boolean)
  const coverImage = uploadedImages[0]

  const previewCard = (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-sm font-semibold text-foreground">Önizleme</p>
        <p className="text-xs text-muted-foreground">Müşteri ilanı böyle görecek</p>
      </div>
      <div className="relative aspect-[4/3] bg-muted">
        {coverImage ? (
          <Image src={coverImage.publicUrl} alt={previewTitle || "Araç"} fill sizes="360px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Car className="h-8 w-8" />
            <span className="text-xs">Henüz fotoğraf eklenmedi</span>
          </div>
        )}
        {uploadedImages.length > 0 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">
            {uploadedImages.length} fotoğraf
          </span>
        )}
      </div>
      <CardContent className="space-y-2 p-4">
        <p className="truncate text-base font-semibold text-foreground">
          {previewTitle || <span className="text-muted-foreground">Marka ve model</span>}
        </p>
        <p className="text-lg font-bold text-accent">
          {previewPrice || <span className="text-sm font-medium text-muted-foreground">Fiyat girilmedi</span>}
        </p>
        {previewSpecs.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {previewSpecs.map((spec) => (
              <span key={spec} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {spec}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Detaylar doldukça burada görünecek.</p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/panel/araclar"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Araçlara Dön
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Yeni Araç Ekle</h1>
          <p className="text-muted-foreground">Tüm bilgileri tek sayfada doldurun, alt taraftan kaydedin.</p>
        </div>
        <div className="hidden sm:block">{saveButton}</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        {/* Sol sütun — form */}
        <div className="min-w-0 space-y-6">

      {/* Temel Bilgiler */}
      <Card>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Car className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Temel Bilgiler</h2>
              <p className="text-sm text-muted-foreground">Marka, model, yıl ve fiyat</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marka *</Label>
              <Input
                id="brand"
                list="brand-options"
                placeholder="Örn: BMW (yazabilir veya seçebilirsiniz)"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
              <datalist id="brand-options">
                {brandSuggestions.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                placeholder="Örn: 3 Serisi"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variant">Versiyon</Label>
              <Input
                id="variant"
                placeholder="Örn: 320i M Sport"
                value={formData.variant}
                onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Model Yılı *</Label>
              <Select
                value={formData.year}
                onValueChange={(value) => setFormData({ ...formData, year: value })}
              >
                <SelectTrigger id="year">
                  <SelectValue placeholder="Yıl seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 30 }, (_, i) => currentYear - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="price">Fiyat (TL) *</Label>
              <Input
                id="price"
                type="number"
                min={VEHICLE_INTEGER_LIMITS.price.min}
                max={VEHICLE_INTEGER_LIMITS.price.max}
                step={1}
                inputMode="numeric"
                placeholder="Örn: 2450000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Araç Detayları */}
      <Card>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Info className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Araç Detayları</h2>
              <p className="text-sm text-muted-foreground">Teknik özellikler ve ek bilgiler</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mileage">Kilometre *</Label>
              <Input
                id="mileage"
                type="number"
                min={VEHICLE_INTEGER_LIMITS.mileage.min}
                max={VEHICLE_INTEGER_LIMITS.mileage.max}
                step={1}
                inputMode="numeric"
                placeholder="Örn: 45000"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel">Yakıt Tipi *</Label>
              <Select
                value={formData.fuel}
                onValueChange={(value) => setFormData({ ...formData, fuel: value })}
              >
                <SelectTrigger id="fuel">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {fuelTypes.map((fuel) => (
                    <SelectItem key={fuel} value={fuel}>{fuel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transmission">Vites Tipi *</Label>
              <Select
                value={formData.transmission}
                onValueChange={(value) => setFormData({ ...formData, transmission: value })}
              >
                <SelectTrigger id="transmission">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {transmissionTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Renk *</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger id="color">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((color) => (
                    <SelectItem key={color} value={color}>{color}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyType">Kasa Tipi</Label>
              <Select
                value={formData.bodyType}
                onValueChange={(value) => setFormData({ ...formData, bodyType: value })}
              >
                <SelectTrigger id="bodyType">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {bodyTypes.map((bodyType) => (
                    <SelectItem key={bodyType} value={bodyType}>{bodyType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="engineSize">Motor Hacmi (cc)</Label>
              <Input
                id="engineSize"
                placeholder="Örn: 2000"
                value={formData.engineSize}
                onChange={(e) => setFormData({ ...formData, engineSize: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horsePower">Beygir Gücü (HP)</Label>
              <Input
                id="horsePower"
                placeholder="Örn: 184"
                value={formData.horsePower}
                onChange={(e) => setFormData({ ...formData, horsePower: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plateNumber">Plaka (Opsiyonel)</Label>
              <Input
                id="plateNumber"
                placeholder="Örn: 34 ABC 123"
                value={formData.plateNumber}
                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Plaka bilgisi sadece yönetim panelinde görünür</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fotoğraflar */}
      <Card>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Araç Fotoğrafları</h2>
              <p className="text-sm text-muted-foreground">Opsiyonel. İlk yüklediğiniz görsel kapak fotoğrafı olur.</p>
            </div>
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
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
            onClick={openImagePicker}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Fotoğraf yüklemek için tıklayın</p>
            <p className="text-sm text-muted-foreground mt-1">veya sürükleyip bırakın</p>
            <p className="text-xs text-muted-foreground mt-2">
              Fotoğraf yüklemek opsiyoneldir; aracı fotoğrafsız da kaydedebilir, sonradan düzenleyip ekleyebilirsiniz.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG veya WEBP (en fazla 10MB). Her fotoğraf yükleme öncesi güvenlik taramasından geçer.
            </p>
            {isUploadingImages && (
              <p className="text-xs text-accent mt-2">Fotoğraflar doğrulanıyor ve yükleniyor...</p>
            )}
          </div>

          {imageError && (
            <p className="text-sm text-destructive">{imageError}</p>
          )}

          {uploadedImages.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Fotoğrafsız ilanlar paylaşımda zayıf görünür. WhatsApp ve sosyal medyada gerçek araç fotoğrafı
                en çok dikkat çeken görseldir; en az 1 fotoğraf eklemenizi öneririz. İlk fotoğraf hem kapak
                hem de paylaşım görseli olur.
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Yüklenen: {uploadedImages.length} / {MAX_TOTAL_IMAGES}
          </div>

          {(uploadedImages.length > 0 || isUploadingImages) && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {uploadedImages.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted ring-1 ring-border"
                >
                  <Image
                    src={image.publicUrl}
                    alt={image.name || `Araç fotoğrafı ${index + 1}`}
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
                      onClick={(event) => {
                        event.stopPropagation()
                        makeCover(index)
                      }}
                      className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      Kapak yap
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      void removeImage(index)
                    }}
                    aria-label="Fotoğrafı kaldır"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {isUploadingImages && (
                <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted ring-1 ring-border">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-accent" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ekspertiz */}
      <Card>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Ekspertiz Bilgileri</h2>
              <p className="text-sm text-muted-foreground">Araç geçmişi ve durum bilgileri</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hasar Kaydı</Label>
              <Select
                value={formData.hasDamage}
                onValueChange={(value) => setFormData({ ...formData, hasDamage: value })}
              >
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
              <Select
                value={formData.previousOwners}
                onValueChange={(value) => setFormData({ ...formData, previousOwners: value })}
              >
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
              <Select
                value={formData.serviceHistory}
                onValueChange={(value) => setFormData({ ...formData, serviceHistory: value })}
              >
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
              <Select
                value={formData.warrantyStatus}
                onValueChange={(value) => setFormData({ ...formData, warrantyStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Garanti kapsamında</SelectItem>
                  <SelectItem value="no">Garanti dışı</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.hasDamage === "yes" && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="damageDetails">Hasar Detayları</Label>
                <Textarea
                  id="damageDetails"
                  placeholder="Hasar detaylarını açıklayın..."
                  value={formData.damageDetails}
                  onChange={(e) => setFormData({ ...formData, damageDetails: e.target.value })}
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Araç Açıklaması</Label>
              <Textarea
                id="description"
                placeholder="Araç hakkında ek bilgiler, özellikler, notlar..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {submitError && (
          <p className="text-sm text-destructive sm:mr-auto">{submitError}</p>
        )}
        <Button asChild variant="outline">
          <Link href="/panel/araclar">Vazgeç</Link>
        </Button>
        {saveButton}
      </div>
        </div>

        {/* Sağ sütun — canlı önizleme */}
        <aside className="space-y-4 xl:sticky xl:top-6">
          {previewCard}
        </aside>
      </div>
    </div>
  )
}
