'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, PlusCircle, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function InstallAppCard({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const standaloneCheckId = window.setTimeout(() => {
      setIsInstalled(isStandaloneMode())
    }, 0)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
      setMessage(null)
    }

    const handleInstalled = () => {
      setIsInstalled(true)
      setPromptEvent(null)
      setMessage('Uygulama cihazınıza eklendi.')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.clearTimeout(standaloneCheckId)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!promptEvent) {
      setMessage('Tarayıcı menüsünden “Ana ekrana ekle” seçeneğini kullanabilirsiniz.')
      return
    }

    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    setPromptEvent(null)
    setMessage(choice.outcome === 'accepted' ? 'Kurulum başlatıldı.' : 'Kurulum iptal edildi.')
  }

  if (compact) {
    return (
      <Card className="h-full border-border/50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Telefona Ekle</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Paneli mobilde uygulama gibi açın; QR, lead ve rapor ekranlarına hızlı ulaşın.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => void installApp()} disabled={isInstalled}>
              {isInstalled ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              {isInstalled ? 'Eklenmiş' : 'Kurulum Bilgisi'}
            </Button>
            {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">PWA / Telefona Ekleme</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Cebindegaleri paneli manifest ve mobil ikonlarla kuruluma hazır. Destekleyen tarayıcılarda paneli ana ekrana ekleyip
              tam ekran uygulama gibi kullanabilirsiniz.
            </p>
          </div>
        </div>
        <Button onClick={() => void installApp()} disabled={isInstalled}>
          {isInstalled ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          {isInstalled ? 'Cihaza Eklenmiş' : 'Telefona Ekle'}
        </Button>
      </div>
      {message && (
        <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </Card>
  )
}
