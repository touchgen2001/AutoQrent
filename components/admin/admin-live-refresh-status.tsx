'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LiveDataStatus } from '@/components/shared/live-data-status'

const ADMIN_REFRESH_INTERVAL_MS = 30 * 1000
const REFRESH_SETTLE_MS = 900

type AdminLiveRefreshStatusProps = {
  lastUpdatedAt: string | null
}

export function AdminLiveRefreshStatus({ lastUpdatedAt }: AdminLiveRefreshStatusProps) {
  const router = useRouter()
  const settleTimerRef = useRef<number | null>(null)
  const isRefreshingRef = useRef(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [manualRefreshAt, setManualRefreshAt] = useState<string | null>(null)
  const visibleLastUpdatedAt = manualRefreshAt ?? lastUpdatedAt

  const triggerRefresh = useCallback(() => {
    if (isRefreshingRef.current) return

    isRefreshingRef.current = true
    setIsRefreshing(true)
    router.refresh()
    setManualRefreshAt(new Date().toISOString())

    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current)
    }

    settleTimerRef.current = window.setTimeout(() => {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    }, REFRESH_SETTLE_MS)
  }, [router])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      triggerRefresh()
    }, ADMIN_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current)
      }
    }
  }, [triggerRefresh])

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <LiveDataStatus
        lastUpdatedAt={visibleLastUpdatedAt}
        isRefreshing={isRefreshing}
        intervalSeconds={ADMIN_REFRESH_INTERVAL_MS / 1000}
      />
      <Button variant="outline" size="sm" onClick={triggerRefresh} disabled={isRefreshing}>
        <RefreshCcw className="mr-2 h-4 w-4" />
        Yenile
      </Button>
    </div>
  )
}
