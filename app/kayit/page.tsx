"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { AuthBrandPanel } from "@/components/brand/auth-brand-panel"
import { BrandLogo } from "@/components/brand/brand-logo"
import { clearPanelAuthSession, getPanelAuthSession, registerPanelUser, type PanelClientSession } from "@/lib/client/panel-auth"

type RegisterPlanCode = "starter" | "pro" | "premium"

const planLabels: Record<RegisterPlanCode, string> = {
  starter: "Başlangıç",
  pro: "Pro",
  premium: "Premium",
}

function normalizeRegisterPlan(value: string | null): RegisterPlanCode {
  if (value === "pro" || value === "premium") return value
  return "starter"
}

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<PanelClientSession | null>(null)
  const [selectedPlanCode, setSelectedPlanCode] = useState<RegisterPlanCode>("starter")
  const [formData, setFormData] = useState({
    galleryName: "",
    fullName: "",
    email: "",
    phone: "",
    password: ""
  })

  useEffect(() => {
    let active = true

    void (async () => {
      setSelectedPlanCode(normalizeRegisterPlan(new URLSearchParams(window.location.search).get("plan")))

      const session = await getPanelAuthSession()
      if (!active) return
      setActiveSession(session)
      setIsSessionLoading(false)
    })()

    return () => {
      active = false
    }
  }, [])

  const handleSwitchAccount = async () => {
    setErrorMessage(null)
    await clearPanelAuthSession()
    setActiveSession(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    setErrorMessage(null)
    if (!agreedToTerms) {
      setErrorMessage("Devam etmek için kullanım koşullarını kabul etmelisiniz.")
      return
    }

    const galleryName = formData.galleryName.trim()
    const fullName = formData.fullName.trim()
    const email = formData.email.trim().toLowerCase()
    const phone = formData.phone.trim()
    const password = formData.password.trim()

    if (!galleryName || !fullName || !email || !phone || !password) {
      setErrorMessage("Tüm zorunlu alanları doldurun.")
      return
    }
    if (password.length < 8) {
      setErrorMessage("Şifre en az 8 karakter olmalıdır.")
      return
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setErrorMessage("Geçerli bir telefon numarası girin.")
      return
    }

    setIsLoading(true)
    const result = await registerPanelUser({
      galleryName,
      fullName,
      email,
      phone,
      password,
      planCode: selectedPlanCode,
    })

    if (!result.ok) {
      setErrorMessage(result.message)
      setIsLoading(false)
      return
    }

    router.push(`/onboarding?trial=1&plan=${selectedPlanCode}`)
  }

  return (
    <div className="grid min-h-screen gap-4 bg-background p-3 lg:grid-cols-[390px_minmax(0,1fr)]">
      <AuthBrandPanel
        title="Galerinizi dijital vitrine taşıyın"
        description="Kayıt sonrası galeri bilgilerinizi tamamlayıp araçlarınızı, QR kodlarınızı ve müşteri temas noktalarınızı panelden yönetebilirsiniz."
        securityLabel="Yeni Galeri"
      />

      <div className="flex min-h-[calc(100vh-1.5rem)] flex-col justify-center overflow-auto rounded-[1.75rem] border border-border bg-card px-4 py-10 shadow-sm sm:px-6 lg:px-10">
        <div className="w-full max-w-md mx-auto">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfa
          </Link>
          
          <BrandLogo href="/" tone="light" className="mb-8 lg:hidden" />
          
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              14 Gün Ücretsiz Başla
            </h1>
            <p className="text-muted-foreground mt-2 leading-6">
              Seçilen plan: {planLabels[selectedPlanCode]}. Kredi kartı gerektirmez.
            </p>
          </div>

          <div className="mb-5 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Kayıt sonrası otomatik kurulum</p>
            <div className="mt-3 grid gap-2">
              <p>1. Galeri hesabınız ve güvenli public showroom linkiniz oluşturulur.</p>
              <p>2. {planLabels[selectedPlanCode]} planı için 14 günlük ücretsiz deneme başlar.</p>
              <p>3. Onboarding sonrası panelde Abonelik ekranından planınızı ve deneme bitişini görürsünüz.</p>
            </div>
          </div>

          {isSessionLoading ? (
            <div className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Oturum kontrol ediliyor...
            </div>
          ) : activeSession ? (
            <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-700">
              <p className="font-medium">Bu cihazda aktif oturum var.</p>
              <p className="mt-1">{activeSession.fullName} ({activeSession.email}) hesabıyla giriş yapılmış.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleSwitchAccount}>
                  Çıkış Yap ve Yeni Hesap Aç
                </Button>
                <Button type="button" size="sm" onClick={() => router.push("/panel")}>
                  Panele Dön
                </Button>
              </div>
            </div>
          ) : null}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

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
                disabled={Boolean(activeSession) || isSessionLoading}
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
                disabled={Boolean(activeSession) || isSessionLoading}
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
                  disabled={Boolean(activeSession) || isSessionLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0530XXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="h-11"
                  disabled={Boolean(activeSession) || isSessionLoading}
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
                  disabled={Boolean(activeSession) || isSessionLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || Boolean(activeSession) || isSessionLoading}
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
                disabled={Boolean(activeSession) || isSessionLoading}
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
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading || !agreedToTerms || Boolean(activeSession) || isSessionLoading}
            >
              {isLoading ? "Hesap oluşturuluyor..." : "14 Gün Ücretsiz Başla"}
            </Button>
          </form>
          
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
