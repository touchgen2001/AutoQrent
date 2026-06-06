import Link from "next/link"
import { ArrowRight, HelpCircle, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { faqItems, type FaqItem } from "@/lib/faq-items"

// Decision-critical questions surfaced on the homepage. The full, category
// grouped list lives on /sss. We resolve them from faq-items.ts (single source)
// so the visible answers always match the FAQPage structured data below — a
// Google requirement for FAQ rich results.
const HOMEPAGE_FAQ_QUESTIONS = [
  "14 günlük ücretsiz deneme nasıl çalışır?",
  "Paket fiyatları nedir?",
  "QR kodlar nasıl üretiliyor ve kullanılıyor?",
  "Kurulum süreci nasıl ilerliyor?",
  "Mevcut araç verilerimizi taşıyabilir miyiz?",
  "Canlı destek alabiliyor muyuz?",
] as const

// Preserve the curated order above; drop silently if a question is ever renamed
// in faq-items.ts so the homepage degrades gracefully instead of crashing.
export const homepageFaqItems: FaqItem[] = HOMEPAGE_FAQ_QUESTIONS.map((question) =>
  faqItems.find((item) => item.question === question),
).filter((item): item is FaqItem => Boolean(item))

export function buildHomeFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homepageFaqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}

export function HomeFaqPreview() {
  if (homepageFaqItems.length === 0) return null

  return (
    <section className="border-t border-border/60 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <HelpCircle className="h-3.5 w-3.5" />
              Karar öncesi sık sorulanlar
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Aklınızdaki soruların net cevapları
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Fiyat, ücretsiz deneme, QR kullanımı ve kurulum gibi en çok sorulan başlıkları kısa tuttuk. Tüm sorular SSS sayfasında.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full md:w-auto">
            <Link href="/sss">
              Tüm Soruları Gör
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-2">
          {homepageFaqItems.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-border/70 bg-card p-5 transition-colors open:border-accent/40 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground sm:text-base">
                <span>{item.question}</span>
                <Plus className="h-4 w-4 shrink-0 text-accent transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
