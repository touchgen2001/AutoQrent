import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { readAdminSessionFromCookieHeader } from '@/lib/server/admin-auth'
import { listAdminManagedUsers, type AdminManagedUsersResult } from '@/lib/server/admin-users-repository'

function buildCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join('; ')
}

export function firstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

export function formatAdminDate(value: string | null) {
  if (!value) return 'Yok'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Yok'
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatAdminLocation(input: {
  city: string | null
  district: string | null
}) {
  return [input.district, input.city].filter(Boolean).join(' / ') || 'Konum yok'
}

export async function getAdminPageData(input: {
  search?: string
} = {}) {
  const cookieStore = await cookies()
  const session = readAdminSessionFromCookieHeader(buildCookieHeader(cookieStore))

  if (!session) {
    redirect('/admin/giris')
  }

  let managedUsers: AdminManagedUsersResult | null = null
  let dataError: string | null = null

  try {
    managedUsers = await listAdminManagedUsers({
      search: input.search,
    })
  } catch (error) {
    dataError = error instanceof Error ? error.message : 'Admin kullanıcı verisi alınamadı.'
  }

  return {
    session,
    managedUsers,
    dataError,
    shellSummary: managedUsers
      ? {
          authUsers: managedUsers.summary.authUsers,
          totalGalleries: managedUsers.summary.totalGalleries,
          totalVehicles: managedUsers.summary.totalVehicles,
          totalLeads: managedUsers.summary.totalLeads,
        }
      : null,
  }
}
