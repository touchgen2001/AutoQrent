'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ShareLinkButtonsProps = {
  /** Absolute URL that gets copied and shared. */
  url: string
  /** Pre-composed WhatsApp message (should already include the URL). */
  message: string
  /** Per-button className, e.g. for placing on a dark surface. */
  buttonClassName?: string
  size?: 'sm' | 'lg' | 'default'
}

// One-tap share helpers for the dealer panel: open the WhatsApp recipient picker
// with a ready message, or copy the public link to the clipboard. Returns a
// fragment of two buttons so it drops straight into an existing flex/wrap row.
export function ShareLinkButtons({ url, message, buttonClassName, size = 'default' }: ShareLinkButtonsProps) {
  const [copied, setCopied] = useState(false)

  const handleWhatsApp = () => {
    if (typeof window === 'undefined') return
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (e.g. insecure context) — silently ignore.
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={handleWhatsApp} className={buttonClassName}>
        <Share2 className="mr-2 h-4 w-4" />
        WhatsApp&apos;ta Paylaş
      </Button>
      <Button type="button" variant="outline" size={size} onClick={handleCopy} className={buttonClassName}>
        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
        {copied ? 'Kopyalandı' : 'Linki Kopyala'}
      </Button>
    </>
  )
}
