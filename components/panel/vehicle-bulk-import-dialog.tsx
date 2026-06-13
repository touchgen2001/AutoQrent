'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getVehicleCsvTemplate, parseVehicleCsv, type VehicleBulkImportRow } from '@/lib/vehicle-bulk-import'

export function VehicleBulkImportDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<VehicleBulkImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const downloadTemplate = () => {
    const blob = new Blob([`\uFEFF${getVehicleCsvTemplate()}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'arac-toplu-aktarim-sablonu.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = async (file: File | undefined) => {
    setMessage(null)
    setRows([])
    setFileName(file?.name || '')
    if (!file) return
    if (!file.name.toLocaleLowerCase('tr-TR').endsWith('.csv')) {
      setMessage('Excel dosyanızı CSV UTF-8 biçiminde kaydedip yükleyin.')
      return
    }
    const parsedRows = parseVehicleCsv(await file.text())
    if (parsedRows.length === 0) {
      setMessage('Dosyada aktarılabilir araç satırı bulunamadı.')
      return
    }
    setRows(parsedRows)
  }

  const importRows = async () => {
    if (rows.length === 0) return
    setIsImporting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/panel/vehicles/bulk-import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: rows }),
      })
      const data = (await response.json()) as { ok?: boolean; message?: string; importedCount?: number }
      setMessage(data.message || (response.ok ? 'Araçlar aktarıldı.' : 'Araçlar aktarılamadı.'))
      if (response.ok && data.ok && (data.importedCount || 0) > 0) {
        onImported()
        setRows([])
        setFileName('')
      }
    } catch {
      setMessage('Ağ hatası nedeniyle araçlar aktarılamadı.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel / CSV Aktar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Toplu Araç Aktarımı</DialogTitle>
          <DialogDescription>
            Excel şablonunu doldurun, CSV UTF-8 olarak kaydedin ve tek seferde en fazla 100 araç aktarın.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button type="button" variant="secondary" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Excel Şablonunu İndir
          </Button>
          <div className="rounded-lg border border-dashed border-border p-4">
            <Input type="file" accept=".csv,text/csv" onChange={(event) => void handleFile(event.target.files?.[0])} />
            <p className="mt-2 text-xs text-muted-foreground">
              {fileName ? `${fileName} · ${rows.length} araç hazır` : 'Zorunlu alanlar: marka, model, yıl, fiyat, km, yakıt ve vites.'}
            </p>
          </div>
          {rows.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-lg border border-border">
              {rows.slice(0, 8).map((row, index) => (
                <div key={`${row.brand}-${row.model}-${index}`} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-0">
                  <span>{row.brand} {row.model} {row.variant || ''}</span>
                  <span className="text-muted-foreground">{row.year}</span>
                </div>
              ))}
            </div>
          )}
          {message && <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{message}</p>}
          <Button onClick={() => void importRows()} disabled={rows.length === 0 || isImporting} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? 'Aktarılıyor...' : `${rows.length} Aracı Aktar`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
