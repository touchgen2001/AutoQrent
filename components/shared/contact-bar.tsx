'use client'

import Link from 'next/link'
import { Phone, MessageCircle, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StickyContactBarProps {
  phone: string
  whatsapp: string
  mapsUrl?: string
  vehicleTitle?: string
  className?: string
}

export function StickyContactBar({ 
  phone, 
  whatsapp, 
  mapsUrl,
  vehicleTitle,
  className 
}: StickyContactBarProps) {
  const whatsappMessage = vehicleTitle 
    ? encodeURIComponent(`Merhaba, ${vehicleTitle} aracı hakkında bilgi almak istiyorum.`)
    : encodeURIComponent('Merhaba, araçlarınız hakkında bilgi almak istiyorum.')

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom',
      'md:hidden',
      className
    )}>
      <div className="flex items-center justify-around p-3 gap-2">
        <Link
          href={`tel:${phone.replace(/\s/g, '')}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-foreground text-background font-medium transition-colors hover:bg-foreground/90"
        >
          <Phone className="h-5 w-5" />
          <span>Ara</span>
        </Link>
        
        <Link
          href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-green-600 text-white font-medium transition-colors hover:bg-green-700"
        >
          <MessageCircle className="h-5 w-5" />
          <span>WhatsApp</span>
        </Link>

        {mapsUrl && (
          <Link
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-3 rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
          >
            <Navigation className="h-5 w-5" />
          </Link>
        )}
      </div>
    </div>
  )
}

// Desktop Contact Buttons
interface ContactButtonsProps {
  phone: string
  whatsapp: string
  vehicleTitle?: string
  className?: string
}

export function ContactButtons({ 
  phone, 
  whatsapp, 
  vehicleTitle,
  className 
}: ContactButtonsProps) {
  const whatsappMessage = vehicleTitle 
    ? encodeURIComponent(`Merhaba, ${vehicleTitle} aracı hakkında bilgi almak istiyorum.`)
    : encodeURIComponent('Merhaba, araçlarınız hakkında bilgi almak istiyorum.')

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Link
        href={`tel:${phone.replace(/\s/g, '')}`}
        className="flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-foreground text-background font-medium transition-colors hover:bg-foreground/90"
      >
        <Phone className="h-5 w-5" />
        <span>Hemen Ara</span>
      </Link>
      
      <Link
        href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-green-600 text-white font-medium transition-colors hover:bg-green-700"
      >
        <MessageCircle className="h-5 w-5" />
        <span>WhatsApp ile Yaz</span>
      </Link>
    </div>
  )
}
