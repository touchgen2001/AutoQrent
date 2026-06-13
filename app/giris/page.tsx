"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { AuthBrandPanel } from "@/components/brand/auth-brand-panel"
import { BrandLogo } from "@/components/brand/brand-logo"
import { clearPanelAuthSession, getPanelAuthSession, loginPanelUser, type PanelClientSession } from "@/lib/client/panel-auth"

function LoginPageContent() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<PanelClientSession | null>(null)
  const [redirectTarget, setRedirectTarget] = useState("/panel")
  const [registeredSuccess, setRegisteredSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  useEffect(() => {
    let active = true

    void (async () => {
      const params = new URLSearchParams(window.location.search)
      const next = params.get("next")
      if (next?.startsWith("/panel")) setRedirectTarget(next)
      setRegisteredSuccess(params.get("registered") === "1")

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
    if (activeSession) {
      setErrorMessage("Farklı bir hesapla giriş yapmak için önce çıkış yapın.")
      return
    }

    const email = formData.email.trim().toLowerCase()
    const password = formData.password.trim()
    if (!email || !password) {
      setErrorMessage("E-posta ve şifre alanlarını doldurun.")
      return
    }

    setIsLoading(true)
    const result = await loginPanelUser({ email, password })
    if (!result.ok) {
      setErrorMessage(result.message)
      setIsLoading(false)
      return
    }

    router.push(redirectTarget)
  }

  return (
    <div className="grid min-h-screen gap-4 bg-background p-3 lg:grid-cols-[390px_minmax(0,1fr)]">
      <AuthBrandPanel
        title="Galeri panelinize güvenli giriş yapın"
        description="Araç vitrini, QR kodlar, lead akışı ve galeri ayarları tek panelden yönetilir. Giriş işlemleri aktif oturum kontrolüyle korunur."
        securityLabel="Galeri Panel"
      />

      <div className="flex min-h-[calc(100vh-1.5rem)] flex-col justify-center rounded-[1.75rem] border border-border bg-card px-4 py-10 shadow-sm sm:px-6 lg:px-10">
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
              Tekrar Hoş Geldiniz
            </h1>
            <p className="text-muted-foreground mt-2 leading-6">
              Galeri panelinize giriş yapın
            </p>
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
                  Çıkış Yap ve Farklı Hesapla Giriş Yap
                </Button>
                <Button type="button" size="sm" onClick={() => router.push(redirectTarget)}>
                  Panele Dön
                </Button>
              </div>
            </div>
          ) : null}

          {registeredSuccess && (
            <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
              Kayıt başarılı. Şimdi giriş yapabilirsiniz.
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
          
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
                disabled={Boolean(activeSession) || isSessionLoading}
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
            
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading || Boolean(activeSession) || isSessionLoading}
            >
              {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
          
          {/* Register Link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link href="/kayit" className="text-accent hover:text-accent/80 font-medium transition-colors">
              14 Gün Ücretsiz Kayıt Olun
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginPageContent />
}
