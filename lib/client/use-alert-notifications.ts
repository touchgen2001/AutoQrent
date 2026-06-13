'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PanelAlert, PanelAlertCenterResponse } from '@/lib/panel-types'

export type AlertNotificationPermission = 'unsupported' | NotificationPermission

function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

function getInitialPermission(): AlertNotificationPermission {
  return isNotificationSupported() ? Notification.permission : 'unsupported'
}

function buildSignature(alert: PanelAlert) {
  return `${alert.id}:${alert.metricValue}`
}

// new_lead metricValue always starts with the lead count, e.g. "2 yeni talep · ...".
function parseNewLeadCount(alert: PanelAlert) {
  const parsed = Number.parseInt(alert.metricValue, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function useAlertDesktopNotifications(alerts: PanelAlertCenterResponse | null) {
  const [permission, setPermission] = useState<AlertNotificationPermission>(getInitialPermission)
  const seenSignaturesRef = useRef<Set<string>>(new Set())
  const lastNewLeadCountRef = useRef(0)
  const seededRef = useRef(false)

  const requestPermission = useCallback(async () => {
    if (!isNotificationSupported()) return
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
    } catch {
      setPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    if (!alerts) return

    const currentAlerts = alerts.alerts
    const newLeadAlert = currentAlerts.find((alert) => alert.type === 'new_lead')

    // First successful load establishes the baseline without notifying for pre-existing alerts.
    if (!seededRef.current) {
      seededRef.current = true
      seenSignaturesRef.current = new Set(currentAlerts.map(buildSignature))
      lastNewLeadCountRef.current = newLeadAlert ? parseNewLeadCount(newLeadAlert) : 0
      return
    }

    const alertsToNotify: PanelAlert[] = []

    for (const alert of currentAlerts) {
      const signature = buildSignature(alert)
      if (seenSignaturesRef.current.has(signature)) continue

      // For lead counts, only notify on an actual increase — clearing leads must not pop a "new lead".
      if (alert.type === 'new_lead') {
        const count = parseNewLeadCount(alert)
        if (count > lastNewLeadCountRef.current) {
          alertsToNotify.push(alert)
        }
        lastNewLeadCountRef.current = count
        continue
      }

      alertsToNotify.push(alert)
    }

    for (const alert of currentAlerts) {
      seenSignaturesRef.current.add(buildSignature(alert))
    }

    if (alertsToNotify.length === 0) return
    if (!isNotificationSupported() || Notification.permission !== 'granted') return

    for (const alert of alertsToNotify) {
      try {
        const notification = new Notification(alert.title, {
          body: alert.metricValue,
          tag: alert.id,
        })
        notification.onclick = () => {
          window.focus()
          window.location.href = alert.actionHref
          notification.close()
        }
      } catch {
        // Ignore notification construction errors (e.g. permission revoked mid-session).
      }
    }
  }, [alerts])

  return { permission, requestPermission }
}
