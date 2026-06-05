import { FormEvent, useState } from 'react'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'

import { SuperAdminLogo } from '@/components/brand/super-admin-logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getSeededAdmins, useAuth } from '@/lib/auth'
import { roleLabels } from '@/lib/rbac'

type LoginPageProps = {
  onNavigate: (path: string) => void
}

function getErrorMessage(error: string | null) {
  if (error === 'missing_credentials') return 'Admin kullanıcı adı ve şifre zorunludur.'
  if (error === 'invalid_credentials') return 'Admin giriş bilgileri geçersiz veya canlı admin API oturumu açılamadı.'
  return null
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { login } = useAuth()
  const admins = getSeededAdmins()
  const [email, setEmail] = useState(admins[0]?.username || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await login({ email, password })
    if (!result.ok) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }

    onNavigate('/dashboard')
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-border bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-10">
          <div>
            <SuperAdminLogo tone="dark" subtitle="Süper Admin Paneli" />
            <h1 className="mt-10 max-w-xl text-5xl font-black leading-tight tracking-tight">
              Cebindegaleri Süper Admin.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/70">
              Korumalı sayfa erişimi, rol bazlı yetki ve kurumsal yönetim deneyimiyle platform kontrol paneli.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck />
                Rol bazlı erişim
              </div>
              <p className="mt-2 text-sm text-white/60">Süper Admin, Platform Yöneticisi, Destek Uzmanı, Finans Yöneticisi</p>
            </div>
            <p className="text-xs text-white/45">Giriş canlı admin oturumu oluşturur; canlı ortamda sadece yerel oturum kullanılmaz.</p>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10">
          <Card className="w-full max-w-xl border-border/80 shadow-2xl shadow-black/5">
            <CardHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <LockKeyhole />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight">Süper Admin Girişi</CardTitle>
              <CardDescription>Canlı admin API oturumu oluşturan yönetici hesabıyla giriş yapın.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  Admin kullanıcı adı veya e-posta
                  <Input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" placeholder="admin" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  Şifre
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Yerel admin şifresi"
                  />
                </label>

                {getErrorMessage(error) ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                    {getErrorMessage(error)}
                  </div>
                ) : null}

                <Button type="submit" size="lg" className="mt-2" disabled={isSubmitting}>
                  {isSubmitting ? 'Giriş yapılıyor' : 'Süper Admin Paneline Gir'}
                  <ArrowRight />
                </Button>
              </form>

              <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-4">
                <p className="text-sm font-semibold">Tanımlı admin hesapları</p>
                <div className="mt-3 grid gap-2">
                  {admins.map((admin) => (
                    <button
                      key={admin.id}
                      type="button"
                      onClick={() => setEmail(admin.username)}
                      className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-left text-sm transition hover:bg-secondary"
                    >
                      <span>{admin.username}</span>
                      <Badge variant="outline">{roleLabels[admin.role]}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
