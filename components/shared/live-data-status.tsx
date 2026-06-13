import { cn } from '@/lib/utils'

type LiveDataStatusProps = {
  lastUpdatedAt: string | null
  isRefreshing: boolean
  intervalSeconds: number
  className?: string
}

function formatLiveTimestamp(value: string | null) {
  if (!value) return 'Henüz güncellenmedi'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Bilinmiyor'

  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function LiveDataStatus({
  lastUpdatedAt,
  isRefreshing,
  intervalSeconds,
  className,
}: LiveDataStatusProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      <span className="relative flex h-2.5 w-2.5">
        {isRefreshing ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
        ) : null}
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <span className="text-foreground">Canlı veri</span>
      <span aria-hidden className="text-muted-foreground/60">•</span>
      <span>Son güncelleme: {formatLiveTimestamp(lastUpdatedAt)}</span>
      <span aria-hidden className="hidden text-muted-foreground/60 sm:inline">•</span>
      <span className="hidden sm:inline">{intervalSeconds} sn otomatik yenileme</span>
    </div>
  )
}
