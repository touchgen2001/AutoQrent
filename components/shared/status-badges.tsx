import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Lead } from '@/lib/mock-data'

interface LeadStatusBadgeProps {
  status: Lead['status']
  className?: string
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const styles: Record<Lead['status'], string> = {
    'yeni': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'arandi': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'gorusuluyor': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    'test-surusu': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    'satisa-dondu': 'bg-green-500/10 text-green-600 border-green-500/20',
    'kayip': 'bg-muted text-muted-foreground border-muted'
  }

  const labels: Record<Lead['status'], string> = {
    'yeni': 'Yeni',
    'arandi': 'Arandı',
    'gorusuluyor': 'Görüşülüyor',
    'test-surusu': 'Test Sürüşü',
    'satisa-dondu': 'Satışa Döndü',
    'kayip': 'Kayıp'
  }

  return (
    <Badge variant="outline" className={cn(styles[status], className)}>
      {labels[status]}
    </Badge>
  )
}

interface LeadSourceBadgeProps {
  source: Lead['source']
  className?: string
}

export function LeadSourceBadge({ source, className }: LeadSourceBadgeProps) {
  const labels: Record<Lead['source'], string> = {
    'qr': 'QR Kod',
    'showroom': 'Showroom',
    'whatsapp': 'WhatsApp',
    'telefon': 'Telefon',
    'form': 'Form',
    'test-surusu': 'Test Sürüşü'
  }

  return (
    <Badge variant="secondary" className={cn('font-normal', className)}>
      {labels[source]}
    </Badge>
  )
}
