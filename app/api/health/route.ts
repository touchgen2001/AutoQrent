import { NextResponse } from 'next/server'

import { getOpsSnapshot } from '@/lib/security/ops-monitor'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requiredMonitorKey = (process.env.MONITOR_SHARED_KEY || '').trim()
  if (requiredMonitorKey) {
    const receivedKey = request.headers.get('x-monitor-key') || ''
    if (!receivedKey || receivedKey !== requiredMonitorKey) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Monitor erişimi yetkisiz.',
        },
        { status: 401 },
      )
    }
  }

  const now = Date.now()
  const snapshot = getOpsSnapshot()

  return NextResponse.json({
    ok: true,
    service: 'autoqrent-web',
    generatedAt: new Date(now).toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    monitor: snapshot,
  })
}
