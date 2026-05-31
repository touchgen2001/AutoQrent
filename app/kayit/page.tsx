"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { QrCode, Eye, EyeOff, ArrowLeft, Check } from "lucide-react"

const benefits = [
  "Sınırsız QR kod oluşturma",
  "Mobil uyumlu araç sayfaları",
  "Detaylı tarama analitiği",
  "WhatsApp entegrasyonu"
]

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [formData, setFormData] = useState({
    galleryName: "",
    fullName: "",
    email: "",
    phone: "",
    password: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreedToTerms) return
    setIsLoading(true)
    // Simulate registration
    await new Promise(resolve => setTimeout(resolve, 1000))
    router.push("/onboarding")
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        
        {/* Pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="relative z-10 flex flex-col justify-center px-12">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-8">
            <QrCode className="w-8 h-8 text-accent-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Galerinizi Dijitale Taşıyın
          </h2>
          <p className="text-primary-foreground/70 max-w-md leading-relaxed mb-8">
            14 gün ücretsiz deneyin. Kredi kartı gerektirmez.
          </p>
          
          {/* Benefits */}
          <ul className="space-y-4">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-accent" />
                </div>
                <span className="text-primary-foreground/90">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12 overflow-auto">
        <div className="w-full max-w-md mx-auto">
          {/* Back Link */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfa
          </Link>
          
          {/* Logo - Mobile Only */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">
              Cebindegaleri
            </span>
          </Link>
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Ücretsiz Hesap Oluşturun
            </h1>
            <p className="text-muted-foreground mt-2">
              14 gün ücretsiz deneme, kredi kartı gerektirmez
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="galleryName">Galeri Adı</Label>
              <Input
                id="galleryName"
                type="text"
                placeholder="ABC Otomotiv"
                value={formData.galleryName}
                onChange={(e) => setFormData({ ...formData, galleryName: e.target.value })}
                required
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Ad Soyad</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Ahmet Yılmaz"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="h-11"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@galeri.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0530 973 82 40"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="En az 8 karakter"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Checkbox 
                id="terms" 
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                <Link href="/kullanim-kosullari" className="text-accent hover:text-accent/80">Kullanım Koşulları</Link>
                {" "}ve{" "}
                <Link href="/gizlilik" className="text-accent hover:text-accent/80">Gizlilik Politikası</Link>
                &apos;nı okudum ve kabul ediyorum.
              </Label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={isLoading || !agreedToTerms}
            >
              {isLoading ? "Hesap oluşturuluyor..." : "Ücretsiz Başla"}
            </Button>
          </form>
          
          {/* Login Link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link href="/giris" className="text-accent hover:text-accent/80 font-medium transition-colors">
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
