import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Database,
  FileClock,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  adminAccountControlCategoryLabels,
  adminAccountDbStatusLabels,
  adminAccountRoleLabels,
  adminAccountSignerLabels,
  adminAccountStatusLabels,
  type AdminAccountAuditEvent,
  type AdminAccountControl,
  type AdminAccountDbStatus,
  type AdminAccountRole,
  type AdminAccountsSnapshot,
  type AdminAccountStatus,
  type AdminRuntimeAccount,
} from '@/lib/platform-admin-account-types'
import { platformApi } from '@/lib/platform-api'
import { cn } from '@/lib/utils'

type AdminStatCardProps = {
  label: string
  value: string
  detail: string
  icon: ReactNode
  tone?: 'default' | 'dark' | 'risk'
}

type CreateFormState = {
  username: string
  displayName: string
  role: AdminAccountRole
  status: AdminAccountDbStatus
}

const numberFormatter = new Intl.NumberFormat('tr-TR')
const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const adminRoleOptions: AdminAccountRole[] = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT_AGENT', 'FINANCE_ADMIN']
const adminStatusOptions: AdminAccountDbStatus[] = ['ACTIVE', 'FROZEN', 'DISABLED']

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatDate(value: string | null) {
  if (!value) return 'Kayıt yok'
  return dateFormatter.format(new Date(value))
}

function buildEmptySnapshot(): AdminAccountsSnapshot {
  return {
    generatedAt: new Date(0).toISOString(),
    source: 'runtime',
    currentSession: {
      username: 'unknown',
      role: 'admin',
      adminRole: 'SUPER_ADMIN',
      source: 'env',
      accountId: null,
      issuedAt: new Date(0).toISOString(),
      expiresAt: new Date(0).toISOString(),
    },
    stats: {
      runtimeAccounts: 0,
      databaseAccounts: 0,
      activeDatabaseAccounts: 0,
      currentSessions: 0,
      roles: 0,
      adminManageRoles: 0,
      securityWarnings: 0,
      requiredMissing: 0,
      adminAuditEvents: 0,
    },
    accounts: [],
    controls: [],
    roleMatrix: [],
    audit: {
      source: 'supabase_unconfigured',
      status: 'MISSING',
      loadedEvents: 0,
      detail: 'Canlı admin hesap özeti bekleniyor.',
    },
    database: {
      source: 'supabase_unconfigured',
      status: 'MISSING',
      loadedAccounts: 0,
      detail: 'Veritabanı destekli admin hesap durumu bekleniyor.',
    },
    auditEvents: [],
    mutationPolicy: {
      enabled: false,
      reason: 'Canlı admin hesap politikası bekleniyor.',
      allowedActions: [],
      disabledActions: [],
    },
    notes: {
      dataPolicy: 'Canlı admin hesap özeti bekleniyor.',
      security: 'Gizli anahtar değerleri gösterilmez.',
      nextStep: 'Çoklu admin hesabı için veritabanı destekli admin kimliği gerekir.',
    },
  }
}

function statusVariant(status: AdminAccountStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'MISSING') return 'destructive'
  if (status === 'WATCH') return 'secondary'
  return 'default'
}

function accountStatusVariant(status: AdminAccountDbStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'DISABLED') return 'destructive'
  if (status === 'FROZEN') return 'secondary'
  return 'default'
}

function StatusBadge({ status }: { status: AdminAccountStatus }) {
  return (
    <Badge variant={statusVariant(status)} className="rounded-full px-3 py-1">
      {adminAccountStatusLabels[status]}
    </Badge>
  )
}

function AdminStatCard({ label, value, detail, icon, tone = 'default' }: AdminStatCardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md',
        tone === 'dark' && 'bg-primary text-primary-foreground',
        tone === 'risk' && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <CardContent className="pt-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={cn('truncate text-sm font-semibold text-muted-foreground', tone === 'dark' && 'text-white/65')}>
              {label}
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{value}</p>
            <p className={cn('mt-2 text-xs font-medium leading-5 text-muted-foreground', tone === 'dark' && 'text-white/60')}>
              {detail}
            </p>
          </div>
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground',
              tone === 'dark' && 'bg-white text-primary',
              tone === 'risk' && 'bg-destructive text-destructive-foreground',
            )}
          >
            {icon}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function ControlRow({ control }: { control: AdminAccountControl }) {
  return (
    <tr className="border-b border-border/70 align-top last:border-0">
      <td className="py-4 pr-4">
        <div className="min-w-[230px]">
          <p className="font-black">{control.label}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{control.key}</p>
          <Badge variant="outline" className="mt-2 rounded-full px-3 py-1">
            {adminAccountControlCategoryLabels[control.category]}
          </Badge>
        </div>
      </td>
      <td className="py-4 pr-4">
        <StatusBadge status={control.status} />
      </td>
      <td className="py-4 pr-4">
        <p className="font-black">{control.value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{control.required ? 'Zorunlu' : 'Opsiyonel'}</p>
      </td>
      <td className="py-4 pr-4">
        <p className="max-w-[460px] text-sm leading-6 text-muted-foreground">{control.detail}</p>
      </td>
    </tr>
  )
}

function AuditEventCard({ event }: { event: AdminAccountAuditEvent }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black">{event.action}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {event.entityType} / {event.entityId}
          </p>
        </div>
        <Badge variant="outline" className="rounded-full px-3 py-1">
          {event.source}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.metadataPreview}</p>
      <p className="mt-3 text-xs font-medium text-muted-foreground">
        {event.actorEmail || 'Aktör kaydı yok'} - {formatDate(event.createdAt)}
      </p>
    </div>
  )
}

function AccountCard({
  account,
  mutationEnabled,
  onRoleChange,
  onStatusChange,
  onResetPassword,
  onRevokeSessions,
  onDelete,
}: {
  account: AdminRuntimeAccount
  mutationEnabled: boolean
  onRoleChange: (account: AdminRuntimeAccount, role: AdminAccountRole) => void
  onStatusChange: (account: AdminRuntimeAccount, status: AdminAccountDbStatus) => void
  onResetPassword: (account: AdminRuntimeAccount) => void
  onRevokeSessions: (account: AdminRuntimeAccount) => void
  onDelete: (account: AdminRuntimeAccount) => void
}) {
  const isDatabaseAccount = account.source === 'database'
  const disabled = !mutationEnabled || !isDatabaseAccount

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-secondary/40">
      <CardHeader className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Fingerprint />
              {account.displayName}
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6">
              {account.source === 'env'
                ? 'Ortam değişkeni yedek admin hesabı. Veritabanı güncellemesi tamamlanana kadar güvenli yedek giriş olarak kalır.'
                : 'Veritabanı destekli admin hesabı. Rol, durum, şifre ve oturum iptal işlemleri denetim kaydı ile izlenir.'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={account.status} />
            <Badge variant={accountStatusVariant(account.accountStatus)} className="rounded-full px-3 py-1">
              {adminAccountDbStatusLabels[account.accountStatus]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-0 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background/70 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Kullanıcı</p>
          <p className="mt-2 text-2xl font-black">{account.username}</p>
          <p className="mt-1 text-sm text-muted-foreground">Kaynak: {account.source === 'database' ? 'admin hesapları tablosu' : 'ortam değişkeni yedeği'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background/70 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Rol</p>
          <select
            value={account.role}
            disabled={disabled}
            onChange={(event) => onRoleChange(account, event.target.value as AdminAccountRole)}
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-black disabled:opacity-60"
          >
            {adminRoleOptions.map((role) => (
              <option key={role} value={role}>
                {adminAccountRoleLabels[role]}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">{isDatabaseAccount ? 'Değişiklik denetim kaydı yazar.' : 'Ortam değişkeni yedek rolü sabittir.'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background/70 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Durum</p>
          <select
            value={account.accountStatus}
            disabled={disabled}
            onChange={(event) => onStatusChange(account, event.target.value as AdminAccountDbStatus)}
            className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-black disabled:opacity-60"
          >
            {adminStatusOptions.map((status) => (
              <option key={status} value={status}>
                {adminAccountDbStatusLabels[status]}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">Giriş izni: {account.canLogin ? 'Açık' : 'Kapalı'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background/70 p-5 xl:col-span-2">
          <p className="text-sm font-black">Güvenlik durumu</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <p className="text-sm text-muted-foreground">Son giriş: {formatDate(account.lastLoginAt)}</p>
            <p className="text-sm text-muted-foreground">Şifre rotasyonu: {formatDate(account.passwordRotatedAt)}</p>
            <p className="text-sm text-muted-foreground">Oturum iptali: {formatDate(account.sessionRevokedAt)}</p>
            <p className="text-sm text-muted-foreground">Başarısız giriş: {formatNumber(account.failedLoginCount)}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background/70 p-5">
          <p className="text-sm font-black">Oturum imza kaynağı</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{account.signerDetail}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {adminAccountSignerLabels[account.signerProvider]}
            </Badge>
            <StatusBadge status={account.signerStatus} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 xl:col-span-3">
          <Button type="button" variant="outline" disabled={disabled} onClick={() => onResetPassword(account)}>
            <KeyRound />
            Şifre sıfırla
          </Button>
          <Button type="button" variant="outline" disabled={disabled} onClick={() => onRevokeSessions(account)}>
            <Ban />
            Oturumları revoke et
          </Button>
          <Button type="button" variant="destructive" disabled={disabled} onClick={() => onDelete(account)}>
            <Trash2 />
            Soft delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminAccountsPage() {
  const [snapshot, setSnapshot] = useState<AdminAccountsSnapshot>(() => buildEmptySnapshot())
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CreateFormState>({
    username: '',
    displayName: '',
    role: 'SUPPORT_AGENT',
    status: 'ACTIVE',
  })
  const [operationLog, setOperationLog] = useState<string[]>(['Canlı admin hesap özeti bekleniyor.'])

  const pushLog = useCallback((message: string) => {
    setOperationLog((current) => [`${new Date().toLocaleTimeString('tr-TR')} - ${message}`, ...current].slice(0, 6))
  }, [])

  const loadAdminAccounts = useCallback(async (message?: string) => {
    setIsLoading(true)
    setDataError(null)

    try {
      const nextSnapshot = await platformApi.getAdminAccountsSnapshot()
      setSnapshot(nextSnapshot)
      if (message) pushLog(message)
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Canlı admin hesap bilgisi alınamadı.')
      setSnapshot(buildEmptySnapshot())
    } finally {
      setIsLoading(false)
    }
  }, [pushLog])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAdminAccounts('Canlı admin hesap özeti yüklendi.')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAdminAccounts])

  const runMutation = useCallback(async (action: () => Promise<{ message: string; temporaryPassword?: string }>, logMessage: string) => {
    setIsMutating(true)
    setDataError(null)

    try {
      const result = await action()
      if (result.temporaryPassword) setTemporaryPassword(result.temporaryPassword)
      pushLog(result.message || logMessage)
      await loadAdminAccounts(logMessage)
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Admin hesap işlemi başarısız oldu.')
    } finally {
      setIsMutating(false)
    }
  }, [loadAdminAccounts, pushLog])

  const handleCreate = useCallback(() => {
    void runMutation(
      () => platformApi.createAdminAccount(createForm),
      'Admin hesabı oluşturuldu.',
    )
    setCreateForm({ username: '', displayName: '', role: 'SUPPORT_AGENT', status: 'ACTIVE' })
  }, [createForm, runMutation])

  const handleRoleChange = useCallback((account: AdminRuntimeAccount, role: AdminAccountRole) => {
    if (role === account.role) return
    void runMutation(
      () => platformApi.updateAdminAccount(account.id, { role, revokeSessions: true }),
      `${account.username} rolü güncellendi.`,
    )
  }, [runMutation])

  const handleStatusChange = useCallback((account: AdminRuntimeAccount, status: AdminAccountDbStatus) => {
    if (status === account.accountStatus) return
    void runMutation(
      () => platformApi.updateAdminAccount(account.id, { status, revokeSessions: status !== 'ACTIVE' }),
      `${account.username} durumu güncellendi.`,
    )
  }, [runMutation])

  const handleResetPassword = useCallback((account: AdminRuntimeAccount) => {
    void runMutation(
      () => platformApi.updateAdminAccount(account.id, { resetPassword: true, revokeSessions: true }),
      `${account.username} için geçici parola üretildi.`,
    )
  }, [runMutation])

  const handleRevokeSessions = useCallback((account: AdminRuntimeAccount) => {
    void runMutation(
      () => platformApi.updateAdminAccount(account.id, { revokeSessions: true }),
      `${account.username} oturumları revoke edildi.`,
    )
  }, [runMutation])

  const handleDelete = useCallback((account: AdminRuntimeAccount) => {
    if (!window.confirm(`${account.username} admin hesabı geri alınabilir silme ile kapatılsın mı?`)) return
    void runMutation(
      () => platformApi.deleteAdminAccount(account.id),
      `${account.username} geri alınabilir silme ile kapatıldı.`,
    )
  }, [runMutation])

  const stats = useMemo(
    () => [
      {
        label: 'Veritabanı admin',
        value: formatNumber(snapshot.stats.databaseAccounts),
        detail: `${formatNumber(snapshot.stats.activeDatabaseAccounts)} aktif hesap`,
        icon: <Users />,
        tone: 'dark' as const,
      },
      {
        label: 'Rol yetkisi',
        value: formatNumber(snapshot.stats.roles),
        detail: `${formatNumber(snapshot.stats.adminManageRoles)} rol admin yönetebilir`,
        icon: <ShieldCheck />,
      },
      {
        label: 'Güvenlik uyarısı',
        value: formatNumber(snapshot.stats.securityWarnings),
        detail: 'Eksik veya izlenmesi gereken kontrol',
        icon: <AlertTriangle />,
        tone: snapshot.stats.requiredMissing > 0 ? ('risk' as const) : ('default' as const),
      },
      {
        label: 'Admin denetimi',
        value: formatNumber(snapshot.stats.adminAuditEvents),
        detail: 'Canlı Supabase denetim kayıtları',
        icon: <FileClock />,
      },
    ],
    [snapshot.stats],
  )

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <AdminStatCard key={stat.label} {...stat} />
        ))}
      </section>

      <Card>
        <CardHeader className="border-b border-border pb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                <LockKeyhole />
                Admin hesap yönetimi
              </CardTitle>
              <CardDescription className="mt-2 max-w-4xl leading-6">
                {snapshot.notes.dataPolicy} {snapshot.notes.security}
              </CardDescription>
            </div>
            <Button type="button" onClick={() => void loadAdminAccounts('Admin hesap özeti manuel yenilendi.')} disabled={isLoading || isMutating}>
              <RefreshCw className={cn((isLoading || isMutating) && 'animate-spin')} />
              Yenile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <KeyRound className="size-4" />
              Mevcut oturum
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {snapshot.currentSession.username} / {adminAccountRoleLabels[snapshot.currentSession.adminRole]} / bitiş: {formatDate(snapshot.currentSession.expiresAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <Database className="size-4" />
              Veritabanı kaynağı
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{snapshot.database.detail}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 p-5">
            <p className="flex items-center gap-2 text-sm font-black">
              <Ban className="size-4" />
              Değişiklik politikası
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{snapshot.mutationPolicy.reason}</p>
          </div>
        </CardContent>
      </Card>

      {temporaryPassword ? (
        <Card className="border-primary/30 bg-primary text-primary-foreground">
          <CardContent className="pt-0">
            <p className="font-black">Geçici parola</p>
            <p className="mt-2 text-sm text-white/70">Bu parola sadece bu ekranda bir kez gösterilir. Admin kullanıcı ilk girişten sonra değiştirmelidir.</p>
            <code className="mt-4 block rounded-2xl bg-white p-4 text-lg font-black tracking-wide text-primary">{temporaryPassword}</code>
            <Button type="button" variant="secondary" className="mt-4" onClick={() => setTemporaryPassword(null)}>
              Parolayı gizle
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {dataError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-0">
            <p className="font-black text-destructive">Canlı admin hesap işlemi başarısız</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{dataError}</p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                <UserPlus />
                Admin oluştur
              </CardTitle>
              <CardDescription>Yeni hesap veritabanı destekli oluşturulur, geçici parola sunucu tarafından üretilir ve şifreli özet olarak saklanır.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0 lg:grid-cols-4">
              <Input
                value={createForm.username}
                onChange={(event) => setCreateForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="kullanici.adi"
                disabled={!snapshot.mutationPolicy.enabled || isMutating}
              />
              <Input
                value={createForm.displayName}
                onChange={(event) => setCreateForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="Görünen ad"
                disabled={!snapshot.mutationPolicy.enabled || isMutating}
              />
              <select
                value={createForm.role}
                onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value as AdminAccountRole }))}
                disabled={!snapshot.mutationPolicy.enabled || isMutating}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              >
                {adminRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {adminAccountRoleLabels[role]}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={handleCreate} disabled={!snapshot.mutationPolicy.enabled || isMutating || !createForm.username || !createForm.displayName}>
                <UserPlus />
                Oluştur
              </Button>
            </CardContent>
          </Card>

          {snapshot.accounts.map((account) => (
            <AccountCard
              key={`${account.source}-${account.id}`}
              account={account}
              mutationEnabled={snapshot.mutationPolicy.enabled && !isMutating}
              onRoleChange={handleRoleChange}
              onStatusChange={handleStatusChange}
              onResetPassword={handleResetPassword}
              onRevokeSessions={handleRevokeSessions}
              onDelete={handleDelete}
            />
          ))}

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                <CheckCircle2 />
                Güvenlik kontrolleri
              </CardTitle>
              <CardDescription>Kimlik, oturum, rol ve admin değişiklik sınırları canlı koddan okunur.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="pb-4 font-black">Kontrol</th>
                      <th className="pb-4 font-black">Durum</th>
                      <th className="pb-4 font-black">Değer</th>
                      <th className="pb-4 font-black">Detay</th>
                    </tr>
                  </thead>
                  <tbody>{snapshot.controls.map((control) => <ControlRow key={control.key} control={control} />)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="text-lg font-black tracking-tight">Admin denetim olayları</CardTitle>
              <CardDescription>Canlı Supabase denetim kaynağından gelen son admin olayları.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-3">
                <span className="text-sm font-black">Kaynak durumu</span>
                <StatusBadge status={snapshot.audit.status} />
              </div>
              {snapshot.auditEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
                  Admin denetim olayı bulunamadı. Sahte denetim satırı gösterilmiyor.
                </div>
              ) : (
                snapshot.auditEvents.map((event) => <AuditEventCard key={event.id} event={event} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="text-lg font-black tracking-tight">Rol izin matrisi</CardTitle>
              <CardDescription>Admin hesapları için yetki kapsamı kod sözleşmesiyle sınırlıdır.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {snapshot.roleMatrix.map((role) => (
                <div key={role.role} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={role.canManageAdmins ? 'default' : 'secondary'} className="rounded-full px-3 py-1">
                      {role.label}
                    </Badge>
                    <p className="text-sm font-black">{formatNumber(role.permissionCount)} izin</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{role.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="text-lg font-black tracking-tight">İşlem geçmişi</CardTitle>
              <CardDescription>Bu ekranda yapılan özet yenilemeleri ve değişiklik işlemleri.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {operationLog.map((item) => (
                <div key={item} className="rounded-2xl border border-border bg-background p-3 text-xs font-medium text-muted-foreground">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
