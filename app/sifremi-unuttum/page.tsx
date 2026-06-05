"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react"
import { BrandLogo } from "@/components/brand/brand-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPanelPasswordReset } from "@/lib/client/panel-auth"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [email, setEmail] = useState("")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isLoading) return

    setErrorMessage(null)
    setSuccessMessage(null)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setErrorMessage("E-posta adresi zorunludur.")
      return
    }

    setIsLoading(true)
    const result = await requestPanelPasswordReset({ email: normalizedEmail })

    if (!result.ok) {
      setErrorMessage(result.message)
      setIsLoading(false)
      return
    }

    setSuccessMessage(result.message)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-5xl items-center justify-center rounded-[1.75rem] border border-border bg-card px-4 py-12 shadow-sm">
      <div className="w-full max-w-md">
        <Link
          href="/giris"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Girişe Dön
        </Link>

        <div className="mt-5 mb-6">
          <BrandLogo href="/" tone="light" className="mb-6" />
          <h1 className="text-3xl font-black tracking-tight text-foreground">Şifre Yenile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hesabınıza ait e-posta adresini girin, şifre yenileme bağlantısı gönderelim.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@galeri.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isLoading ? "Gönderiliyor..." : "Şifre Yenileme Bağlantısı Gönder"}
          </Button>
        </form>
      </div>
      </div>
    </div>
  )
}
