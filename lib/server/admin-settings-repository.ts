import fs from 'node:fs'
import path from 'node:path'

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
  ok: true
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

type EnvCheckInput = {
  key: string
  label: string
  category: AdminSettingsCategory
  required?: boolean
  sensitive?: boolean
  publicValue?: boolean
  detailWhenSet: string
  detailWhenMissing: string
  statusWhenMissing?: AdminSettingsStatus
}

const categoryCopy: Record<AdminSettingsCategory, { title: string; description: string }> = {
  auth: {
    title: 'Kimlik ve oturum',
    description: 'Admin, panel ve oturum imzalama yapılandırması.',
  },
  supabase: {
    title: 'Supabase bağlantısı',
    description: 'Canlı kimlik, veri ve servis anahtarı erişim durumu.',
  },
  security: {
    title: 'Güvenlik ve bakım kilitleri',
    description: 'Gizli anahtar, herkese açık sayfa koruması, zamanlanmış görev ve bakım uç noktası kontrolleri.',
  },
  operations: {
    title: 'Operasyon ve yedekleme',
    description: 'Yedekleme, zamanlanmış görev ve yayın paketinin izlenebilirliği.',
  },
  notifications: {
    title: 'Bildirim kanalları',
    description: 'WhatsApp, web kancası ve admin bildirim kanalı ayarları.',
  },
  observability: {
    title: 'Gözlemleme',
    description: 'Sentry, izleme ve canlı sistem kontrol altyapısı.',
  },
}

function envValue(key: string) {
  return process.env[key] || ''
}

function maskValue(value: string, sensitive: boolean, publicValue: boolean) {
  if (!value) return 'Eksik'
  if (!sensitive && publicValue) return value.length > 80 ? `${value.slice(0, 77)}...` : value
  if (!sensitive) return 'Ayarlı'
  return 'Ayarlı'
}

function createEnvItem(input: EnvCheckInput): AdminSettingsItem {
  const value = envValue(input.key)
  const hasValue = Boolean(value)
  const required = Boolean(input.required)
  const status: AdminSettingsStatus = hasValue ? 'OK' : required ? 'MISSING' : input.statusWhenMissing || 'WATCH'

  return {
    key: input.key,
    label: input.label,
    category: input.category,
    status,
    required,
    exposure: input.publicValue ? 'public' : 'server',
    maskedValue: maskValue(value, Boolean(input.sensitive), Boolean(input.publicValue)),
    detail: hasValue ? input.detailWhenSet : input.detailWhenMissing,
  }
}

function createDerivedItem(input: Omit<AdminSettingsItem, 'exposure'>): AdminSettingsItem {
  return {
    ...input,
    exposure: 'derived',
  }
}

function fileExists(relativePath: string) {
  return fs.existsSync(path.join(/*turbopackIgnore: true*/ process.cwd(), relativePath))
}

function fileContains(relativePath: string, needle: string) {
  const absolutePath = path.join(/*turbopackIgnore: true*/ process.cwd(), relativePath)
  if (!fs.existsSync(absolutePath)) return false
  return fs.readFileSync(absolutePath, 'utf8').includes(needle)
}

function getHost(value: string) {
  try {
    return new URL(value).host
  } catch {
    return value || 'Eksik'
  }
}

function buildItems() {
  const supabaseUrl = envValue('SUPABASE_URL') || envValue('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRole = envValue('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const slugRotationEnabled = envValue('MAINTENANCE_SLUG_ROTATE_ENABLED') === 'YES'
  const slugRotationSecret = envValue('MAINTENANCE_SLUG_ROTATE_SECRET')
  const qaCleanupSecret = envValue('MAINTENANCE_QA_CLEANUP_SECRET')
  const panelSessionSecret = envValue('PANEL_SESSION_SECRET')
  const adminSessionSecret = envValue('ADMIN_SESSION_SECRET')
  const sentryServer = envValue('SENTRY_DSN')
  const sentryPublic = envValue('NEXT_PUBLIC_SENTRY_DSN')
  const whatsappWebhook = envValue('CONTACT_WHATSAPP_WEBHOOK_URL')
  const whatsappToken = envValue('CONTACT_WHATSAPP_WEBHOOK_TOKEN')

  const items: AdminSettingsItem[] = [
    createEnvItem({
      key: 'ADMIN_USERNAME',
      label: 'Admin kullanıcı adı',
      category: 'auth',
      required: true,
      detailWhenSet: 'Admin girişinde kullanıcı adı kontrolü aktif.',
      detailWhenMissing: 'Admin giriş kullanıcı adı eksik.',
    }),
    createEnvItem({
      key: 'ADMIN_PASSWORD_SHA256',
      label: 'Admin şifre özeti',
      category: 'auth',
      required: true,
      sensitive: true,
      detailWhenSet: 'Admin şifresi güvenli özet olarak tutuluyor.',
      detailWhenMissing: 'Admin şifre güvenli özet değeri eksik.',
    }),
    createEnvItem({
      key: 'ADMIN_SESSION_SECRET',
      label: 'Admin oturum imzası',
      category: 'auth',
      required: false,
      sensitive: true,
      detailWhenSet: 'Admin oturum imzası ayrı gizli anahtar ile korunuyor.',
      detailWhenMissing: 'Admin oturum gizli anahtarı yoksa yedek mekanizma devreye girer; ayrı gizli anahtar önerilir.',
      statusWhenMissing: 'WATCH',
    }),
    createEnvItem({
      key: 'PANEL_SESSION_SECRET',
      label: 'Panel oturum imzası',
      category: 'auth',
      required: false,
      sensitive: true,
      detailWhenSet: 'Panel oturum imzası ayrı gizli anahtar ile korunuyor.',
      detailWhenMissing: 'Panel oturum gizli anahtarı yoksa servis anahtarı yedeği kullanılır; ayrı gizli anahtar önerilir.',
      statusWhenMissing: 'WATCH',
    }),
    createDerivedItem({
      key: 'SUPABASE_URL',
      label: 'Supabase adresi',
      category: 'supabase',
      required: true,
      status: supabaseUrl ? 'OK' : 'MISSING',
      maskedValue: supabaseUrl ? getHost(supabaseUrl) : 'Eksik',
      detail: supabaseUrl ? `Supabase alan adı: ${getHost(supabaseUrl)}` : 'SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_URL eksik.',
    }),
    createEnvItem({
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      label: 'Supabase servis anahtarı',
      category: 'supabase',
      required: true,
      sensitive: true,
      detailWhenSet: 'Servis anahtarı sadece sunucu tarafı admin veri işlemlerinde kullanılıyor.',
      detailWhenMissing: 'Sunucu tarafı admin veri erişimi için servis anahtarı eksik.',
    }),
    createEnvItem({
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      label: 'Supabase genel istemci anahtarı',
      category: 'supabase',
      required: true,
      sensitive: true,
      detailWhenSet: 'Herkese açık Supabase istemci anahtarı tanımlı.',
      detailWhenMissing: 'Herkese açık kimlik istemcisi için genel istemci anahtarı eksik.',
    }),
    createDerivedItem({
      key: 'SUPABASE_SERVICE_ROLE_NOT_ANON',
      label: 'Servis anahtarı / genel anahtar ayrımı',
      category: 'supabase',
      required: true,
      status: serviceRole && anonKey && serviceRole !== anonKey ? 'OK' : 'MISSING',
      maskedValue: serviceRole && anonKey && serviceRole !== anonKey ? 'Ayrı' : 'Risk',
      detail: 'SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY ile aynı olmamalı.',
    }),
    createEnvItem({
      key: 'CRON_SECRET',
      label: 'Zamanlanmış görev gizli anahtarı',
      category: 'security',
      required: true,
      sensitive: true,
      detailWhenSet: 'Yüklenen görsel temizleme görevi taşıyıcı gizli anahtarı ile korunuyor.',
      detailWhenMissing: 'Temizleme zamanlanmış görev uç noktası için CRON_SECRET eksik.',
    }),
    createDerivedItem({
      key: 'MAINTENANCE_SLUG_ROTATE',
      label: 'Herkese açık kısa adres yenileme kilidi',
      category: 'security',
      required: false,
      status: slugRotationEnabled && !slugRotationSecret ? 'MISSING' : 'OK',
      maskedValue: slugRotationEnabled ? 'Aktif' : 'Kapalı',
      detail: slugRotationEnabled
        ? 'Kısa adres yenileme uç noktası aktif; taşıyıcı gizli anahtarı da tanımlı olmalı.'
        : 'Kısa adres yenileme uç noktası kapalı. Deneme aşamasında bu güvenli varsayılan.',
    }),
    createDerivedItem({
      key: 'MAINTENANCE_QA_CLEANUP',
      label: 'Test veri temizleme kilidi',
      category: 'security',
      required: false,
      status: qaCleanupSecret ? 'OK' : 'WATCH',
      maskedValue: qaCleanupSecret ? 'Gizli anahtar ayarlı' : 'Gizli anahtar eksik',
      detail: qaCleanupSecret
        ? 'Test veri temizleme uç noktası taşıyıcı gizli anahtarı ile korunabilir.'
        : 'Test veri temizleme uç noktası gizli anahtar olmadan aktif edilmemeli.',
    }),
    createDerivedItem({
      key: 'SECURE_PUBLIC_ROUTE_HELPER',
      label: 'Herkese açık sayfa güvenli anahtar yardımcısı',
      category: 'security',
      required: true,
      status: fileContains('lib/security/public-route-token.ts', "randomBytes(bytes).toString('hex')") ? 'OK' : 'MISSING',
      maskedValue: 'Kod kontrolü',
      detail: 'Herkese açık araç ve galeri bağlantıları kriptografik güvenli anahtar yardımcısı ile üretilmeli.',
    }),
    createDerivedItem({
      key: 'SAFE_IMAGE_UPLOAD',
      label: 'Görsel güvenlik doğrulaması',
      category: 'security',
      required: true,
      status: fileContains('lib/server/safe-image-upload.ts', 'validateImageFileForUpload') ? 'OK' : 'MISSING',
      maskedValue: 'Kod kontrolü',
      detail: 'Araç ve galeri görselleri storage öncesi imza/MIME/boyut doğrulamasından geçer.',
    }),
    createDerivedItem({
      key: 'VERCEL_CRON_CONFIG',
      label: 'Vercel zamanlanmış görev paketi',
      category: 'operations',
      required: true,
      status:
        fileExists('vercel.json') && fileContains('vercel.json', '/api/cron/cleanup-uploaded-assets')
          ? 'OK'
          : 'MISSING',
      maskedValue: 'Dosya kontrolü',
      detail: 'Yüklenen görsel temizleme görevi yayın paketinde tanımlı olmalı.',
    }),
    createDerivedItem({
      key: 'BACKUP_WORKFLOW',
      label: 'Aylık Supabase yedekleme iş akışı',
      category: 'operations',
      required: true,
      status: fileExists('.github/workflows/monthly-supabase-backup.yml') ? 'OK' : 'MISSING',
      maskedValue: 'Dosya kontrolü',
      detail: 'Veri yedeği için GitHub iş akışı paketi mevcut olmalı.',
    }),
    createEnvItem({
      key: 'SUPABASE_STORAGE_BUCKET',
      label: 'Depolama klasörü',
      category: 'operations',
      required: false,
      detailWhenSet: 'Depolama yedekleme betiği özel klasör adıyla çalışabilir.',
      detailWhenMissing: 'Varsayılan vehicle-images depolama klasörü kullanılır.',
      statusWhenMissing: 'OK',
    }),
    createEnvItem({
      key: 'WHATSAPP_ALERT_NUMBER',
      label: 'WhatsApp uyarı numarası',
      category: 'notifications',
      required: false,
      sensitive: true,
      detailWhenSet: 'Müşteri talebi ve iletişim uyarıları için WhatsApp hedef numarası tanımlı.',
      detailWhenMissing: 'Varsayılan destek numarası kullanılabilir; canlı ortam için açık ortam ayarı önerilir.',
      statusWhenMissing: 'WATCH',
    }),
    createDerivedItem({
      key: 'CONTACT_WHATSAPP_WEBHOOK',
      label: 'WhatsApp web kancası',
      category: 'notifications',
      required: false,
      status: whatsappWebhook && whatsappToken ? 'OK' : whatsappWebhook || whatsappToken ? 'WATCH' : 'WATCH',
      maskedValue: whatsappWebhook ? 'Adres ayarlı' : 'Eksik',
      detail:
        whatsappWebhook && whatsappToken
          ? 'WhatsApp web kancası adresi ve güvenli anahtarı birlikte tanımlı.'
          : 'WhatsApp web kancası canlı teslimat için adres ve güvenli anahtar birlikte tanımlanmalı.',
    }),
    createDerivedItem({
      key: 'SENTRY_CONFIG',
      label: 'Sentry bağlantısı',
      category: 'observability',
      required: false,
      status: sentryServer || sentryPublic ? 'OK' : 'WATCH',
      maskedValue: sentryServer || sentryPublic ? 'Ayarlı' : 'Eksik',
      detail: sentryServer || sentryPublic ? 'Sentry bağlantı bilgisi tanımlı.' : 'Canlı hata izleme için Sentry bağlantı bilgisi önerilir.',
    }),
    createDerivedItem({
      key: 'PROD_SMOKE_WORKFLOW',
      label: 'Canlı sistem kontrol iş akışı',
      category: 'observability',
      required: true,
      status: fileExists('.github/workflows/prod-smoke-monitor.yml') ? 'OK' : 'MISSING',
      maskedValue: 'Dosya kontrolü',
      detail: 'Canlı sistem kontrol iş akışı yayın sonrası kritik uç noktaları izler.',
    }),
  ]

  if (!adminSessionSecret && !panelSessionSecret && !serviceRole) {
    items.push(
      createDerivedItem({
        key: 'SESSION_FALLBACK_AVAILABLE',
        label: 'Oturum yedeği',
        category: 'auth',
        required: true,
        status: 'MISSING',
        maskedValue: 'Yok',
        detail: 'Admin ve panel oturum imzası için hiçbir güvenli yedek bulunamadı.',
      }),
    )
  }

  return items
}

function buildSections(items: AdminSettingsItem[]) {
  return (Object.keys(categoryCopy) as AdminSettingsCategory[]).map((category) => ({
    key: category,
    title: categoryCopy[category].title,
    description: categoryCopy[category].description,
    items: items.filter((item) => item.category === category),
  }))
}

export function getAdminSettingsSnapshot(): AdminSettingsSnapshot {
  const items = buildItems()
  const missing = items.filter((item) => item.status === 'MISSING').length
  const watch = items.filter((item) => item.status === 'WATCH').length

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: 'runtime',
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      vercelEnv: process.env.VERCEL_ENV || 'local',
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://cebindegaleri.com',
      platform: process.platform,
    },
    stats: {
      total: items.length,
      ready: items.filter((item) => item.status === 'OK').length,
      watch,
      missing,
      requiredMissing: items.filter((item) => item.required && item.status === 'MISSING').length,
    },
    sections: buildSections(items),
    notes: {
      dataPolicy: 'Bu modül gerçek çalışma zamanı ortam ayarlarını ve dosya sözleşmelerini okur; sahte ayar veya sahte yapılandırma göstermez.',
      secrets: 'Gizli değerler tarayıcıya veya API yanıtına açık gönderilmez; sadece maskeli ya da ayarlı durumu döner.',
      writePolicy: 'Platform gizli değer yazma işlemi bu fazda kapalıdır. Gizli değer değişiklikleri Vercel/Supabase yönetim katmanında yapılmalıdır.',
    },
  }
}
