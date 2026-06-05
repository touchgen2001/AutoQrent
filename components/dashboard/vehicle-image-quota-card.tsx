import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { PanelVehicleImageQuotaSnapshot } from '@/lib/panel-types'
import { cn } from '@/lib/utils'

type VehicleImageQuotaCardProps = {
  quota: PanelVehicleImageQuotaSnapshot | null
  isLoading?: boolean
  className?: string
}

function formatMb(bytes: number) {
  return `${Math.floor(bytes / (1024 * 1024))}MB`
}

function ratio(used: number, limit: number) {
  if (limit <= 0) return 0
  return Math.min(Math.round((used / limit) * 100), 100)
}

export function VehicleImageQuotaCard({ quota, isLoading = false, className }: VehicleImageQuotaCardProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground', className)}>
        Fotoğraf kotası canlı veriden alınıyor...
      </div>
    )
  }

  if (!quota) {
    return (
      <div className={cn('rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground', className)}>
        Fotoğraf kotası şu anda gösterilemiyor. Yükleme sırasında sunucu güvenlik limitleri yine uygulanır.
      </div>
    )
  }

  const dailyRatio = ratio(quota.dailyUsed, quota.dailyLimit)
  const totalRatio = ratio(quota.totalActive, quota.totalActiveLimit)
  const isNearLimit = quota.dailyRemaining <= quota.maxFilesPerRequest || quota.totalRemaining <= quota.maxFilesPerRequest

  return (
    <div className={cn('rounded-xl border border-border bg-background p-4 shadow-sm', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Canlı fotoğraf kotası</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Veri kaynağı: Supabase yüklenen görsel kayıtları. Reddedilen veya silinen görseller aktif kotaya dahil edilmez.
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'w-fit',
            isNearLimit
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-700'
              : 'border-green-500/40 bg-green-500/10 text-green-700',
          )}
        >
          {isNearLimit ? 'Limit Yakın' : 'Yükleme Açık'}
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Günlük kullanım</span>
            <span className="text-muted-foreground">
              {quota.dailyUsed} / {quota.dailyLimit}
            </span>
          </div>
          <Progress value={dailyRatio} />
          <p className="text-xs text-muted-foreground">
            Kalan günlük hak: {quota.dailyRemaining}. Pencere: son {quota.dailyWindowHours} saat.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Aktif galeri arşivi</span>
            <span className="text-muted-foreground">
              {quota.totalActive} / {quota.totalActiveLimit}
            </span>
          </div>
          <Progress value={totalRatio} />
          <p className="text-xs text-muted-foreground">
            Kalan aktif görsel hakkı: {quota.totalRemaining}. Hazırlanan ve araca bağlı görseller sayılır.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <span>Tek istekte en fazla: {quota.maxFilesPerRequest} görsel</span>
        <span>Dosya başına en fazla: {formatMb(quota.maxFileSizeBytes)}</span>
        <span>Format: PNG, JPG, WEBP</span>
      </div>
    </div>
  )
}
