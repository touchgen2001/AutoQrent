import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Ban, Building2, Edit3, LogIn, PauseCircle, Plus, Search, Trash2 } from 'lucide-react'

import { CriticalActionConfirmation, type CriticalActionTone } from '@/components/platform/critical-action-confirmation'
import { EnterpriseDataTable } from '@/components/platform/enterprise-data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { platformApi } from '@/lib/platform-api'
import { hasPermission } from '@/lib/rbac'
import { useAuth } from '@/lib/auth'
import {
  tenantPaymentStatuses,
  tenantPackages,
  tenantStatuses,
  type Tenant,
  type TenantUpdateInput,
  type TenantPackage,
  type TenantPaymentStatus,
  type TenantStatus,
} from '@/lib/platform-tenant-types'
import { cn } from '@/lib/utils'

type TenantPanelMode = 'create' | 'edit'

type TenantFormState = {
  galleryName: string
  owner: string
  ownerEmail: string
  package: TenantPackage
  status: TenantStatus
  paymentStatus: TenantPaymentStatus
  vehicleCount: string
  reason: string
}

type PendingTenantStatusAction = {
  tenant: Tenant
  status: TenantStatus
  title: string
  description: string
  confirmLabel: string
  tone: CriticalActionTone
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const tenantStatusLabels: Record<TenantStatus, string> = {
  ACTIVE: 'Aktif',
  TRIAL: 'Deneme',
  SUSPENDED: 'Askıda',
  BANNED: 'Banlı',
  DELETED: 'Geri alınabilir şekilde silindi',
}

const tenantStatusVariant: Record<TenantStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  TRIAL: 'secondary',
  SUSPENDED: 'outline',
  BANNED: 'destructive',
  DELETED: 'destructive',
}

const tenantPaymentStatusLabels: Record<TenantPaymentStatus, string> = {
  PAID: 'Ödendi',
  TRIAL: 'Deneme',
  PAST_DUE: 'Gecikmiş',
  UNPAID: 'Ödenmedi',
  CANCELED: 'İptal',
}

const tenantPaymentStatusVariant: Record<TenantPaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PAID: 'default',
  TRIAL: 'secondary',
  PAST_DUE: 'destructive',
  UNPAID: 'outline',
  CANCELED: 'outline',
}

function formatDate(value: string | null) {
  if (!value) return 'Hiç giriş yok'
  return dateFormatter.format(new Date(value))
}

function buildCreateForm(): TenantFormState {
  return {
    galleryName: '',
    owner: '',
    ownerEmail: '',
    package: 'Başlangıç',
    status: 'TRIAL',
    paymentStatus: 'TRIAL',
    vehicleCount: '0',
    reason: '',
  }
}

function buildEditForm(tenant: Tenant): TenantFormState {
  return {
    galleryName: tenant.galleryName,
    owner: tenant.owner,
    ownerEmail: tenant.ownerEmail,
    package: tenant.package,
    status: tenant.status,
    paymentStatus: tenant.paymentStatus,
    vehicleCount: String(tenant.vehicleCount),
    reason: '',
  }
}

function hasCriticalTenantFormChange(form: TenantFormState, tenant: Tenant) {
  return (
    form.status !== tenant.status ||
    form.paymentStatus !== tenant.paymentStatus ||
    form.ownerEmail.trim().toLowerCase() !== tenant.ownerEmail.toLowerCase()
  )
}

function buildTenantPatch(form: TenantFormState, tenant: Tenant, reasonRequired: boolean): TenantUpdateInput {
  const vehicleCount = Math.max(0, Number.parseInt(form.vehicleCount || '0', 10))
  const patch: TenantUpdateInput = {}
  const galleryName = form.galleryName.trim()
  const owner = form.owner.trim()
  const ownerEmail = form.ownerEmail.trim()
  const reason = form.reason.trim()

  if (galleryName && galleryName !== tenant.galleryName) patch.galleryName = galleryName
  if (owner && owner !== tenant.owner) patch.owner = owner
  if (ownerEmail && ownerEmail.toLowerCase() !== tenant.ownerEmail.toLowerCase()) patch.ownerEmail = ownerEmail
  if (form.package !== tenant.package) patch.package = form.package
  if (form.status !== tenant.status) patch.status = form.status
  if (form.paymentStatus !== tenant.paymentStatus) patch.paymentStatus = form.paymentStatus
  if (vehicleCount !== tenant.vehicleCount) patch.vehicleCount = vehicleCount
  if (reasonRequired) patch.reason = reason

  return patch
}

function getTenantStatusActionCopy(status: TenantStatus) {
  if (status === 'BANNED') {
    return {
      title: 'Galeri hesabı banlama onayı',
      description: 'Bu işlem galeri sahibinin erişimini platform seviyesinde engeller ve sebebi denetim kaydına yazılır.',
      confirmLabel: 'Galeri Hesabını Banla',
      tone: 'destructive' as const,
    }
  }

  if (status === 'DELETED') {
    return {
      title: 'Geri alınabilir silme onayı',
      description: 'Bu işlem galeri hesabını pasif duruma alır. Kullanıcıya etkisi olduğu için açık sebep zorunludur.',
      confirmLabel: 'Geri Alınabilir Sil',
      tone: 'destructive' as const,
    }
  }

  if (status === 'SUSPENDED') {
    return {
      title: 'Askıya alma onayı',
      description: 'Bu işlem galeri erişimini geçici olarak durdurur. Hata ile yapılmaması için sebep ve onay metni gerekir.',
      confirmLabel: 'Askıya Al',
      tone: 'warning' as const,
    }
  }

  return {
    title: 'Galeri hesabı durum onayı',
    description: 'Bu kritik durum değişikliğinin sebebi denetim kaydına yazılır.',
    confirmLabel: 'Durumu Güncelle',
    tone: 'neutral' as const,
  }
}

function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return (
    <Badge variant={tenantStatusVariant[status]} className="rounded-full px-3 py-1">
      {tenantStatusLabels[status]}
    </Badge>
  )
}

function TenantPaymentStatusBadge({ status }: { status: TenantPaymentStatus }) {
  return (
    <Badge variant={tenantPaymentStatusVariant[status]} className="rounded-full px-3 py-1">
      {tenantPaymentStatusLabels[status]}
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

export function TenantManagementPage() {
  const { session } = useAuth()
  const canManage = hasPermission(session!.user.role, 'tenants:manage')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'ALL'>('ALL')
  const [panelMode, setPanelMode] = useState<TenantPanelMode>('create')
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null)
  const [form, setForm] = useState<TenantFormState>(() => buildCreateForm())
  const [dataError, setDataError] = useState<string | null>(null)
  const [impersonationBanner, setImpersonationBanner] = useState<string | null>(null)
  const [operationLog, setOperationLog] = useState<string[]>(['Canlı admin API bağlantısı hazırlanıyor.'])
  const [busyTenantAction, setBusyTenantAction] = useState<string | null>(null)
  const [pendingTenantStatusAction, setPendingTenantStatusAction] = useState<PendingTenantStatusAction | null>(null)
  const [criticalConfirmation, setCriticalConfirmation] = useState('')
  const [criticalReason, setCriticalReason] = useState('')

  useEffect(() => {
    let alive = true

    platformApi
      .listTenants()
      .then((items) => {
        if (!alive) return
        setTenants(items)
        setDataError(null)
        setOperationLog([`${new Date().toLocaleTimeString('tr-TR')} - Canlı Supabase galeri hesabı verisi yüklendi.`])
      })
      .catch((error: unknown) => {
        if (!alive) return
        setDataError(error instanceof Error ? error.message : 'Canlı galeri hesabı verisi alınamadı.')
        setTenants([])
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const stats = useMemo(() => {
    const active = tenants.filter((tenant) => tenant.status === 'ACTIVE').length
    const suspended = tenants.filter((tenant) => tenant.status === 'SUSPENDED').length
    const banned = tenants.filter((tenant) => tenant.status === 'BANNED').length
    const deleted = tenants.filter((tenant) => tenant.status === 'DELETED').length
    const paymentRisk = tenants.filter((tenant) => tenant.paymentStatus === 'PAST_DUE' || tenant.paymentStatus === 'UNPAID').length
    const vehicles = tenants.reduce((total, tenant) => total + tenant.vehicleCount, 0)

    return {
      total: tenants.length,
      active,
      suspended,
      banned,
      deleted,
      paymentRisk,
      vehicles,
    }
  }, [tenants])

  const filteredTenants = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return tenants.filter((tenant) => {
      const statusMatches = statusFilter === 'ALL' || tenant.status === statusFilter
      const queryMatches =
        !normalized ||
        tenant.galleryName.toLowerCase().includes(normalized) ||
        tenant.owner.toLowerCase().includes(normalized) ||
        tenant.ownerEmail.toLowerCase().includes(normalized)

      return statusMatches && queryMatches
    })
  }, [query, statusFilter, tenants])

  const pushLog = useCallback((message: string) => {
    setOperationLog((current) => [`${new Date().toLocaleTimeString('tr-TR')} - ${message}`, ...current].slice(0, 6))
  }, [])

  function openCreatePanel() {
    setPanelMode('create')
    setEditingTenantId(null)
    setForm(buildCreateForm())
  }

  const openEditPanel = useCallback((tenant: Tenant) => {
    setPanelMode('edit')
    setEditingTenantId(tenant.id)
    setForm(buildEditForm(tenant))
  }, [])

  const editingTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === editingTenantId) || null,
    [editingTenantId, tenants],
  )
  const editRequiresReason = panelMode === 'edit' && editingTenant ? hasCriticalTenantFormChange(form, editingTenant) : false
  const editReasonReady = !editRequiresReason || form.reason.trim().length >= 12

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage) return

    if (panelMode === 'create') {
      const result = await platformApi.createTenant({
        galleryName: form.galleryName.trim(),
        owner: form.owner.trim(),
        ownerEmail: form.ownerEmail.trim(),
        package: form.package,
      })
      const tenant = result.tenant
      setTenants((current) => [tenant, ...current])
      setForm(buildCreateForm())
      pushLog(`${tenant.galleryName} galerisi oluşturuldu.`)
      if (result.temporaryPassword) {
        pushLog(`${tenant.ownerEmail} için geçici şifre üretildi: ${result.temporaryPassword}`)
      }
      return
    }

    if (!editingTenantId) return
    if (!editingTenant) return
    if (editRequiresReason && form.reason.trim().length < 12) {
      pushLog('Kritik galeri hesabı değişikliği için en az 12 karakterlik işlem sebebi gerekir.')
      return
    }

    const patch = buildTenantPatch(form, editingTenant, editRequiresReason)
    if (Object.keys(patch).length === 0) {
      pushLog('Kaydedilecek galeri hesabı değişikliği bulunamadı.')
      return
    }

    const updated = await platformApi.updateTenant(editingTenantId, patch)
    setTenants((current) => current.map((tenant) => (tenant.id === updated.id ? updated : tenant)))
    setForm(buildEditForm(updated))
    pushLog(`${updated.galleryName} galerisi güncellendi.`)
  }

  const setTenantStatus = useCallback(async (tenant: Tenant, status: TenantStatus, reason: string) => {
    if (!canManage) return

    setBusyTenantAction(`${tenant.id}:${status}`)

    try {
      const updated = await platformApi.setTenantStatus(tenant.id, status, reason)
      setTenants((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      pushLog(`${tenant.galleryName} durumu ${tenantStatusLabels[status]} olarak değiştirildi.`)
    } catch (error) {
      pushLog(error instanceof Error ? error.message : 'Galeri hesabı durum değişikliği tamamlanamadı.')
    } finally {
      setBusyTenantAction(null)
    }
  }, [canManage, pushLog])

  const openTenantCriticalAction = useCallback((tenant: Tenant, status: TenantStatus) => {
    const copy = getTenantStatusActionCopy(status)
    setPendingTenantStatusAction({
      tenant,
      status,
      ...copy,
    })
    setCriticalConfirmation('')
    setCriticalReason('')
  }, [])

  const closeTenantCriticalAction = useCallback(() => {
    if (busyTenantAction) return
    setPendingTenantStatusAction(null)
    setCriticalConfirmation('')
    setCriticalReason('')
  }, [busyTenantAction])

  const confirmTenantCriticalAction = useCallback(() => {
    if (!pendingTenantStatusAction) return

    const action = pendingTenantStatusAction
    void (async () => {
      await setTenantStatus(action.tenant, action.status, criticalReason.trim())
      setPendingTenantStatusAction(null)
      setCriticalConfirmation('')
      setCriticalReason('')
    })()
  }, [criticalReason, pendingTenantStatusAction, setTenantStatus])

  const impersonateTenant = useCallback(async (tenant: Tenant) => {
    if (!canManage) return

    const preview = await platformApi.createImpersonationPreview(tenant.id)
    const message = `${preview.galleryName} galeri hesabına salt okunur giriş başlatıldı.`
    setImpersonationBanner(message)
    pushLog(message)
  }, [canManage, pushLog])

  const columns = useMemo<ColumnDef<Tenant>[]>(
    () => [
      {
        accessorKey: 'galleryName',
        header: 'Galeri adı',
        cell: ({ row }) => (
          <div className="min-w-[220px]">
            <p className="font-bold">{row.original.galleryName}</p>
            <p className="mt-1 text-xs text-muted-foreground">ID: {row.original.id}</p>
          </div>
        ),
      },
      {
        accessorKey: 'owner',
        header: 'Sahip kullanıcı',
        cell: ({ row }) => (
          <div className="min-w-[190px]">
            <p className="font-semibold">{row.original.owner}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.original.ownerEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: 'package',
        header: 'Paket',
        cell: ({ row }) => <Badge variant="outline">{row.original.package}</Badge>,
      },
      {
        accessorKey: 'status',
        header: 'Durum',
        cell: ({ row }) => <TenantStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Ödeme durumu',
        cell: ({ row }) => <TenantPaymentStatusBadge status={row.original.paymentStatus} />,
      },
      {
        accessorKey: 'vehicleCount',
        header: 'Araç',
        cell: ({ row }) => <span className="font-black tabular-nums">{row.original.vehicleCount}</span>,
      },
      {
        accessorKey: 'lastLogin',
        header: 'Son giriş',
        cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.lastLogin)}</span>,
      },
      {
        id: 'actions',
        header: 'İşlemler',
        enableSorting: false,
        cell: ({ row }) => {
          const tenant = row.original
          const isDeleted = tenant.status === 'DELETED'
          const isBanned = tenant.status === 'BANNED'
          const isTerminal = isDeleted || isBanned
          const isBusy = busyTenantAction?.startsWith(`${tenant.id}:`) || false

          return (
            <div className="flex min-w-[520px] flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => openEditPanel(tenant)} disabled={!canManage || isBusy}>
                <Edit3 />
                Düzenle
              </Button>
              <Button size="sm" variant="outline" onClick={() => openTenantCriticalAction(tenant, 'SUSPENDED')} disabled={!canManage || isTerminal || isBusy}>
                <PauseCircle />
                Askıya al
              </Button>
              <Button size="sm" variant="outline" onClick={() => openTenantCriticalAction(tenant, 'BANNED')} disabled={!canManage || isTerminal || isBusy}>
                <Ban />
                Banla
              </Button>
              <Button size="sm" variant="outline" onClick={() => impersonateTenant(tenant)} disabled={!canManage || isTerminal || isBusy}>
                <LogIn />
                Galeri hesabına gir
              </Button>
              <Button size="sm" variant="destructive" onClick={() => openTenantCriticalAction(tenant, 'DELETED')} disabled={!canManage || isDeleted || isBusy}>
                <Trash2 />
                Geri alınabilir sil
              </Button>
            </div>
          )
        },
      },
    ],
    [busyTenantAction, canManage, impersonateTenant, openEditPanel, openTenantCriticalAction],
  )

  return (
    <>
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-7">
        <StatCard label="Toplam galeri" value={stats.total} detail="Canlı Supabase galeri kayıtları" />
        <StatCard label="Aktif" value={stats.active} detail="Operasyonel galeriler" />
        <StatCard label="Askıda" value={stats.suspended} detail="Erişimi geçici durdurulanlar" />
        <StatCard label="Banlı" value={stats.banned} detail="Platformdan engellenenler" />
        <StatCard label="Ödeme riski" value={stats.paymentRisk} detail="Gecikmiş veya ödenmemiş" />
        <StatCard label="Geri alınabilir silinen" value={stats.deleted} detail="Geri alınabilir kayıtlar" />
        <StatCard label="Araç" value={stats.vehicles} detail="Toplam galeri envanteri" />
      </section>

      {dataError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-0">
            <p className="text-sm font-black text-destructive">Canlı galeri hesabı verisi alınamadı</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{dataError}</p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Bu ekranda sahte galeri verisi gösterilmez. Admin oturumu ve Supabase servis anahtarı yapılandırması hazır olmalıdır.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {impersonationBanner ? (
        <Card className="border-primary bg-primary text-primary-foreground">
          <CardContent className="flex flex-col gap-3 pt-0 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-black">Galeri hesabına gir</p>
              <p className="mt-1 text-sm text-white/70">{impersonationBanner}</p>
            </div>
            <Button variant="secondary" onClick={() => setImpersonationBanner(null)}>
              Girişi kapat
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <EnterpriseDataTable
          title="Galeri Yönetimi"
          description="Galerileri oluşturun, düzenleyin, askıya alın, banlayın, yumuşak silin ve galeri hesabına salt okunur giriş başlatın."
          data={filteredTenants}
          columns={columns}
          emptyLabel={loading ? 'Canlı galeriler yükleniyor...' : 'Bu filtreye uyan canlı galeri bulunamadı.'}
          toolbar={
            <>
              <div className="flex min-w-[260px] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                <Search className="text-muted-foreground" />
                <Input
                  aria-label="Galerilerde ara"
                  value={query}
                  placeholder="Galeri, sahip veya e-posta ara"
                  className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select
                aria-label="Galerileri duruma göre filtrele"
                value={statusFilter}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold"
                onChange={(event) => setStatusFilter(event.target.value as TenantStatus | 'ALL')}
              >
                <option value="ALL">Tüm durumlar</option>
                {tenantStatuses.map((status) => (
                  <option key={status} value={status}>
                    {tenantStatusLabels[status]}
                  </option>
                ))}
              </select>
              <Button onClick={openCreatePanel} disabled={!canManage}>
                <Plus />
                Galeri oluştur
              </Button>
            </>
          }
        />

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 />
                {panelMode === 'create' ? 'Galeri oluştur' : 'Galeriyi düzenle'}
              </CardTitle>
              <CardDescription>
                {canManage ? 'Değişiklikler canlı admin API üzerinden Supabase verisini günceller.' : 'Mevcut önizleme rolünüz yalnızca görüntüleyebilir.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  Galeri adı
                  <Input
                    required
                    value={form.galleryName}
                    disabled={!canManage}
                    onChange={(event) => setForm((current) => ({ ...current, galleryName: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  Galeri sahibi
                  <Input
                    required
                    value={form.owner}
                    disabled={!canManage}
                    onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  Sahip e-postası
                  <Input
                    required
                    type="email"
                    value={form.ownerEmail}
                    disabled={!canManage}
                    onChange={(event) => setForm((current) => ({ ...current, ownerEmail: event.target.value }))}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm font-semibold">
                    Paket
                    <select
                      value={form.package}
                      disabled={!canManage}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) => setForm((current) => ({ ...current, package: event.target.value as TenantPackage }))}
                    >
                      {tenantPackages.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold">
                    Ödeme durumu
                    <select
                      value={form.paymentStatus}
                      disabled={!canManage || panelMode === 'create'}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, paymentStatus: event.target.value as TenantPaymentStatus }))
                      }
                    >
                      {tenantPaymentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {tenantPaymentStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold">
                    Durum
                    <select
                      value={form.status}
                      disabled={!canManage || panelMode === 'create'}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TenantStatus }))}
                    >
                      {tenantStatuses.map((status) => (
                        <option key={status} value={status}>
                          {tenantStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  Araç sayısı
                  <Input
                    min={0}
                    type="number"
                    value={form.vehicleCount}
                    disabled={!canManage || panelMode === 'create'}
                    onChange={(event) => setForm((current) => ({ ...current, vehicleCount: event.target.value }))}
                  />
                </label>
                {panelMode === 'edit' ? (
                  <label className="flex flex-col gap-2 text-sm font-semibold">
                    Kritik işlem sebebi
                    <Textarea
                      value={form.reason}
                      disabled={!canManage}
                      rows={4}
                      placeholder="Durum, ödeme durumu veya sahip e-postası değişiyorsa sebep zorunludur."
                      onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                    />
                    <span className={cn('text-xs font-medium', editReasonReady ? 'text-muted-foreground' : 'text-destructive')}>
                      {editRequiresReason
                        ? 'Bu değişiklik kritik. En az 12 karakterlik sebep denetim kaydına eklenecek.'
                        : 'Kritik alan değişmediği için sebep zorunlu değil.'}
                    </span>
                  </label>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={!canManage || !form.galleryName.trim() || !form.owner.trim() || !form.ownerEmail.trim() || !editReasonReady}
                  >
                    {panelMode === 'create' ? 'Galeri oluştur' : 'Değişiklikleri kaydet'}
                  </Button>
                  <Button type="button" variant="outline" onClick={openCreatePanel}>
                    Sıfırla
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className={cn(!canManage && 'bg-secondary')}>
            <CardHeader>
              <CardTitle>İşlem kayıtları</CardTitle>
              <CardDescription>Bu oturumdaki son galeri yönetimi olayları.</CardDescription>
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
      open={Boolean(pendingTenantStatusAction)}
      title={pendingTenantStatusAction?.title || ''}
      description={pendingTenantStatusAction?.description || ''}
      targetLabel={pendingTenantStatusAction?.tenant.galleryName || ''}
      confirmationPhrase={pendingTenantStatusAction?.tenant.galleryName || ''}
      confirmationValue={criticalConfirmation}
      reason={criticalReason}
      tone={pendingTenantStatusAction?.tone || 'warning'}
      confirmLabel={pendingTenantStatusAction?.confirmLabel}
      isBusy={
        pendingTenantStatusAction
          ? busyTenantAction === `${pendingTenantStatusAction.tenant.id}:${pendingTenantStatusAction.status}`
          : false
      }
      onConfirmationValueChange={setCriticalConfirmation}
      onReasonChange={setCriticalReason}
      onCancel={closeTenantCriticalAction}
      onConfirm={confirmTenantCriticalAction}
    />
    </>
  )
}
