import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type CriticalActionTone = 'neutral' | 'warning' | 'destructive'

type CriticalActionConfirmationProps = {
  open: boolean
  title: string
  description: string
  targetLabel: string
  confirmationPhrase: string
  confirmationValue: string
  reason: string
  isBusy?: boolean
  tone?: CriticalActionTone
  confirmLabel?: string
  minReasonLength?: number
  onConfirmationValueChange: (value: string) => void
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

const toneClasses: Record<CriticalActionTone, string> = {
  neutral: 'border-border bg-card text-foreground',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
  destructive: 'border-destructive/35 bg-destructive/5 text-destructive',
}

export function CriticalActionConfirmation({
  open,
  title,
  description,
  targetLabel,
  confirmationPhrase,
  confirmationValue,
  reason,
  isBusy = false,
  tone = 'warning',
  confirmLabel = 'İşlemi Onayla',
  minReasonLength = 12,
  onConfirmationValueChange,
  onReasonChange,
  onCancel,
  onConfirm,
}: CriticalActionConfirmationProps) {
  if (!open) return null

  const normalizedConfirmation = confirmationValue.trim()
  const normalizedPhrase = confirmationPhrase.trim()
  const normalizedReason = reason.trim()
  const confirmationReady = normalizedConfirmation === normalizedPhrase
  const reasonReady = normalizedReason.length >= minReasonLength
  const canConfirm = confirmationReady && reasonReady && !isBusy

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <section
        aria-modal="true"
        role="dialog"
        aria-labelledby="critical-action-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
      >
        <div className={cn('border-b px-6 py-5', toneClasses[tone])}>
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-background/80 text-foreground shadow-sm">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <p id="critical-action-title" className="text-xl font-black tracking-tight">
                {title}
              </p>
              <p className="mt-2 text-sm leading-6 opacity-80">{description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-2xl border border-border bg-secondary/50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Hedef kayıt</p>
            <p className="mt-2 break-words text-sm font-black">{targetLabel}</p>
          </div>

          <label className="flex flex-col gap-2 text-sm font-bold">
            Onay metni
            <Input
              value={confirmationValue}
              disabled={isBusy}
              autoComplete="off"
              placeholder={confirmationPhrase}
              onChange={(event) => onConfirmationValueChange(event.target.value)}
            />
            <span className="text-xs font-medium text-muted-foreground">
              Devam etmek için <span className="font-black text-foreground">{confirmationPhrase}</span> metnini birebir yazın.
            </span>
          </label>

          <label className="flex flex-col gap-2 text-sm font-bold">
            İşlem sebebi
            <Textarea
              value={reason}
              disabled={isBusy}
              rows={4}
              placeholder="Bu kritik işlemin neden yapıldığını yazın. Denetim kaydına eklenecek."
              onChange={(event) => onReasonChange(event.target.value)}
            />
            <span className={cn('text-xs font-medium', reasonReady ? 'text-muted-foreground' : 'text-destructive')}>
              En az {minReasonLength} karakter zorunlu. Yazılan sebep denetim kaydının teknik detayına eklenir.
            </span>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border bg-secondary/35 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
            Vazgeç
          </Button>
          <Button type="button" variant={tone === 'destructive' ? 'destructive' : 'default'} onClick={onConfirm} disabled={!canConfirm}>
            {isBusy ? 'İşlem yapılıyor...' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
