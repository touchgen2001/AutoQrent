import { SUBSCRIPTION_PLAN_CODES, type BillingInterval, type SubscriptionPlanCode } from '@/lib/subscription-plans'

export type BillingProviderStatus = {
  connected: boolean
  provider: 'stripe' | null
  checkoutEnabled: boolean
  customerPortalEnabled: boolean
  missingEnv: string[]
  message: string
}

const requiredStripeEnv = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const
const priceEnvByPlan: Record<Exclude<SubscriptionPlanCode, 'enterprise'>, Record<BillingInterval, string>> = {
  starter: {
    monthly: 'STRIPE_PRICE_STARTER_MONTHLY',
    yearly: 'STRIPE_PRICE_STARTER_YEARLY',
  },
  pro: {
    monthly: 'STRIPE_PRICE_PRO_MONTHLY',
    yearly: 'STRIPE_PRICE_PRO_YEARLY',
  },
  premium: {
    monthly: 'STRIPE_PRICE_PREMIUM_MONTHLY',
    yearly: 'STRIPE_PRICE_PREMIUM_YEARLY',
  },
}

function hasValue(name: string) {
  return Boolean((process.env[name] || '').trim())
}

export function getBillingProviderStatus(): BillingProviderStatus {
  const missingEnv = requiredStripeEnv.filter((name) => !hasValue(name))
  const hasAnyStripeConfig = requiredStripeEnv.some((name) => hasValue(name))

  if (!hasAnyStripeConfig) {
    return {
      connected: false,
      provider: null,
      checkoutEnabled: false,
      customerPortalEnabled: false,
      missingEnv: [...missingEnv],
      message: 'Ödeme sağlayıcısı bağlı değil. Plan seçimi kaydedilir; otomatik tahsilat yapılmaz.',
    }
  }

  const missingPriceEnv = Object.values(priceEnvByPlan)
    .flatMap((intervals) => Object.values(intervals))
    .filter((name) => !hasValue(name))
  const allMissing = [...missingEnv, ...missingPriceEnv]
  const connected = allMissing.length === 0

  return {
    connected,
    provider: 'stripe',
    checkoutEnabled: connected,
    customerPortalEnabled: connected,
    missingEnv: allMissing,
    message: connected
      ? 'Stripe yapılandırması hazır. Checkout entegrasyonu gerçek provider üzerinden açılabilir.'
      : 'Stripe kısmi yapılandırılmış. Eksik env tamamlanana kadar otomatik tahsilat başlatılmaz.',
  }
}

export function getStripePriceEnvName(input: {
  planCode: SubscriptionPlanCode
  billingInterval: BillingInterval
}) {
  if (input.planCode === 'enterprise' || !SUBSCRIPTION_PLAN_CODES.includes(input.planCode)) {
    return null
  }

  return priceEnvByPlan[input.planCode][input.billingInterval]
}
