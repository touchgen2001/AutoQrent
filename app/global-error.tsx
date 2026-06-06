"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

export default function GlobalError({
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
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          backgroundColor: "#fafafa",
          color: "#1a1a1a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#737373",
            }}
          >
            Cebindegaleri
          </p>
          <h1 style={{ marginTop: "0.75rem", fontSize: "1.875rem", fontWeight: 700, lineHeight: 1.2 }}>
            Uygulamada bir sorun oluştu
          </h1>
          <p style={{ marginTop: "1rem", fontSize: "1rem", lineHeight: 1.6, color: "#525252" }}>
            Beklenmedik bir hata nedeniyle sayfa görüntülenemiyor. Lütfen tekrar deneyin; sorun devam
            ederse kısa süre sonra yeniden ziyaret edin.
          </p>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: "pointer",
                borderRadius: "0.5rem",
                border: "none",
                padding: "0.625rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                backgroundColor: "#1a1a1a",
                color: "#ffffff",
              }}
            >
              Tekrar dene
            </button>
            {/* Hard reload (not next/link) so recovery starts from a clean tree after a global crash. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                borderRadius: "0.5rem",
                border: "1px solid #d4d4d4",
                padding: "0.625rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#1a1a1a",
                textDecoration: "none",
              }}
            >
              Ana sayfaya dön
            </a>
          </div>

          {error.digest && (
            <p style={{ marginTop: "2rem", fontSize: "0.75rem", color: "#737373" }}>
              Hata kodu: <span style={{ fontFamily: "ui-monospace, monospace" }}>{error.digest}</span>
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
