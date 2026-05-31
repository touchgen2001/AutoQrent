"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { QrCode, Upload, MapPin, Phone, Clock, Check, ArrowRight, ArrowLeft } from "lucide-react"

const steps = [
  { id: 1, title: "Galeri Bilgileri", icon: QrCode },
  { id: 2, title: "İletişim", icon: Phone },
  { id: 3, title: "Konum", icon: MapPin },
  { id: 4, title: "Çalışma Saatleri", icon: Clock },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Step 1
    galleryName: "",
    description: "",
    logo: null as File | null,
    // Step 2
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    // Step 3
    address: "",
    city: "",
    district: "",
    // Step 4
    workingHours: {
      weekdays: { start: "09:00", end: "19:00" },
      saturday: { start: "09:00", end: "17:00" },
      sunday: { closed: true, start: "", end: "" }
    }
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

  const handleComplete = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    router.push("/panel")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">
                Cebindegaleri
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push("/panel")}>
              Daha Sonra Tamamla
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep > step.id 
                        ? 'bg-accent text-accent-foreground' 
                        : currentStep === step.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`mt-2 text-xs font-medium hidden sm:block ${
                    currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-full h-0.5 mx-2 sm:mx-4 ${
                    currentStep > step.id ? 'bg-accent' : 'bg-border'
                  }`} style={{ minWidth: '40px' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
          {/* Step 1: Gallery Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Galeri Bilgileri</h2>
                <p className="text-muted-foreground mt-1">Galerinizin temel bilgilerini girin</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="galleryName">Galeri Adı</Label>
                  <Input
                    id="galleryName"
                    placeholder="ABC Otomotiv"
                    value={formData.galleryName}
                    onChange={(e) => setFormData({ ...formData, galleryName: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Galeri Açıklaması</Label>
                  <Textarea
                    id="description"
                    placeholder="Galeriniz hakkında kısa bir açıklama yazın..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Galeri Logosu</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors cursor-pointer">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground font-medium">Logo yüklemek için tıklayın</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG veya SVG (max. 2MB)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">İletişim Bilgileri</h2>
                <p className="text-muted-foreground mt-1">Müşterilerin size ulaşabileceği bilgileri girin</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0212 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="0530 973 82 40"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">E-posta</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="info@galeri.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Web Sitesi (Opsiyonel)</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="www.galeri.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Konum Bilgileri</h2>
                <p className="text-muted-foreground mt-1">Galerinizin adres bilgilerini girin</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">İl</Label>
                    <Input
                      id="city"
                      placeholder="İstanbul"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">İlçe</Label>
                    <Input
                      id="district"
                      placeholder="Kadıköy"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Açık Adres</Label>
                  <Textarea
                    id="address"
                    placeholder="Mahalle, Cadde, Sokak, No..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-5 h-5" />
                    <span className="text-sm">Harita üzerinde konumunuzu seçebilirsiniz</span>
                  </div>
                  <div className="mt-3 h-48 bg-muted-foreground/10 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Harita buraya gelecek</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Working Hours */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Çalışma Saatleri</h2>
                <p className="text-muted-foreground mt-1">Galerinizin açık olduğu saatleri belirleyin</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-foreground">Hafta İçi</span>
                    <span className="text-sm text-muted-foreground">Pazartesi - Cuma</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      type="time"
                      value={formData.workingHours.weekdays.start}
                      onChange={(e) => setFormData({
                        ...formData,
                        workingHours: {
                          ...formData.workingHours,
                          weekdays: { ...formData.workingHours.weekdays, start: e.target.value }
                        }
                      })}
                      className="h-10"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={formData.workingHours.weekdays.end}
                      onChange={(e) => setFormData({
                        ...formData,
                        workingHours: {
                          ...formData.workingHours,
                          weekdays: { ...formData.workingHours.weekdays, end: e.target.value }
                        }
                      })}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-foreground">Cumartesi</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      type="time"
                      value={formData.workingHours.saturday.start}
                      onChange={(e) => setFormData({
                        ...formData,
                        workingHours: {
                          ...formData.workingHours,
                          saturday: { ...formData.workingHours.saturday, start: e.target.value }
                        }
                      })}
                      className="h-10"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={formData.workingHours.saturday.end}
                      onChange={(e) => setFormData({
                        ...formData,
                        workingHours: {
                          ...formData.workingHours,
                          saturday: { ...formData.workingHours.saturday, end: e.target.value }
                        }
                      })}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Pazar</span>
                    <span className="text-sm text-accent font-medium">Kapalı</span>
                  </div>
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
              className="h-11"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>

            {currentStep < 4 ? (
              <Button onClick={handleNext} className="h-11 bg-accent hover:bg-accent/90 text-accent-foreground">
                Devam Et
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleComplete} 
                className="h-11 bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Tamamlanıyor..." : "Kurulumu Tamamla"}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
