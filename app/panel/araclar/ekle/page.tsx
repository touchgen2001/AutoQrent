"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Upload, 
  Car, 
  Info, 
  Image as ImageIcon,
  FileText,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const steps = [
  { id: 1, title: "Temel Bilgiler", icon: Car },
  { id: 2, title: "Detaylar", icon: Info },
  { id: 3, title: "Fotoğraflar", icon: ImageIcon },
  { id: 4, title: "Ekspertiz", icon: FileText },
]

const brands = ["BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Toyota", "Honda", "Ford", "Hyundai", "Kia", "Renault"]
const fuelTypes = ["Benzin", "Dizel", "Hibrit", "Elektrik", "LPG"]
const transmissionTypes = ["Otomatik", "Manuel", "Yarı Otomatik"]
const colors = ["Siyah", "Beyaz", "Gri", "Gümüş", "Lacivert", "Kırmızı", "Mavi", "Yeşil", "Kahverengi", "Bej"]

export default function AddVehiclePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    // Step 1 - Basic Info
    brand: "",
    model: "",
    variant: "",
    year: "",
    price: "",
    // Step 2 - Details
    mileage: "",
    fuel: "",
    transmission: "",
    color: "",
    bodyType: "",
    engineSize: "",
    horsePower: "",
    plateNumber: "",
    // Step 3 - Images handled separately
    // Step 4 - Expertise
    hasDamage: "no",
    damageDetails: "",
    previousOwners: "1",
    serviceHistory: "yes",
    warrantyStatus: "no",
    description: "",
  })

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    router.push("/panel/araclar")
  }

  const handleImageUpload = () => {
    // Simulate image upload
    setUploadedImages([
      ...uploadedImages, 
      `https://placeholder.co/400x300?text=Foto+${uploadedImages.length + 1}`
    ])
  }

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/panel/araclar" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Araçlara Dön
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Yeni Araç Ekle</h1>
        <p className="text-muted-foreground">Araç bilgilerini adım adım girin</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    currentStep > step.id 
                      ? 'bg-accent text-accent-foreground' 
                      : currentStep === step.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={cn(
                  "mt-2 text-xs font-medium hidden sm:block",
                  currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-full h-0.5 mx-2 sm:mx-4",
                  currentStep > step.id ? 'bg-accent' : 'bg-border'
                )} style={{ minWidth: '40px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="p-6 md:p-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Temel Bilgiler</h2>
                <p className="text-sm text-muted-foreground">Aracın marka, model ve fiyat bilgilerini girin</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marka *</Label>
                  <Select 
                    value={formData.brand} 
                    onValueChange={(value) => setFormData({ ...formData, brand: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Marka seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Yıl seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 30 }, (_, i) => 2024 - i).map((year) => (
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
                    placeholder="Örn: 2450000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Araç Detayları</h2>
                <p className="text-sm text-muted-foreground">Teknik özellikler ve ek bilgiler</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mileage">Kilometre *</Label>
                  <Input
                    id="mileage"
                    type="number"
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
                    <SelectTrigger>
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
                    <SelectTrigger>
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
                    <SelectTrigger>
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

                <div className="space-y-2 md:col-span-2">
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
            </div>
          )}

          {/* Step 3: Images */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Araç Fotoğrafları</h2>
                <p className="text-sm text-muted-foreground">En az 3 fotoğraf yükleyin. İlk fotoğraf kapak fotoğrafı olacak.</p>
              </div>

              {/* Upload Area */}
              <div 
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
                onClick={handleImageUpload}
              >
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">Fotoğraf yüklemek için tıklayın</p>
                <p className="text-sm text-muted-foreground mt-1">veya sürükleyip bırakın</p>
                <p className="text-xs text-muted-foreground mt-2">PNG, JPG (max. 10MB)</p>
              </div>

              {/* Uploaded Images */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Car className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      {index === 0 && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded">
                          Kapak
                        </span>
                      )}
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Expertise */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Ekspertiz Bilgileri</h2>
                <p className="text-sm text-muted-foreground">Araç geçmişi ve durum bilgilerini girin</p>
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
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>

            {currentStep < 4 ? (
              <Button onClick={handleNext} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Devam Et
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Kaydediliyor..." : "Aracı Kaydet"}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
