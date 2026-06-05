'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { Clock3, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react'

import { MarketingPageHero, MarketingPageLayout, MarketingPageSection } from '@/components/landing/marketing-page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type ContactFormData = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  website: string
  formStartedAt: number
}

const channels = [
  {
    icon: Mail,
    title: 'E-posta Desteği',
    value: 'destek@cebindegaleri.com',
    detail: 'Genel destek ve teknik sorular için',
    href: 'mailto:destek@cebindegaleri.com',
  },
  {
    icon: Phone,
    title: 'Telefon',
    value: '0530 973 82 40',
    detail: 'Hafta içi 09:00 - 18:00',
    href: 'tel:+905309738240',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp',
    value: '0530 973 82 40',
    detail: 'Satış ve onboarding talepleri için',
    href: 'https://wa.me/905309738240',
  },
]

const initialFormData: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  website: '',
  formStartedAt: Date.now(),
}

export default function IletisimPage() {
  const [formData, setFormData] = useState<ContactFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [manualFollowupUrl, setManualFollowupUrl] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return (
      formData.name.trim().length >= 2 &&
      formData.email.trim().length > 0 &&
      formData.subject.trim().length >= 3 &&
      formData.message.trim().length >= 10
    )
  }, [formData])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    if (!canSubmit) {
      setSubmitState('error')
      setSubmitMessage('Lütfen zorunlu alanları kontrol edin ve tekrar deneyin.')
      return
    }

    setIsSubmitting(true)
    setSubmitState('idle')
    setSubmitMessage('')
    setManualFollowupUrl(null)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = (await response.json()) as {
        ok?: boolean
        message?: string
        fallbackWhatsAppUrl?: string | null
      }

      if (!response.ok || !data.ok) {
        setSubmitState('error')
        setSubmitMessage(data.message ?? 'Mesaj gönderilemedi. Lütfen tekrar deneyin.')
        setManualFollowupUrl(data.fallbackWhatsAppUrl ?? null)
        return
      }

      setSubmitState('success')
      setSubmitMessage(data.message ?? 'Mesajınız başarıyla alındı.')
      setManualFollowupUrl(data.fallbackWhatsAppUrl ?? null)
      setFormData({
        ...initialFormData,
        formStartedAt: Date.now(),
      })
    } catch {
      setSubmitState('error')
      setSubmitMessage('Ağ hatası oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MarketingPageLayout>
      <MarketingPageHero
        badge="İletişim"
        title="Ekibimizle Hızlıca İletişime Geçin"
        description="Satış, demo, onboarding veya teknik destek talepleriniz için kanal fark etmeksizin tek ekip üzerinden hızlı geri dönüş sağlıyoruz."
      />

      <MarketingPageSection>
        <div className="grid gap-4 md:grid-cols-3">
          {channels.map((item) => (
            <Card key={item.title} className="border-border/70 bg-card/80">
              <CardContent className="space-y-3 py-6">
                <item.icon className="h-6 w-6 text-accent" />
                <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
                <a href={item.href} className="block text-sm font-medium text-accent hover:text-accent/80">
                  {item.value}
                </a>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          <Card className="border-border/70 bg-card/80 lg:col-span-3">
            <CardHeader>
              <CardTitle>Hızlı Mesaj Formu</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <input
                  type="text"
                  name="website"
                  autoComplete="off"
                  tabIndex={-1}
                  aria-hidden="true"
                  value={formData.website}
                  onChange={(event) => setFormData((prev) => ({ ...prev, website: event.target.value }))}
                  className="absolute left-[-9999px] top-[-9999px] h-0 w-0 opacity-0"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-foreground">
                      Ad Soyad
                    </label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Adınız Soyadınız"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                      E-posta
                    </label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="ornek@galeri.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-medium text-foreground">
                    Telefon (Opsiyonel)
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="05xx xxx xx xx"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="mb-2 block text-sm font-medium text-foreground">
                    Konu
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={(event) => setFormData((prev) => ({ ...prev, subject: event.target.value }))}
                    placeholder="Demo talebi / Teknik destek / İş birliği"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="mb-2 block text-sm font-medium text-foreground">
                    Mesaj
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={(event) => setFormData((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder="İhtiyacınızı kısa ve net bir şekilde yazın. Ekibimiz en kısa sürede dönüş yapacaktır."
                    rows={6}
                    required
                  />
                </div>

                {submitState !== 'idle' && (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      submitState === 'success'
                        ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {submitMessage}
                  </div>
                )}

                {manualFollowupUrl && (
                  <a
                    href={manualFollowupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/15"
                  >
                    WhatsApp ile Manuel Takip Başlat
                  </a>
                )}

                <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Gönderiliyor...' : 'Mesajı Gönder'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 lg:col-span-2">
            <CardHeader>
              <CardTitle>Hizmet Saatleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <p className="font-medium text-foreground">Destek</p>
                  <p>Hafta içi 09:00 - 18:00</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <p className="font-medium text-foreground">Merkez</p>
                  <p>Maslak, İstanbul</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
                <p className="font-medium text-foreground">Demo Randevusu</p>
                <p className="mt-1 text-sm">15 dakikalık canlı demo için doğrudan takvim bağlantısı talep edebilirsiniz.</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href="mailto:satis@cebindegaleri.com?subject=Demo%20Randevu%20Talebi">Randevu Talep Et</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MarketingPageSection>
    </MarketingPageLayout>
  )
}
