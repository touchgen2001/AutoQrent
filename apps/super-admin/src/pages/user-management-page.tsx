import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Ban, CheckCircle2, KeyRound, RefreshCw, Search, ShieldCheck, Snowflake, Unlock, UserRound } from 'lucide-react'

import { CriticalActionConfirmation, type CriticalActionTone } from '@/components/platform/critical-action-confirmation'
import { EnterpriseDataTable } from '@/components/platform/enterprise-data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { platformApi } from '@/lib/platform-api'
import {
  derivePlatformUserStatus,
  platformAccessStatusLabels,
  platformSubscriptionPlanLabels,
  platformSubscriptionStatusLabels,
  platformUserRoleLabels,
  platformUserRoles,
  platformUserStatusLabels,
  platformUserStatuses,
  type PlatformUser,
  type PlatformUserStatus,
  type PlatformUserSummary,
} from '@/lib/platform-user-types'
import { hasPermission } from '@/lib/rbac'

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const userStatusVariant: Record<PlatformUserStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  PENDING: 'secondary',
  FROZEN: 'outline',
  BANNED: 'destructive',
}

type PendingUserStatusAction = {
  user: PlatformUser
  status: PlatformUserStatus
  title: string
  description: string
  confirmLabel: string
  tone: CriticalActionTone
}

function formatDate(value: string | null) {
  if (!value) return 'Kayıt yok'
  return dateFormatter.format(new Date(value))
}

function formatLocation(user: PlatformUser) {
  const parts = [user.gallery?.city, user.gallery?.district].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : 'Konum yok'
}

function UserStatusBadge({ status }: { status: PlatformUserStatus }) {
  return (
    <Badge variant={userStatusVariant[status]} className="rounded-full px-3 py-1">
      {platformUserStatusLabels[status]}
    </Badge>
  )
}

function StatCard({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <Card>
      <CardContent className="pt-0">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function buildEmptySummary(): PlatformUserSummary {
  return {
    authUsers: 0,
    galleryOwners: 0,
    usersWithGallery: 0,
    usersWithoutGallery: 0,
    galleriesWithoutAuth: 0,
    totalGalleries: 0,
    totalVehicles: 0,
    totalLeads: 0,
  }
}

function getUserStatusActionCopy(status: PlatformUserStatus) {
  if (status === 'BANNED') {
    return {
      title: 'Kullanıcı banlama onayı',
      description: 'Bu işlem kullanıcının kimlik ban kaydını ve platform erişimini birlikte değiştirir. Sebep denetim kaydına yazılır.',
      confirmLabel: 'Kullanıcıyı Banla',
      tone: 'destructive' as const,
    }
  }

  if (status === 'FROZEN') {
    return {
      title: 'Kullanıcı dondurma onayı',
      description: 'Bu işlem kullanıcının panele erişimini askıya alır. Yanlışlıkla yapılmaması için açık sebep gerekir.',
      confirmLabel: 'Kullanıcıyı Dondur',
      tone: 'warning' as const,
    }
  }

  return {
    title: 'Kullanıcı aktifleştirme onayı',
    description: 'Bu işlem askıdaki kullanıcının erişimini tekrar açar. Denetim kaydı için sebep zorunludur.',
    confirmLabel: 'Kullanıcıyı Aktifleştir',
    tone: 'neutral' as const,
  }
}

export function UserManagementPage() {
  const { session } = useAuth()
  const canManage = hasPermission(session!.user.role, 'users:manage')
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [summary, setSummary] = useState<PlatformUserSummary>(() => buildEmptySummary())
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [capReached, setCapReached] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PlatformUserStatus | 'ALL'>('ALL')
  const [roleFilter, setRoleFilter] = useState<(typeof platformUserRoles)[number] | 'ALL'>('ALL')
  const [operationLog, setOperationLog] = useState<string[]>(['Canlı Supabase kullanıcı verisi bekleniyor.'])
  const [pendingUserStatusAction, setPendingUserStatusAction] = useState<PendingUserStatusAction | null>(null)
  const [criticalConfirmation, setCriticalConfirmation] = useState('')
  const [criticalReason, setCriticalReason] = useState('')

  const pushLog = useCallback((message: string) => {
    setOperationLog((current) => [`${new Date().toLocaleTimeString('tr-TR')} - ${message}`, ...current].slice(0, 7))
  }, [])

  const loadUsers = useCallback(async (logMessage?: string) => {
    setLoading(true)
    setDataError(null)

    try {
      const payload = await platformApi.listUsers()
      setUsers(payload.users)
      setSummary(payload.summary)
      setGeneratedAt(payload.generatedAt)
      setCapReached(payload.capReached)
      if (logMessage) pushLog(logMessage)
    } catch (error) {
      setUsers([])
      setSummary(buildEmptySummary())
      setGeneratedAt(null)
      setCapReached(false)
      setDataError(error instanceof Error ? error.message : 'Canlı kullanıcı verisi alınamadı.')
    } finally {
      setLoading(false)
    }
  }, [pushLog])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers('Canlı Supabase kullanıcı verisi yüklendi.')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadUsers])

  const stats = useMemo(() => {
    const statusCounts = users.reduce(
      (acc, user) => {
        acc[derivePlatformUserStatus(user)] += 1
        return acc
      },
      {
        ACTIVE: 0,
        PENDING: 0,
        FROZEN: 0,
        BANNED: 0,
      } satisfies Record<PlatformUserStatus, number>,
    )

    return {
      total: users.length,
      verified: users.filter((user) => user.emailConfirmed).length,
      ...statusCounts,
    }
  }, [users])

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return users.filter((user) => {
      const status = derivePlatformUserStatus(user)
      const statusMatches = statusFilter === 'ALL' || status === statusFilter
      const roleMatches = roleFilter === 'ALL' || user.authorization.role === roleFilter
      const queryMatches =
        !normalized ||
        [
          user.email,
          user.fullName,
          user.phone,
          user.gallery?.name,
          user.gallery?.phone,
          user.gallery?.email,
          user.gallery?.city,
          user.gallery?.district,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalized)

      return statusMatches && roleMatches && queryMatches
    })
  }, [query, roleFilter, statusFilter, users])

  const runUserAction = useCallback(async (
    actionKey: string,
    user: PlatformUser,
    handler: (userId: string) => Promise<{ message?: string; email?: string; targetEmail?: string }>,
    fallbackMessage: string,
    reloadMessage: string,
  ) => {
    if (!canManage || !user.userId) return false

    setBusyAction(`${actionKey}:${user.userId}`)

    try {
      const result = await handler(user.userId)
      pushLog(result.message || fallbackMessage)
      await loadUsers(reloadMessage)
      return true
    } catch (error) {
      pushLog(error instanceof Error ? error.message : 'Kullanıcı işlemi tamamlanamadı.')
      return false
    } finally {
      setBusyAction(null)
    }
  }, [canManage, loadUsers, pushLog])

  const resetPassword = useCallback((user: PlatformUser) => {
    void runUserAction(
      'password',
      user,
      (userId) => platformApi.resetUserPassword(userId),
      `${user.email} için Supabase şifre sıfırlama isteği kabul edildi.`,
      'Şifre sıfırlama işlemi sonrası canlı kullanıcı listesi yenilendi.',
    )
  }, [runUserAction])

  const verifyEmail = useCallback((user: PlatformUser) => {
    void runUserAction(
      'verify',
      user,
      (userId) => platformApi.verifyUserEmail(userId),
      `${user.email} e-postası Supabase kimlik sistemi üzerinde doğrulandı.`,
      'E-posta doğrulama sonrası canlı kullanıcı listesi yenilendi.',
    )
  }, [runUserAction])

  const setUserStatus = useCallback((user: PlatformUser, status: PlatformUserStatus, reason: string) => {
    return runUserAction(
      `status-${status}`,
      user,
      (userId) => platformApi.setUserStatus(userId, status, reason),
      `${user.email} durumu ${platformUserStatusLabels[status]} olarak güncellendi.`,
      'Durum güncellemesi sonrası canlı kullanıcı listesi yenilendi.',
    )
  }, [runUserAction])

  const openUserStatusAction = useCallback((user: PlatformUser, status: PlatformUserStatus) => {
    const copy = getUserStatusActionCopy(status)
    setPendingUserStatusAction({
      user,
      status,
      ...copy,
    })
    setCriticalConfirmation('')
    setCriticalReason('')
  }, [])

  const closeUserStatusAction = useCallback(() => {
    if (busyAction) return
    setPendingUserStatusAction(null)
    setCriticalConfirmation('')
    setCriticalReason('')
  }, [busyAction])

  const confirmUserStatusAction = useCallback(() => {
    if (!pendingUserStatusAction) return

    const action = pendingUserStatusAction
    void (async () => {
      const completed = await setUserStatus(action.user, action.status, criticalReason.trim())
      if (completed) {
        setPendingUserStatusAction(null)
        setCriticalConfirmation('')
        setCriticalReason('')
      }
    })()
  }, [criticalReason, pendingUserStatusAction, setUserStatus])

  const columns = useMemo<ColumnDef<PlatformUser>[]>(
    () => [
      {
        accessorKey: 'email',
        header: 'Kullanıcı',
        cell: ({ row }) => (
          <div className="min-w-[260px]">
            <p className="font-bold">{row.original.fullName || row.original.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.original.email}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {row.original.userId ? `Kimlik ID: ${row.original.userId.slice(0, 8)}` : 'Kimlik kaydı yok'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Telefon',
        cell: ({ row }) => <span className="whitespace-nowrap font-semibold">{row.original.phone || 'Telefon yok'}</span>,
      },
      {
        accessorKey: 'authorization.role',
        header: 'Rol',
        cell: ({ row }) => <Badge variant="outline">{platformUserRoleLabels[row.original.authorization.role]}</Badge>,
      },
      {
        accessorKey: 'gallery.name',
        header: 'Galeri',
        cell: ({ row }) => (
          <div className="min-w-[210px]">
            <p className="font-semibold">{row.original.gallery?.name || 'Galeri bağlı değil'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatLocation(row.original)}</p>
          </div>
        ),
      },
      {
        accessorKey: 'authorization.accessStatus',
        header: 'Erişim',
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <UserStatusBadge status={derivePlatformUserStatus(row.original)} />
            <p className="text-xs text-muted-foreground">
              {platformAccessStatusLabels[row.original.authorization.accessStatus]}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'subscription.status',
        header: 'Abonelik',
        cell: ({ row }) => (
          <div className="min-w-[150px] text-sm">
            <p className="font-semibold">{platformSubscriptionPlanLabels[row.original.subscription.plan]}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {platformSubscriptionStatusLabels[row.original.subscription.status]}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'metrics.vehicleCount',
        header: 'Operasyon',
        cell: ({ row }) => (
          <div className="min-w-[120px] text-sm text-muted-foreground">
            <p>{row.original.metrics.vehicleCount} araç</p>
            <p>{row.original.metrics.leadCount} müşteri talebi</p>
          </div>
        ),
      },
      {
        accessorKey: 'lastSignInAt',
        header: 'Son giriş',
        cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.lastSignInAt)}</span>,
      },
      {
        id: 'actions',
        header: 'İşlemler',
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original
          const status = derivePlatformUserStatus(user)
          const disabled = !canManage || !user.userId
          const isBusy = user.userId ? busyAction?.endsWith(`:${user.userId}`) : false

          return (
            <div className="flex min-w-[520px] flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => resetPassword(user)} disabled={disabled || isBusy}>
                <KeyRound />
                Şifre sıfırla
              </Button>
              <Button size="sm" variant="outline" onClick={() => verifyEmail(user)} disabled={disabled || isBusy || user.emailConfirmed}>
                <CheckCircle2 />
                E-posta doğrula
              </Button>
              <Button size="sm" variant="outline" onClick={() => openUserStatusAction(user, 'ACTIVE')} disabled={disabled || isBusy || status === 'ACTIVE'}>
                <Unlock />
                Aktifleştir
              </Button>
              <Button size="sm" variant="outline" onClick={() => openUserStatusAction(user, 'FROZEN')} disabled={disabled || isBusy || status === 'FROZEN'}>
                <Snowflake />
                Dondur
              </Button>
              <Button size="sm" variant="destructive" onClick={() => openUserStatusAction(user, 'BANNED')} disabled={disabled || isBusy || status === 'BANNED'}>
                <Ban />
                Banla
              </Button>
            </div>
          )
        },
      },
    ],
    [busyAction, canManage, openUserStatusAction, resetPassword, verifyEmail],
  )

  return (
    <>
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Toplam kullanıcı" value={stats.total} detail="Canlı kimlik ve galeri sahipleri" />
        <StatCard label="Doğrulandı" value={stats.verified} detail="Supabase kimlik sisteminde onaylı e-postalar" />
        <StatCard label="Beklemede" value={stats.PENDING} detail="E-postası onaysız kimlik kayıtları" />
        <StatCard label="Donduruldu" value={stats.FROZEN} detail="Erişimi askıya alınanlar" />
        <StatCard label="Banlı" value={stats.BANNED} detail="Kimlik ban kaydı aktif olanlar" />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_410px]">
        <EnterpriseDataTable
          title="Kullanıcı Yönetimi"
          description="Kayıtlı Supabase kimlik kullanıcılarını, bağlı galerileri, abonelik durumunu ve erişim işlemlerini yönetin."
          data={filteredUsers}
          columns={columns}
          emptyLabel={loading ? 'Kullanıcılar yükleniyor...' : 'Bu filtreye uyan canlı kullanıcı bulunamadı.'}
          toolbar={
            <>
              <div className="flex min-w-[270px] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                <Search className="text-muted-foreground" />
                <Input
                  aria-label="Kullanıcılarda ara"
                  value={query}
                  placeholder="E-posta, telefon veya galeri ara"
                  className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select
                aria-label="Kullanıcıları duruma göre filtrele"
                value={statusFilter}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
                onChange={(event) => setStatusFilter(event.target.value as PlatformUserStatus | 'ALL')}
              >
                <option value="ALL">Tüm durumlar</option>
                {platformUserStatuses.map((status) => (
                  <option key={status} value={status}>
                    {platformUserStatusLabels[status]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Kullanıcıları role göre filtrele"
                value={roleFilter}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
                onChange={(event) => setRoleFilter(event.target.value as (typeof platformUserRoles)[number] | 'ALL')}
              >
                <option value="ALL">Tüm roller</option>
                {platformUserRoles.map((role) => (
                  <option key={role} value={role}>
                    {platformUserRoleLabels[role]}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={() => void loadUsers('Canlı kullanıcı listesi manuel yenilendi.')} disabled={loading}>
                <RefreshCw />
                Yenile
              </Button>
            </>
          }
        />

        <div className="flex flex-col gap-6">
          {dataError ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle>Canlı veri alınamadı</CardTitle>
                <CardDescription>{dataError}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck />
                Canlı kimlik politikası
              </CardTitle>
              <CardDescription className="text-white/65">
                İşlemler admin oturumu arkasındaki API üzerinden çalışır; servis yetki anahtarı tarayıcı tarafına çıkmaz.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-white/75">
              <p>Şifre sıfırlama Supabase kurtarma akışına gerçek istek gönderir; teslim edildi bilgisi uydurulmaz.</p>
              <p>E-posta doğrulama kimlik yönetimi üzerinden kullanıcı kaydını onaylar.</p>
              <p>Dondurma güvenli kayıt bilgisindeki erişim durumunu askıya alır.</p>
              <p>Banlama kimlik ban süresi ve erişim durumunu birlikte günceller.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound />
                Canlı özet
              </CardTitle>
              <CardDescription>
                {generatedAt ? `Son güncelleme: ${formatDate(generatedAt)}` : 'Henüz güncelleme alınmadı.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="rounded-xl border border-border bg-card px-3 py-2">
                Kimlik kullanıcıları: <span className="font-bold">{summary.authUsers}</span>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2">
                Galeri sahipleri: <span className="font-bold">{summary.galleryOwners}</span>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2">
                Kimlik kaydı olmayan galeri: <span className="font-bold">{summary.galleriesWithoutAuth}</span>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2">
                Toplam araç / müşteri talebi: <span className="font-bold">{summary.totalVehicles} / {summary.totalLeads}</span>
              </div>
              {capReached ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                  Kimlik kullanıcı limiti doldu. Daha yüksek limit için API parametresi artırılmalı.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>İşlem kayıtları</CardTitle>
              <CardDescription>Bu ekranda yapılan son canlı kullanıcı yönetimi işlemleri.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {operationLog.map((item) => (
                <div key={item} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
    <CriticalActionConfirmation
      open={Boolean(pendingUserStatusAction)}
      title={pendingUserStatusAction?.title || ''}
      description={pendingUserStatusAction?.description || ''}
      targetLabel={pendingUserStatusAction?.user.email || ''}
      confirmationPhrase={pendingUserStatusAction?.user.email || ''}
      confirmationValue={criticalConfirmation}
      reason={criticalReason}
      tone={pendingUserStatusAction?.tone || 'warning'}
      confirmLabel={pendingUserStatusAction?.confirmLabel}
      isBusy={
        pendingUserStatusAction?.user.userId
          ? busyAction === `status-${pendingUserStatusAction.status}:${pendingUserStatusAction.user.userId}`
          : false
      }
      onConfirmationValueChange={setCriticalConfirmation}
      onReasonChange={setCriticalReason}
      onCancel={closeUserStatusAction}
      onConfirm={confirmUserStatusAction}
    />
    </>
  )
}
