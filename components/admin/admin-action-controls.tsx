'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  ADMIN_ACCESS_STATUSES,
  ADMIN_ACCOUNT_ROLES,
  ADMIN_SUBSCRIPTION_PLANS,
  ADMIN_SUBSCRIPTION_STATUSES,
  adminAccessStatusLabels,
  adminAccountRoleLabels,
  adminSubscriptionPlanLabels,
  adminSubscriptionStatusLabels,
  type AdminAccessStatus,
  type AdminAccountRole,
  type AdminSubscriptionPlan,
  type AdminSubscriptionStatus,
} from '@/lib/admin-user-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type AdminActionUser = {
  userId: string
  email: string
  fullName: string | null
  galleryName: string | null
  role: AdminAccountRole
  accessStatus: AdminAccessStatus
  subscriptionPlan: AdminSubscriptionPlan
  subscriptionStatus: AdminSubscriptionStatus
}

type ApiResult = {
  ok?: boolean
  error?: string
  message?: string
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as ApiResult

  if (!response.ok || !data.ok) {
    throw new Error(data.error || data.message || 'Admin işlemi tamamlanamadı.')
  }

  return data
}

function StatusLine({ message, error }: { message: string | null; error: string | null }) {
  if (!message && !error) return null

  return (
    <p className={error ? 'mt-2 text-xs font-semibold text-destructive' : 'mt-2 text-xs font-semibold text-emerald-700'}>
      {error || message}
    </p>
  )
}

const MIN_ADMIN_ACTION_REASON_LENGTH = 12

function hasValidActionReason(value: string) {
  return value.trim().length >= MIN_ADMIN_ACTION_REASON_LENGTH
}

function AdminActionReasonField({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const isReady = hasValidActionReason(value)

  return (
    <label className="space-y-1 text-sm font-semibold">
      İşlem sebebi
      <Textarea
        value={value}
        rows={4}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Bu kritik admin işleminin neden yapıldığını yazın."
      />
      <span className={isReady ? 'text-xs font-medium text-muted-foreground' : 'text-xs font-semibold text-destructive'}>
        En az {MIN_ADMIN_ACTION_REASON_LENGTH} karakter zorunlu. Sebep denetim kaydına yazılır.
      </span>
    </label>
  )
}

export function AdminAuthorizationControl({ user }: { user: AdminActionUser }) {
  const router = useRouter()
  const [role, setRole] = useState<AdminAccountRole>(user.role)
  const [accessStatus, setAccessStatus] = useState<AdminAccessStatus>(user.accessStatus)
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canSave = hasValidActionReason(reason)

  async function handleSubmit() {
    if (!canSave) return

    setIsSaving(true)
    setMessage(null)
    setError(null)

    try {
      await postJson(`/api/admin/users/${encodeURIComponent(user.userId)}/authorization`, {
        role,
        accessStatus,
        reason: reason.trim(),
      })
      setMessage('Yetki ve erişim durumu güncellendi.')
      setReason('')
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Yetkilendirme güncellenemedi.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="font-semibold text-foreground">{user.fullName || user.email}</p>
        <p className="text-xs text-muted-foreground">{user.galleryName || 'Galeri bağlı değil'}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          Rol
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as AdminAccountRole)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {ADMIN_ACCOUNT_ROLES.map((item) => (
              <option key={item} value={item}>
                {adminAccountRoleLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Erişim
          <select
            value={accessStatus}
            onChange={(event) => setAccessStatus(event.target.value as AdminAccessStatus)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {ADMIN_ACCESS_STATUSES.map((item) => (
              <option key={item} value={item}>
                {adminAccessStatusLabels[item]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <AdminActionReasonField value={reason} disabled={isSaving} onChange={setReason} />
      <Button type="button" onClick={() => void handleSubmit()} disabled={isSaving || !canSave} className="w-full">
        {isSaving ? 'Kaydediliyor...' : 'Yetkiyi Güncelle'}
      </Button>
      <StatusLine message={message} error={error} />
    </div>
  )
}

export function AdminSubscriptionControl({ user }: { user: AdminActionUser }) {
  const router = useRouter()
  const [plan, setPlan] = useState<AdminSubscriptionPlan>(user.subscriptionPlan)
  const [status, setStatus] = useState<AdminSubscriptionStatus>(user.subscriptionStatus)
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canSave = hasValidActionReason(reason)

  async function handleSubmit() {
    if (!canSave) return

    setIsSaving(true)
    setMessage(null)
    setError(null)

    try {
      await postJson(`/api/admin/users/${encodeURIComponent(user.userId)}/subscription`, {
        plan,
        status,
        reason: reason.trim(),
      })
      setMessage('Abonelik kapsamı güncellendi.')
      setReason('')
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Abonelik güncellenemedi.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="font-semibold text-foreground">{user.fullName || user.email}</p>
        <p className="text-xs text-muted-foreground">{user.galleryName || 'Galeri bağlı değil'}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold">
          Paket
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value as AdminSubscriptionPlan)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {ADMIN_SUBSCRIPTION_PLANS.map((item) => (
              <option key={item} value={item}>
                {adminSubscriptionPlanLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Durum
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AdminSubscriptionStatus)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {ADMIN_SUBSCRIPTION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {adminSubscriptionStatusLabels[item]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <AdminActionReasonField value={reason} disabled={isSaving} onChange={setReason} />
      <Button type="button" onClick={() => void handleSubmit()} disabled={isSaving || !canSave} className="w-full">
        {isSaving ? 'Kaydediliyor...' : 'Aboneliği Güncelle'}
      </Button>
      <StatusLine message={message} error={error} />
    </div>
  )
}

export function AdminDeleteUserControl({ user }: { user: AdminActionUser }) {
  const router = useRouter()
  const [confirmEmail, setConfirmEmail] = useState('')
  const [reason, setReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reasonReady = hasValidActionReason(reason)

  async function handleDelete() {
    if (!reasonReady) return

    setIsDeleting(true)
    setMessage(null)
    setError(null)

    try {
      await postJson(`/api/admin/users/${encodeURIComponent(user.userId)}/delete`, {
        confirmEmail,
        reason: reason.trim(),
      })
      setMessage('Kullanıcı silindi. Bağlı galeri kaydı korunur.')
      setConfirmEmail('')
      setReason('')
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Kullanıcı silinemedi.')
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete = confirmEmail.trim().toLowerCase() === user.email.toLowerCase() && reasonReady

  return (
    <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div>
        <p className="font-semibold text-foreground">{user.fullName || user.email}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
      <Input
        value={confirmEmail}
        onChange={(event) => setConfirmEmail(event.target.value)}
        placeholder="Silmek için e-postayı birebir yazın"
        autoComplete="off"
      />
      <AdminActionReasonField value={reason} disabled={isDeleting} onChange={setReason} />
      <Button
        type="button"
        variant="destructive"
        onClick={() => void handleDelete()}
        disabled={isDeleting || !canDelete}
        className="w-full"
      >
        {isDeleting ? 'Siliniyor...' : 'Kullanıcıyı Sil'}
      </Button>
      <StatusLine message={message} error={error} />
    </div>
  )
}

export function AdminNotificationComposer({ users }: { users: AdminActionUser[] }) {
  const [scope, setScope] = useState<'single' | 'bulk'>('single')
  const [userId, setUserId] = useState(users[0]?.userId || '')
  const [channel, setChannel] = useState<'panel' | 'email' | 'sms' | 'whatsapp'>('panel')
  const [title, setTitle] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setIsSending(true)
    setMessage(null)
    setError(null)

    try {
      const result = await postJson('/api/admin/notifications', {
        scope,
        userId: scope === 'single' ? userId : undefined,
        channel,
        title,
        message: messageBody,
      })
      setMessage(result.message || 'Bildirim kaydı oluşturuldu.')
      setTitle('')
      setMessageBody('')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Bildirim kaydedilemedi.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm font-semibold">
          Kapsam
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as 'single' | 'bulk')}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="single">Tekil kullanıcı</option>
            <option value="bulk">Tüm kimlik kullanıcıları</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Kanal
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value as 'panel' | 'email' | 'sms' | 'whatsapp')}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="panel">Panel bildirimi</option>
            <option value="email">E-posta kaydı</option>
            <option value="sms">SMS kaydı</option>
            <option value="whatsapp">WhatsApp kaydı</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold">
          Hedef
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={scope === 'bulk'}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          >
            {users.map((user) => (
              <option key={user.userId} value={user.userId}>
                {user.fullName || user.email}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bildirim başlığı" />
      <Textarea
        value={messageBody}
        onChange={(event) => setMessageBody(event.target.value)}
        placeholder="Bildirim metni"
        rows={5}
      />
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
        Panel bildirimi denetim kaydı üzerinden görünür. E-posta, SMS ve WhatsApp için harici sağlayıcı bağlı değilse teslimat yapılmış sayılmaz.
      </div>
      <Button type="button" onClick={() => void handleSend()} disabled={isSending || users.length === 0} className="w-full">
        {isSending ? 'Kaydediliyor...' : scope === 'bulk' ? 'Toplu Bildirim Kaydet' : 'Tekil Bildirim Kaydet'}
      </Button>
      <StatusLine message={message} error={error} />
    </div>
  )
}
