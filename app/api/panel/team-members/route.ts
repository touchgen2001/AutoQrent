import { NextResponse } from 'next/server'

import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { fetchPanelTeamMembers } from '@/lib/server/panel-team-repository'

export const runtime = 'nodejs'

function singleUserResponse() {
  return NextResponse.json(
    {
      ok: false,
      code: 'single_user_product',
      message: 'Cebindegaleri tek kullanıcı hesabı ile çalışır. Ek kullanıcı oluşturulamaz.',
    },
    { status: 403 },
  )
}

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const members = (await fetchPanelTeamMembers(session.galleryId)).filter((member) => member.role === 'owner')

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      members,
      canManage: false,
      singleUser: true,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Personel hesapları alınamadı.',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    await requirePanelSessionOrThrow(request)
    return singleUserResponse()
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    return singleUserResponse()
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePanelSessionOrThrow(request)
    return singleUserResponse()
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    return singleUserResponse()
  }
}
