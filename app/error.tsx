"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, Home, RefreshCw } from "lucide-react"
import * as Sentry from "@sentry/nextjs"
import { BrandLogo } from "@/components/brand/brand-logo"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="flex justify-center">
          <BrandLogo href="/" mode="full" />
        </div>

        <div className="mt-12 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Beklenmeyen Hata
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Bir şeyler ters gitti
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          Sayfayı yüklerken beklenmedik bir sorun oluştu. Çoğu zaman tekrar denemek sorunu çözer.
          Sorun devam ederse destek ekibimize aşağıdaki hata kodunu iletebilirsiniz.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => reset()} variant="accent" size="lg">
            <RefreshCw className="h-4 w-4" />
            Tekrar dene
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Home className="h-4 w-4" />
              Ana sayfaya dön
            </Link>
          </Button>
        </div>

        {error.digest && (
          <p className="mt-8 text-xs text-muted-foreground">
            Hata kodu: <span className="font-mono text-foreground">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  )
}
