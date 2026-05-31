"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Eye, EyeOff, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate login
    await new Promise(resolve => setTimeout(resolve, 1000))
    router.push("/panel")
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Back Link */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfa
          </Link>
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8">
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
              Tekrar Hoş Geldiniz
            </h1>
            <p className="text-muted-foreground mt-2">
              Galeri panelinize giriş yapın
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Şifre</Label>
                <Link 
                  href="/sifremi-unuttum" 
                  className="text-sm text-accent hover:text-accent/80 transition-colors"
                >
                  Şifremi Unuttum
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
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
            
            <Button 
              type="submit" 
              className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={isLoading}
            >
              {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
          
          {/* Register Link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link href="/kayit" className="text-accent hover:text-accent/80 font-medium transition-colors">
              Ücretsiz Kayıt Olun
            </Link>
          </p>
        </div>
      </div>
      
      {/* Right Side - Image/Branding */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        
        {/* Pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="relative z-10 flex flex-col justify-center items-center px-12 text-center">
          <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mb-8">
            <QrCode className="w-10 h-10 text-accent-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Dijital Vitrin Yönetimi
          </h2>
          <p className="text-primary-foreground/70 max-w-md leading-relaxed">
            QR kodlu araç sayfaları, stok yönetimi, müşteri takibi ve analitik - 
            hepsi tek panelde.
          </p>
          
          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary-foreground">500+</div>
              <div className="text-sm text-primary-foreground/60 mt-1">Galeri</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-foreground">25K+</div>
              <div className="text-sm text-primary-foreground/60 mt-1">Araç</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-foreground">1M+</div>
              <div className="text-sm text-primary-foreground/60 mt-1">Tarama</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
