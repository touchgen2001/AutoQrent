'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PanelVehicle } from '@/lib/panel-types'

type VehicleDetailApiResponse =
  | {
      ok: true
      source: 'supabase'
      item: PanelVehicle
    }
  | {
      ok: false
      message?: string
    }

const fuelTypes = ['Benzin', 'Dizel', 'Hibrit', 'Elektrik', 'LPG']
const transmissionTypes = ['Otomatik', 'Manuel', 'Yarı Otomatik']
const colors = ['Siyah', 'Beyaz', 'Gri', 'Gümüş', 'Lacivert', 'Kırmızı', 'Mavi', 'Yeşil', 'Kahverengi', 'Bej']

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
  }
}

export default function EditVehiclePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const vehicleId = typeof params?.id === 'string' ? params.id : ''
  const hasVehicleId = vehicleId.length > 0

  const [formData, setFormData] = useState<VehicleFormState>(emptyForm)
  const [isLoading, setIsLoading] = useState(hasVehicleId)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasVehicleId ? null : 'Araç kimliği bulunamadı.',
  )

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
          setErrorMessage(('message' in data && data.message) || 'Araç detayı alınamadı.')
          return
        }

        setFormData(toFormState(data.item))
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
          year: Number(formData.year),
          price: Number(formData.price),
          mileage: Number(formData.mileage),
          fuel: formData.fuel,
          transmission: formData.transmission,
          color: formData.color,
          description: formData.description,
        }),
      })

      const data = (await response.json()) as VehicleDetailApiResponse
      if (!response.ok || !data.ok) {
        setErrorMessage(('message' in data && data.message) || 'Araç güncellenemedi.')
        return
      }

      router.push(`/panel/araclar/${vehicleId}`)
    } catch {
      setErrorMessage('Ağ hatası nedeniyle araç güncellenemedi.')
    } finally {
      setIsSaving(false)
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
        <Button
          onClick={() => void handleSave()}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={isLoading || isSaving}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
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
                  value={formData.year}
                  onChange={(event) => setFormData((prev) => ({ ...prev, year: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Fiyat (TL) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mileage">Kilometre *</Label>
                <Input
                  id="mileage"
                  type="number"
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
