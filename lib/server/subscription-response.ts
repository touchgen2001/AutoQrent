import { NextResponse } from 'next/server'

import { isSubscriptionGateError } from '@/lib/server/subscription-repository'

export function subscriptionGateErrorResponse(error: unknown) {
  if (!isSubscriptionGateError(error)) return null

  return NextResponse.json(
    {
      ok: false,
      code: error.code,
      message: error.message,
      feature: error.feature,
      redirectTo: error.redirectTo,
    },
    { status: error.statusCode },
  )
}
