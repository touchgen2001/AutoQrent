export type AdminSettingsStatus = 'OK' | 'WATCH' | 'MISSING'
export type AdminSettingsCategory = 'auth' | 'supabase' | 'security' | 'operations' | 'notifications' | 'observability'

export type AdminSettingsItem = {
  key: string
  label: string
  category: AdminSettingsCategory
  status: AdminSettingsStatus
  required: boolean
  exposure: 'server' | 'public' | 'derived'
  maskedValue: string
  detail: string
}

export type AdminSettingsSection = {
  key: AdminSettingsCategory
  title: string
  description: string
  items: AdminSettingsItem[]
}

export type AdminSettingsSnapshot = {
  generatedAt: string
  source: 'runtime'
  environment: {
    nodeEnv: string
    vercelEnv: string
    siteUrl: string
    platform: string
  }
  stats: {
    total: number
    ready: number
    watch: number
    missing: number
    requiredMissing: number
  }
  sections: AdminSettingsSection[]
  notes: {
    dataPolicy: string
    secrets: string
    writePolicy: string
  }
}

export const settingsStatusLabels: Record<AdminSettingsStatus, string> = {
  OK: 'Hazır',
  WATCH: 'İzle',
  MISSING: 'Eksik',
}

export const settingsExposureLabels: Record<AdminSettingsItem['exposure'], string> = {
  server: 'Sunucu',
  public: 'Herkese açık',
  derived: 'Türetilmiş',
}
