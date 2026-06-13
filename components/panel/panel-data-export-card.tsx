'use client'

import { useState } from 'react'
import { Database, DownloadCloud, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { buildLeadExportCsv, buildPanelBackupPayload, buildVehicleExportCsv } from '@/lib/vehicle-export'
import type { PanelLead, PanelVehicle } from '@/lib/panel-types'

type ApiListResponse<T> =
  | { ok: true; items: T[] }
  | { ok?: false; message?: string }

type QrApiResponse =
  | { ok: true; vehicles?: unknown[]; recentScans?: unknown[]; topShared?: unknown[]; shareCount?: number; gallery?: unknown }
  | { ok?: false; message?: string }

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function todayStamp() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  const data = (await response.json()) as T
  if (!response.ok || !(data as { ok?: boolean }).ok) {
    throw new Error((data as { message?: string }).message || 'Veri alınamadı.')
  }
  return data
}

export function PanelDataExportCard() {
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const exportBackup = async () => {
    setIsExporting(true)
    setMessage(null)
    try {
      const [vehicles, leads, tasks, qr] = await Promise.all([
        fetchJson<ApiListResponse<PanelVehicle>>('/api/panel/vehicles'),
        fetchJson<ApiListResponse<PanelLead>>('/api/panel/leads'),
        fetchJson<ApiListResponse<unknown>>('/api/panel/tasks'),
        fetchJson<QrApiResponse>('/api/panel/qr-codes'),
      ])

      const payload = buildPanelBackupPayload({
        vehicles: vehicles.ok ? vehicles.items : [],
        leads: leads.ok ? leads.items : [],
        tasks: tasks.ok ? tasks.items : [],
        qr,
      })

      downloadTextFile(
        `cebindegaleri-panel-yedek-${todayStamp()}.json`,
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8',
      )
      setMessage('Panel veri yedeği indirildi.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Panel veri yedeği indirilemedi.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportVehicles = async () => {
    setIsExporting(true)
    setMessage(null)
    try {
      const vehicles = await fetchJson<ApiListResponse<PanelVehicle>>('/api/panel/vehicles')
      downloadTextFile(
        `cebindegaleri-araclar-${todayStamp()}.csv`,
        `\uFEFF${buildVehicleExportCsv(vehicles.ok ? vehicles.items : [])}`,
        'text/csv;charset=utf-8',
      )
      setMessage('Araç CSV dosyası indirildi.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Araç listesi indirilemedi.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportLeads = async () => {
    setIsExporting(true)
    setMessage(null)
    try {
      const leads = await fetchJson<ApiListResponse<PanelLead>>('/api/panel/leads')
      downloadTextFile(
        `cebindegaleri-leadler-${todayStamp()}.csv`,
        `\uFEFF${buildLeadExportCsv(leads.ok ? leads.items : [])}`,
        'text/csv;charset=utf-8',
      )
      setMessage('Müşteri talebi CSV dosyası indirildi.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Müşteri talebi listesi indirilemedi.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className="border-border/50 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-semibold text-foreground">Yedekleme ve Veri Export</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Galeri sahibi araçları, müşteri taleplerini, takip kayıtlarını ve QR özetini tek JSON yedeği olarak indirebilir.
            Araç ve lead listeleri ayrıca Excel uyumlu CSV olarak alınabilir.
          </p>
        </div>
        <div className="grid gap-2 sm:min-w-64">
          <Button onClick={() => void exportBackup()} disabled={isExporting}>
            <DownloadCloud className="mr-2 h-4 w-4" />
            Tüm Panel Verisini İndir
          </Button>
          <Button variant="outline" onClick={() => void exportVehicles()} disabled={isExporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Araçları CSV İndir
          </Button>
          <Button variant="outline" onClick={() => void exportLeads()} disabled={isExporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Leadleri CSV İndir
          </Button>
        </div>
      </div>
      {message && (
        <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </Card>
  )
}
