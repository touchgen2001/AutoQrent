'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, KeyRound, Lock, ShieldCheck, UserCog, UserPlus, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getPanelRoleDefinition,
  type PanelStaffRole,
} from '@/lib/lead-assignment'
import type { SubscriptionFeature } from '@/lib/subscription-plans'
import {
  DEFAULT_ROLE_PERMISSIONS,
  PANEL_PERMISSIONS,
  PANEL_PERMISSION_LABELS,
  type PanelPermission,
} from '@/lib/panel-permissions'

type TeamMemberStatus = 'active' | 'invited' | 'suspended'

type TeamMember = {
  id: string
  name: string
  email?: string
  role: PanelStaffRole
  status: TeamMemberStatus
  permissions: PanelPermission[]
  invitedAt: string | null
  acceptedAt: string | null
}

type SubscriptionTeamState = {
  planName: string
  usage: {
    users: {
      used: number
      limit: number | null
      remaining: number | null
    }
  }
  features: Record<SubscriptionFeature, boolean>
}

type TeamApiResponse = {
  ok?: boolean
  message?: string
  members?: TeamMember[]
  canManage?: boolean
}

type TeamMembersManagerProps = {
  currentUser: {
    name: string
    email: string
    role?: PanelStaffRole
  } | null
  subscription: SubscriptionTeamState | null
}

const roleOptions: Array<{ role: Exclude<PanelStaffRole, 'owner'>; label: string }> = [
  { role: 'sales', label: 'Satış Danışmanı' },
  { role: 'viewer', label: 'Sadece Görüntüleyen' },
]

const statusLabels: Record<TeamMemberStatus, string> = {
  active: 'Aktif',
  invited: 'Davetli',
  suspended: 'Askıda',
}

function formatLimit(subscription: SubscriptionTeamState | null) {
  if (!subscription) return 'Yükleniyor'
  const metric = subscription.usage.users
  return metric.limit === null ? `${metric.used} / Sınırsız` : `${metric.used} / ${metric.limit}`
}

function getPlanLockMessage(subscription: SubscriptionTeamState | null) {
  if (!subscription) return 'Paket bilgisi yükleniyor.'
  if (!subscription.features['team.manage']) {
    return 'Personel hesabı açmak için Pro veya üstü pakete geçin.'
  }
  if (subscription.usage.users.limit !== null && subscription.usage.users.remaining !== null && subscription.usage.users.remaining <= 0) {
    return 'Personel kullanıcı limitiniz doldu. Ek hesap için paketi yükseltin.'
  }
  return null
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  return text ? JSON.parse(text) as T : {} as T
}

export function TeamMembersManager({ currentUser, subscription }: TeamMembersManagerProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [canManageFromApi, setCanManageFromApi] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'sales' as Exclude<PanelStaffRole, 'owner'>,
    permissions: [...DEFAULT_ROLE_PERMISSIONS.sales],
  })

  const planLockMessage = getPlanLockMessage(subscription)
  const canManage = currentUser?.role === 'owner' && canManageFromApi
  const canCreate = canManage && !planLockMessage && !isSaving

  const sortedMembers = useMemo(
    () => [...members].sort((left, right) => {
      if (left.role === 'owner') return -1
      if (right.role === 'owner') return 1
      return left.name.localeCompare(right.name, 'tr')
    }),
    [members],
  )

  const loadMembers = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/panel/team-members', { cache: 'no-store' })
      const data = await parseJson<TeamApiResponse>(response)
      if (!response.ok || !data.ok) {
        setErrorMessage(data.message || 'Personel hesapları yüklenemedi.')
        return
      }
      setMembers(data.members || [])
      setCanManageFromApi(Boolean(data.canManage))
    } catch {
      setErrorMessage('Ağ hatası nedeniyle personel hesapları yüklenemedi.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMembers()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const createMember = async () => {
    if (!canCreate) return

    setIsSaving(true)
    setMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/panel/team-members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await parseJson<TeamApiResponse>(response)
      if (!response.ok || !data.ok) {
        setErrorMessage(data.message || 'Personel hesabı açılamadı.')
        return
      }
      setMembers(data.members || [])
      setForm({
        fullName: '',
        email: '',
        password: '',
        role: 'sales',
        permissions: [...DEFAULT_ROLE_PERMISSIONS.sales],
      })
      setMessage(data.message || 'Personel hesabı açıldı.')
    } catch {
      setErrorMessage('Ağ hatası nedeniyle personel hesabı açılamadı.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateMemberPermissions = async (member: TeamMember, permissions: PanelPermission[]) => {
    if (!canManage || member.role === 'owner') return
    setIsSaving(true)
    setMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/panel/team-members', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ memberId: member.id, permissions }),
      })
      const data = await parseJson<TeamApiResponse>(response)
      if (!response.ok || !data.ok) {
        setErrorMessage(data.message || 'Personel yetkileri güncellenemedi.')
        return
      }
      setMembers(data.members || [])
      setMessage('Personel yetkileri güncellendi.')
    } catch {
      setErrorMessage('Ağ hatası nedeniyle personel yetkileri güncellenemedi.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateMemberStatus = async (member: TeamMember, status: TeamMemberStatus) => {
    if (!canManage || member.role === 'owner') return
    setIsSaving(true)
    setMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/panel/team-members', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ memberId: member.id, status }),
      })
      const data = await parseJson<TeamApiResponse>(response)
      if (!response.ok || !data.ok) {
        setErrorMessage(data.message || 'Personel hesabı güncellenemedi.')
        return
      }
      setMembers(data.members || [])
      setMessage(data.message || 'Personel hesabı güncellendi.')
    } catch {
      setErrorMessage('Ağ hatası nedeniyle personel hesabı güncellenemedi.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className='p-6 border-border/50'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div>
          <h3 className='font-semibold text-foreground'>Personel Hesapları</h3>
          <p className='mt-1 text-sm leading-6 text-muted-foreground'>
            Satış danışmanı ve görüntüleyen hesaplarını buradan açın. Personel kendi e-postası ve geçici şifresiyle panele giriş yapar.
          </p>
        </div>
        <div className='rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm'>
          <p className='text-xs text-muted-foreground'>Paket kullanıcı hakkı</p>
          <p className='mt-1 font-semibold text-foreground'>{formatLimit(subscription)}</p>
          <p className='mt-1 text-xs text-muted-foreground'>{subscription?.planName || 'Paket yükleniyor'}</p>
        </div>
      </div>

      {message && (
        <div className='mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700'>
          {message}
        </div>
      )}

      {errorMessage && (
        <div className='mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
          {errorMessage}
        </div>
      )}

      <div className='mt-5 rounded-xl border border-border bg-muted/20 p-4'>
        <div className='grid gap-4 md:grid-cols-[1fr_1fr_1fr_180px_auto]'>
          <div className='space-y-2'>
            <Label htmlFor='teamFullName'>Personel adı</Label>
            <Input
              id='teamFullName'
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              placeholder='Örn. Ayşe Yılmaz'
              disabled={!canCreate}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='teamEmail'>E-posta</Label>
            <Input
              id='teamEmail'
              type='email'
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder='personel@galeri.com'
              disabled={!canCreate}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='teamPassword'>Geçici şifre</Label>
            <Input
              id='teamPassword'
              type='password'
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder='En az 8 karakter'
              disabled={!canCreate}
            />
          </div>
          <div className='space-y-2'>
            <Label>Rol</Label>
            <Select
              value={form.role}
              onValueChange={(value) => {
                const role = value as Exclude<PanelStaffRole, 'owner'>
                setForm((current) => ({
                  ...current,
                  role,
                  permissions: [...DEFAULT_ROLE_PERMISSIONS[role]],
                }))
              }}
              disabled={!canCreate}
            >
              <SelectTrigger>
                <SelectValue placeholder='Rol seçin' />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.role} value={option.role}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex items-end'>
            <Button type='button' onClick={() => void createMember()} disabled={!canCreate}>
              <UserPlus className='mr-2 h-4 w-4' />
              {isSaving ? 'Açılıyor...' : 'Hesap Aç'}
            </Button>
          </div>
        </div>
        <p className='mt-3 text-xs text-muted-foreground'>
          Geçici şifreyi güvenli kanaldan iletin. Personel gerekirse giriş ekranındaki şifre sıfırlama akışını kullanabilir.
        </p>
        <div className='mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {PANEL_PERMISSIONS.map((permission) => (
            <label key={permission} className='flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs'>
              <input
                type='checkbox'
                checked={form.permissions.includes(permission)}
                disabled={!canCreate}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  permissions: event.target.checked
                    ? [...current.permissions, permission]
                    : current.permissions.filter((item) => item !== permission),
                }))}
              />
              {PANEL_PERMISSION_LABELS[permission]}
            </label>
          ))}
        </div>
        {planLockMessage && (
          <p className='mt-3 flex items-center gap-2 text-xs font-medium text-amber-700'>
            <Lock className='h-3.5 w-3.5' />
            {planLockMessage}
          </p>
        )}
        {!canManage && currentUser?.role !== 'owner' && (
          <p className='mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground'>
            <Lock className='h-3.5 w-3.5' />
            Bu ekranda hesap açma yetkisi sadece galeri sahibindedir.
          </p>
        )}
      </div>

      <div className='mt-5 grid gap-3'>
        {isLoading ? (
          <div className='rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground'>
            Personel hesapları yükleniyor...
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className='rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground'>
            Henüz personel hesabı yok.
          </div>
        ) : sortedMembers.map((member) => {
          const role = getPanelRoleDefinition(member.role)
          const isOwner = member.role === 'owner'
          const isSuspended = member.status === 'suspended'

          return (
            <div key={member.id} className='flex flex-col gap-3 rounded-xl border border-border bg-background p-4 md:flex-row md:items-center md:justify-between'>
              <div className='flex items-start gap-3'>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isOwner ? 'bg-emerald-500/10 text-emerald-700' : 'bg-accent/10 text-accent'}`}>
                  {isOwner ? <ShieldCheck className='h-5 w-5' /> : <UserCog className='h-5 w-5' />}
                </div>
                <div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='font-semibold text-foreground'>{member.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isSuspended ? 'bg-red-500/10 text-red-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                      {statusLabels[member.status]}
                    </span>
                  </div>
                  <p className='mt-1 text-sm text-muted-foreground'>{member.email || 'E-posta yok'}</p>
                  <p className='mt-1 text-xs text-muted-foreground'>{role.title} · {role.summary}</p>
                  <div className='mt-3 flex flex-wrap gap-1.5'>
                    {(isOwner ? DEFAULT_ROLE_PERMISSIONS.owner : member.permissions || []).map((permission) => (
                      <span key={permission} className='inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground'>
                        <KeyRound className='h-3 w-3' />
                        {PANEL_PERMISSION_LABELS[permission]}
                      </span>
                    ))}
                  </div>
                  {!isOwner && canManage && (
                    <details className='mt-3'>
                      <summary className='cursor-pointer text-xs font-semibold text-accent'>Detaylı yetkileri düzenle</summary>
                      <div className='mt-2 grid gap-2 sm:grid-cols-2'>
                        {PANEL_PERMISSIONS.map((permission) => {
                          const enabled = member.permissions?.includes(permission) ?? false
                          return (
                            <label key={permission} className='flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs'>
                              <input
                                type='checkbox'
                                checked={enabled}
                                disabled={isSaving}
                                onChange={(event) => {
                                  const next = event.target.checked
                                    ? [...(member.permissions || []), permission]
                                    : (member.permissions || []).filter((item) => item !== permission)
                                  void updateMemberPermissions(member, next)
                                }}
                              />
                              {PANEL_PERMISSION_LABELS[permission]}
                            </label>
                          )
                        })}
                      </div>
                    </details>
                  )}
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                {isOwner ? (
                  <span className='inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground'>
                    <CheckCircle2 className='h-3.5 w-3.5' />
                    Sahip
                  </span>
                ) : isSuspended ? (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    disabled={!canManage || isSaving}
                    onClick={() => void updateMemberStatus(member, 'active')}
                  >
                    Aktif Et
                  </Button>
                ) : (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    disabled={!canManage || isSaving}
                    onClick={() => void updateMemberStatus(member, 'suspended')}
                  >
                    <XCircle className='mr-2 h-4 w-4' />
                    Askıya Al
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
