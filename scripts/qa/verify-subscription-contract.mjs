import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(projectRoot, relativePath))
}

const checks = []

function addCheck(name, passed) {
  checks.push({ name, passed: Boolean(passed) })
}

const planCatalog = read('lib/subscription-plans.ts')
const subscriptionRepo = read('lib/server/subscription-repository.ts')
const subscriptionRoute = read('app/api/panel/subscription/route.ts')
const registerRoute = read('app/api/auth/register/route.ts')
const panelAuth = read('lib/server/panel-auth.ts')
const vehicleRoute = read('app/api/panel/vehicles/route.ts')
const qrImageRoute = read('app/api/panel/qr-image/route.ts')
const leadUpdateRoute = read('app/api/panel/leads/[id]/route.ts')
const analyticsLandingRoute = read('app/api/panel/analytics/landing/route.ts')
const analyticsShowroomRoute = read('app/api/panel/analytics/showroom/route.ts')
const analyticsConfigRoute = read('app/api/panel/analytics/landing-config/route.ts')
const analyticsRolloutRoute = read('app/api/panel/analytics/landing-rollout/route.ts')
const settingsPage = read('app/panel/ayarlar/page.tsx')
const panelLayoutClient = read('components/dashboard/panel-layout-client.tsx')
const migrationPath = fs
  .readdirSync(path.join(projectRoot, 'supabase/migrations'))
  .find((file) => file.endsWith('_self_service_gallery_subscriptions.sql'))
const migration = migrationPath ? read(`supabase/migrations/${migrationPath}`) : ''

for (const planCode of ['starter', 'pro', 'premium', 'enterprise']) {
  addCheck(`plan catalog contains ${planCode}`, planCatalog.includes(`${planCode}: {`) || planCatalog.includes(`code: '${planCode}'`))
}

for (const status of ['trialing', 'active', 'past_due', 'canceled', 'expired', 'suspended']) {
  addCheck(`subscription status contains ${status}`, planCatalog.includes(`'${status}'`))
}

for (const feature of [
  'vehicles.create',
  'vehicles.bulk_import',
  'qr.generate',
  'leads.advanced',
  'analytics.advanced',
  'domain.custom',
  'branding.remove',
  'export.excel',
]) {
  addCheck(`feature gate catalog contains ${feature}`, planCatalog.includes(`'${feature}'`))
}

addCheck('feature gate catalog excludes user invitations', !planCatalog.includes("'users.invite'"))

addCheck('starter vehicle limit is 15', planCatalog.includes('vehicleLimit: 15'))
addCheck('pro vehicle limit is 75', planCatalog.includes('vehicleLimit: 75'))
addCheck('premium vehicle limit is 200', planCatalog.includes('vehicleLimit: 200'))
addCheck('starter monthly price is 999', planCatalog.includes('monthlyPrice: 999'))
addCheck('pro monthly price is 2500', planCatalog.includes('monthlyPrice: 2500'))
addCheck('premium monthly price is 4990', planCatalog.includes('monthlyPrice: 4990'))
addCheck('all paid plans use single user limit', planCatalog.includes("summary: 'Tek kullanıcı hesabıyla daha yüksek araç hacmi") && planCatalog.includes("summary: 'Tek kullanıcı hesabıyla yüksek stok"))

addCheck('subscription migration exists', Boolean(migrationPath))
addCheck('migration creates gallery_subscriptions', migration.includes('create table if not exists public.gallery_subscriptions'))
addCheck('migration enables RLS', migration.includes('enable row level security') && migration.includes('force row level security'))
addCheck('migration has owner select policy', migration.includes('Gallery owners can read their subscription'))
addCheck('migration grants service role access', migration.includes('grant select, insert, update, delete on public.gallery_subscriptions to service_role'))
addCheck('migration backfills existing galleries', migration.includes('migration_backfill') && migration.includes('on conflict (gallery_id) do nothing'))

addCheck('central assertFeatureAccess exists', subscriptionRepo.includes('export async function assertFeatureAccess'))
addCheck('central assertVehicleCreateAllowed exists', subscriptionRepo.includes('export async function assertVehicleCreateAllowed'))
addCheck('central user invite guard is disabled for single user model', subscriptionRepo.includes('export async function assertUserInviteAllowed') && subscriptionRepo.includes('Ek kullanıcı daveti kapalıdır'))
addCheck('trial creation helper exists', subscriptionRepo.includes('ensureTrialSubscriptionForGallery'))
addCheck('trial is 14 days', planCatalog.includes('TRIAL_DAYS = 14') && subscriptionRepo.includes('TRIAL_DAYS'))
addCheck('trial expiry requires plan selection', subscriptionRepo.includes('requiresPlanSelection') && subscriptionRepo.includes('Deneme süreniz sona erdi'))

addCheck('panel auth creates trial on register/login', panelAuth.includes('ensureTrialSubscriptionForGallery') && panelAuth.includes('subscriptionPlan: input.planCode') && panelAuth.includes("subscriptionStatus: 'trialing'"))
addCheck('registration can bind selected plan to trial', registerRoute.includes('planCode: z.enum(SUBSCRIPTION_PLAN_CODES).optional()') && panelAuth.includes('planCode?: SubscriptionPlanCode') && panelAuth.includes('planCode,'))
addCheck('subscription API route exists', exists('app/api/panel/subscription/route.ts'))
addCheck('subscription API supports plan patch', subscriptionRoute.includes('PATCH') && subscriptionRoute.includes('updateGallerySubscriptionPlan'))
addCheck('subscription API states payment provider missing', subscriptionRoute.includes('Ödeme sağlayıcısı henüz bağlı değil'))

addCheck('vehicle create route checks plan limit', vehicleRoute.includes('assertVehicleCreateAllowed'))
addCheck('vehicle limit message is exact', vehicleRoute.includes('Araç limitinize ulaştınız. Daha fazla araç eklemek için planınızı yükseltin.') || subscriptionRepo.includes('Araç limitinize ulaştınız. Daha fazla araç eklemek için planınızı yükseltin.'))
addCheck('QR image route checks qr.generate', qrImageRoute.includes("feature: 'qr.generate'"))
addCheck('lead update route checks leads.advanced', leadUpdateRoute.includes("feature: 'leads.advanced'"))
addCheck('landing analytics checks analytics.advanced', analyticsLandingRoute.includes("feature: 'analytics.advanced'"))
addCheck('showroom analytics checks analytics.advanced', analyticsShowroomRoute.includes("feature: 'analytics.advanced'"))
addCheck('landing config checks analytics.advanced', analyticsConfigRoute.includes("feature: 'analytics.advanced'"))
addCheck('landing rollout checks analytics.advanced', analyticsRolloutRoute.includes("feature: 'analytics.advanced'"))

addCheck('settings page fetches subscription API', settingsPage.includes('/api/panel/subscription'))
addCheck('settings page shows monthly yearly toggle', settingsPage.includes("(['monthly', 'yearly'] as BillingInterval[])"))
addCheck('settings page shows enterprise quote CTA', settingsPage.includes('Teklif Al') || settingsPage.includes('Kurumsal'))
addCheck('settings page shows payment provider missing', settingsPage.includes('paymentProviderMessage'))
addCheck('panel layout redirects expired subscription to plan tab', panelLayoutClient.includes('/panel/ayarlar?tab=subscription') && panelLayoutClient.includes('requiresPlanSelection'))

const failed = checks.filter((check) => !check.passed)

for (const check of checks) {
  console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.name}`)
}

if (failed.length > 0) {
  console.error(`\n${failed.length} subscription contract check(s) failed.`)
  process.exit(1)
}

console.log(`\n${checks.length} subscription contract checks passed.`)
