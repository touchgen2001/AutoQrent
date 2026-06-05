import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, Megaphone, ShieldAlert, Ticket } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { platformApi } from '@/lib/platform-api'
import type { BellNotification } from '@/lib/platform-operations-types'

const sourceIcon = {
  SUPPORT: Ticket,
  MODERATION: ShieldAlert,
  BROADCAST: Megaphone,
} satisfies Record<BellNotification['source'], typeof Ticket>

const sourceLabels: Record<BellNotification['source'], string> = {
  SUPPORT: 'Destek',
  MODERATION: 'Moderasyon',
  BROADCAST: 'Duyuru',
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function NotificationBellPanel() {
  const [items, setItems] = useState<BellNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const unreadCount = useMemo(() => items.filter((item) => !readIds.has(item.id)).length, [items, readIds])

  async function refreshNotifications() {
    const snapshot = await platformApi.getOperationsSnapshot()
    setItems(snapshot.notifications)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshNotifications()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  function markRead() {
    setReadIds(new Set(items.map((item) => item.id)))
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && void refreshNotifications()}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Bildirimler" className="relative">
          <Bell />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
              {unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between gap-3 p-4">
          <DropdownMenuLabel className="p-0">
            <span className="block">Canlı Operasyon Bildirimleri</span>
            <span className="block text-xs font-normal text-muted-foreground">{unreadCount} oturum içi okunmamış olay</span>
          </DropdownMenuLabel>
          <Button variant="outline" size="sm" onClick={markRead} disabled={unreadCount === 0}>
            <CheckCircle2 />
            Okundu yap
          </Button>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[420px] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
              Canlı denetim kayıtları içinde gösterilecek operasyon bildirimi yok.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => {
                const Icon = sourceIcon[item.source]
                const isRead = readIds.has(item.id)
                return (
                  <div key={item.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                        <Icon />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-foreground">{item.title}</p>
                          {isRead ? <Badge variant="outline">Okundu</Badge> : <Badge className="rounded-full">Yeni</Badge>}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
                        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {sourceLabels[item.source]} · {dateFormatter.format(new Date(item.createdAt))}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
