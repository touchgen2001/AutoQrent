'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AuthBrandPanel } from '@/components/brand/auth-brand-panel'
import { getAdminAuthSession, loginAdminUser } from '@/lib/client/admin-auth'

function getErrorMessage(error?: string) {
  if (error === 'rate_limited') return 'Çok fazla deneme yapıldı. Lütfen kısa süre sonra tekrar deneyin.'
  if (error === 'admin_auth_not_configured') return 'Admin girişi canlı ortam gizli anahtar ayarı olmadan açılamaz.'
  if (error === 'invalid_payload') return 'Kullanıcı adı ve şifre zorunludur.'
  return 'Kullanıcı adı veya şifre hatalı.'
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    let active = true

    getAdminAuthSession()
      .then((session) => {
        if (!active) return
        if (session) {
          router.replace('/admin')
          return
        }
        setIsCheckingSession(false)
      })
      .catch(() => {
        if (active) setIsCheckingSession(false)
      })

    return () => {
      active = false
    }
  }, [router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await loginAdminUser({
      username,
      password,
    })

    setIsSubmitting(false)

    if (!result.ok) {
      setError(getErrorMessage(result.error))
      return
    }

    router.replace('/admin')
    router.refresh()
  }

  return (
    <main className="grid min-h-screen gap-4 bg-background p-3 lg:grid-cols-[390px_minmax(0,1fr)]">
      <AuthBrandPanel
        title="Süper admin erişimi"
        description="Admin oturumu galeri panelinden ayrıdır. Şifre düz metin olarak değil, canlı ortamda saklanan güvenli özet değeriyle doğrulanır."
        securityLabel="Süper Admin"
      />

      <section className="flex min-h-[calc(100vh-1.5rem)] items-center justify-center rounded-[1.75rem] border border-border bg-card p-6 text-foreground shadow-sm md:p-10">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-black tracking-tight">Admin Paneli</h2>
          <p className="mt-2 text-muted-foreground">Kullanıcı adı ve şifre ile giriş yapın.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-bold text-neutral-800">Kullanıcı adı</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base font-semibold outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
                placeholder="admin"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-neutral-800">Şifre</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base font-semibold outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
                placeholder="Admin şifresi"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isCheckingSession}
              className="w-full rounded-2xl bg-primary px-5 py-4 text-base font-black text-primary-foreground shadow-lg shadow-black/10 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted-foreground disabled:shadow-none"
            >
              {isSubmitting ? 'Kontrol ediliyor...' : isCheckingSession ? 'Oturum kontrol ediliyor...' : 'Admin Paneline Gir'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
