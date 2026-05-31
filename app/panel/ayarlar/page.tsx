'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Upload,
  Save,
  ExternalLink,
  Users,
  CreditCard,
  Palette,
  Check,
  Crown,
  Zap,
  Star
} from 'lucide-react'
import { mockDealership, mockPlans } from '@/lib/mock-data'

export default function SettingsPage() {
  const [dealer, setDealer] = useState(mockDealership)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Mock save action
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  const currentPlan = mockPlans.find(p => p.slug === dealer.plan)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ayarlar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Galeri profili ve sistem ayarlarını yönetin
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Galeri Profili</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Ekip</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Görünüm</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Abonelik</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Logo & Name */}
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Galeri Bilgileri</h3>
            <div className="grid gap-6 md:grid-cols-[200px_1fr]">
              <div className="space-y-4">
                <Label>Logo</Label>
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                  {dealer.logo ? (
                    <Image
                      src={dealer.logo}
                      alt="Logo"
                      width={128}
                      height={128}
                      className="object-contain"
                    />
                  ) : (
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-32">
                  <Upload className="h-4 w-4 mr-2" />
                  Yükle
                </Button>
              </div>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Galeri Adı</Label>
                    <Input
                      id="name"
                      value={dealer.name}
                      onChange={(e) => setDealer({ ...dealer, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">cebindegaleri.com/</span>
                      <Input
                        id="slug"
                        value={dealer.slug}
                        onChange={(e) => setDealer({ ...dealer, slug: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/showroom/${dealer.slug}`}
                    target="_blank"
                    className="text-sm text-accent hover:underline inline-flex items-center gap-1"
                  >
                    Public sayfanızı görüntüleyin
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold text-foreground mb-4">İletişim Bilgileri</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={dealer.phone}
                    onChange={(e) => setDealer({ ...dealer, phone: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    value={dealer.whatsapp}
                    onChange={(e) => setDealer({ ...dealer, whatsapp: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={dealer.email}
                    onChange={(e) => setDealer({ ...dealer, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maps">Google Maps Linki</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="maps"
                    value={dealer.googleMapsUrl || ''}
                    onChange={(e) => setDealer({ ...dealer, googleMapsUrl: e.target.value })}
                    className="pl-10"
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  value={dealer.address}
                  onChange={(e) => setDealer({ ...dealer, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">İl</Label>
                <Input
                  id="city"
                  value={dealer.city}
                  onChange={(e) => setDealer({ ...dealer, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">İlçe</Label>
                <Input
                  id="district"
                  value={dealer.district}
                  onChange={(e) => setDealer({ ...dealer, district: e.target.value })}
                />
              </div>
            </div>
          </Card>

          {/* Working Hours */}
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Çalışma Saatleri
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="weekdays">Hafta İçi</Label>
                <Input
                  id="weekdays"
                  value={dealer.workingHours.weekdays}
                  onChange={(e) => setDealer({ 
                    ...dealer, 
                    workingHours: { ...dealer.workingHours, weekdays: e.target.value }
                  })}
                  placeholder="09:00 - 19:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saturday">Cumartesi</Label>
                <Input
                  id="saturday"
                  value={dealer.workingHours.saturday}
                  onChange={(e) => setDealer({ 
                    ...dealer, 
                    workingHours: { ...dealer.workingHours, saturday: e.target.value }
                  })}
                  placeholder="09:00 - 18:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sunday">Pazar</Label>
                <Input
                  id="sunday"
                  value={dealer.workingHours.sunday}
                  onChange={(e) => setDealer({ 
                    ...dealer, 
                    workingHours: { ...dealer.workingHours, sunday: e.target.value }
                  })}
                  placeholder="Kapalı veya 10:00 - 16:00"
                />
              </div>
            </div>
          </Card>

          {/* Social Media */}
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Sosyal Medya
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="instagram"
                    value={dealer.socialMedia?.instagram || ''}
                    onChange={(e) => setDealer({ 
                      ...dealer, 
                      socialMedia: { ...dealer.socialMedia, instagram: e.target.value }
                    })}
                    className="pl-10"
                    placeholder="kullaniciadi"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <div className="relative">
                  <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="facebook"
                    value={dealer.socialMedia?.facebook || ''}
                    onChange={(e) => setDealer({ 
                      ...dealer, 
                      socialMedia: { ...dealer.socialMedia, facebook: e.target.value }
                    })}
                    className="pl-10"
                    placeholder="sayfa-adi"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <div className="relative">
                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="youtube"
                    value={dealer.socialMedia?.youtube || ''}
                    onChange={(e) => setDealer({ 
                      ...dealer, 
                      socialMedia: { ...dealer.socialMedia, youtube: e.target.value }
                    })}
                    className="pl-10"
                    placeholder="@kanal-adi"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter / X</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="twitter"
                    value={dealer.socialMedia?.twitter || ''}
                    onChange={(e) => setDealer({ 
                      ...dealer, 
                      socialMedia: { ...dealer.socialMedia, twitter: e.target.value }
                    })}
                    className="pl-10"
                    placeholder="kullaniciadi"
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card className="p-6 border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground">Ekip Üyeleri</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Panele erişimi olan kullanıcıları yönetin
                </p>
              </div>
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Üye Ekle
              </Button>
            </div>
            
            <div className="space-y-3">
              {/* Current user */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-accent">AY</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Ahmet Yılmaz</p>
                    <p className="text-sm text-muted-foreground">ahmet@prestijotomotiv.com</p>
                  </div>
                </div>
                <Badge variant="secondary">Admin</Badge>
              </div>
              
              {/* Team member */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-muted-foreground">MK</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Mehmet Kaya</p>
                    <p className="text-sm text-muted-foreground">mehmet@prestijotomotiv.com</p>
                  </div>
                </div>
                <Badge variant="outline">Editör</Badge>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Mevcut paketiniz {currentPlan?.features.teamMembers} ekip üyesi destekliyor.
            </p>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="p-6 border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Public Sayfa Ayarları</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Showroom Sayfası Aktif</p>
                  <p className="text-sm text-muted-foreground">
                    Public galeri sayfanızı ziyaretçilere açın
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Fiyatları Göster</p>
                  <p className="text-sm text-muted-foreground">
                    Araç fiyatlarını public sayfada göster
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">WhatsApp Butonu</p>
                  <p className="text-sm text-muted-foreground">
                    Araç detay sayfasında WhatsApp butonunu göster
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Test Sürüşü Formu</p>
                  <p className="text-sm text-muted-foreground">
                    Müşterilerin test sürüşü talep etmesine izin ver
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50">
            <h3 className="font-semibold text-foreground mb-4">Marka Rengi</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Public sayfanızda kullanılacak marka rengini seçin
            </p>
            <div className="flex gap-3 flex-wrap">
              {['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#c026d3', '#1a1a1a'].map(color => (
                <button
                  key={color}
                  className="w-10 h-10 rounded-lg border-2 border-transparent hover:border-foreground/20 transition-colors"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan */}
          <Card className="p-6 border-accent/50 bg-accent/5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-foreground">Mevcut Paket: {currentPlan?.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Aylık {currentPlan?.price} TL / Yıllık faturalandırma ile %20 indirim
                </p>
              </div>
              <Badge className="bg-accent text-accent-foreground">Aktif</Badge>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Araç Limiti</p>
                <p className="font-medium text-foreground">
                  {currentPlan?.vehicleLimit === -1 ? 'Sınırsız' : currentPlan?.vehicleLimit}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">QR Kod Limiti</p>
                <p className="font-medium text-foreground">
                  {currentPlan?.qrLimit === -1 ? 'Sınırsız' : currentPlan?.qrLimit}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Ekip Üyeleri</p>
                <p className="font-medium text-foreground">{currentPlan?.features.teamMembers}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Öncelikli Destek</p>
                <p className="font-medium text-foreground">
                  {currentPlan?.features.prioritySupport ? 'Evet' : 'Hayır'}
                </p>
              </div>
            </div>
          </Card>

          {/* All Plans */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Tüm Paketler</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {mockPlans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`p-6 border-border/50 ${plan.popular ? 'ring-2 ring-accent' : ''}`}
                >
                  {plan.popular && (
                    <Badge className="mb-4 bg-accent text-accent-foreground">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      En Popüler
                    </Badge>
                  )}
                  <div className="mb-4">
                    <h4 className="text-xl font-bold text-foreground">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">TL/ay</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-foreground">
                        {plan.vehicleLimit === -1 ? 'Sınırsız araç' : `${plan.vehicleLimit} araç`}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-foreground">
                        {plan.qrLimit === -1 ? 'Sınırsız QR kod' : `${plan.qrLimit} QR kod`}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      {plan.features.leadTracking ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="h-4 w-4 text-muted-foreground">-</span>
                      )}
                      <span className={plan.features.leadTracking ? 'text-foreground' : 'text-muted-foreground'}>
                        Lead takibi
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      {plan.features.analytics ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="h-4 w-4 text-muted-foreground">-</span>
                      )}
                      <span className={plan.features.analytics ? 'text-foreground' : 'text-muted-foreground'}>
                        Analitik
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      {plan.features.customGalleryPage ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="h-4 w-4 text-muted-foreground">-</span>
                      )}
                      <span className={plan.features.customGalleryPage ? 'text-foreground' : 'text-muted-foreground'}>
                        Özel galeri sayfası
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      {plan.features.bulkQRPrint ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="h-4 w-4 text-muted-foreground">-</span>
                      )}
                      <span className={plan.features.bulkQRPrint ? 'text-foreground' : 'text-muted-foreground'}>
                        Toplu QR yazdırma
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-foreground">{plan.features.teamMembers} ekip üyesi</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      {plan.features.prioritySupport ? (
                        <>
                          <Zap className="h-4 w-4 text-yellow-600" />
                          <span className="text-foreground">Öncelikli destek</span>
                        </>
                      ) : (
                        <>
                          <span className="h-4 w-4 text-muted-foreground">-</span>
                          <span className="text-muted-foreground">Standart destek</span>
                        </>
                      )}
                    </li>
                  </ul>

                  <Button 
                    className="w-full" 
                    variant={plan.slug === dealer.plan ? 'secondary' : plan.popular ? 'default' : 'outline'}
                    disabled={plan.slug === dealer.plan}
                  >
                    {plan.slug === dealer.plan ? 'Mevcut Paket' : 'Pakete Geç'}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
