#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function collectFiles(rootRelPaths) {
  const files = []

  for (const relPath of rootRelPaths) {
    const absPath = path.join(projectRoot, relPath)
    if (!fs.existsSync(absPath)) continue
    const stat = fs.statSync(absPath)
    if (stat.isFile()) {
      files.push(relPath)
      continue
    }

    const stack = [relPath]
    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) continue

      for (const entry of fs.readdirSync(path.join(projectRoot, current))) {
        const childRelPath = path.join(current, entry)
        const childStat = fs.statSync(path.join(projectRoot, childRelPath))
        if (childStat.isDirectory()) {
          stack.push(childRelPath)
        } else if (/\.(tsx|ts|mjs|js)$/.test(entry)) {
          files.push(childRelPath)
        }
      }
    }
  }

  return files
}

const vehicleImageFrame = read('components/shared/vehicle-image-frame.tsx')
const vehicleCard = read('components/shared/vehicle-card.tsx')
const showroom = read('components/showroom/showroom-page-client.tsx')
const publicVehicle = read('components/public/public-vehicle-page-client.tsx')
const panelVehicles = read('app/panel/araclar/page.tsx')
const panelVehicleDetail = read('app/panel/araclar/[id]/page.tsx')
const panelDashboard = read('app/panel/page.tsx')
const panelSidebar = read('components/dashboard/sidebar.tsx')
const analytics = read('app/panel/analitik/page.tsx')
const analyticsRepository = read('lib/server/analytics-repository.ts')
const showroomAnalyticsRoute = read('app/api/panel/analytics/showroom/route.ts')
const qrPage = read('app/panel/qr-kodlar/page.tsx')
const settingsPage = read('app/panel/ayarlar/page.tsx')
const settingsRoute = read('app/api/panel/settings/route.ts')
const onboardingPage = read('app/onboarding/page.tsx')
const panelRepository = read('lib/server/panel-repository.ts')
const publicVehicleSeo = read('lib/public-vehicle-seo.ts')
const publicShowroom = read('lib/public-showroom.ts')
const publicShowroomSeo = read('lib/public-showroom-seo.ts')
const publicSitemap = read('lib/public-sitemap.ts')
const vehicleEventsRoute = read('app/api/public/vehicle-events/route.ts')
const showroomEventsRoute = read('app/api/public/showroom-events/route.ts')
const publicI18n = read('lib/public-i18n.ts')
const publicShowroomTheme = read('lib/public-showroom-theme.ts')
const publicShowroomThemeMigration = read('supabase/migrations/20260605083000_gallery_public_showroom_theme.sql')
const publicLanguageSwitcher = read('components/shared/public-language-switcher.tsx')
const sitemap = read('app/sitemap.ts')
const showroomPage = read('app/showroom/[dealerSlug]/page.tsx')
const showroomLayout = read('app/showroom/[dealerSlug]/layout.tsx')
const vehicleLayout = read('app/arac/[id]/layout.tsx')
const packageJson = read('package.json')

const noFakePlaceholderScope = collectFiles([
  'app/panel',
  'app/onboarding/page.tsx',
  'components/public',
  'components/showroom',
  'components/shared',
  'lib/public-vehicle-seo.ts',
])
const filesWithFakePlaceholder = noFakePlaceholderScope.filter((relPath) =>
  read(relPath).includes('/placeholder.jpg') || read(relPath).includes('placeholder.jpg'),
)

const checks = [
  [
    'shared vehicle image frame renders neutral no-image state',
    vehicleImageFrame.includes('Görsel yok')
      && vehicleImageFrame.includes('role="img"')
      && vehicleImageFrame.includes('imageSrc ?'),
  ],
  [
    'panel and public vehicle surfaces use shared image frame',
    vehicleCard.includes('VehicleImageFrame')
      && showroom.includes('VehicleImageFrame')
      && publicVehicle.includes('VehicleImageFrame')
      && panelVehicles.includes('VehicleImageFrame')
      && panelVehicleDetail.includes('VehicleImageFrame')
      && analytics.includes('VehicleImageFrame'),
  ],
  [
    'fake placeholder vehicle image is not used in panel/public vehicle surfaces',
    filesWithFakePlaceholder.length === 0,
  ],
  [
    'public vehicle detail handles empty image arrays safely',
    publicVehicle.includes('hasVehicleImages')
      && publicVehicle.includes('currentImageSrc')
      && publicVehicle.includes('showGallery && hasVehicleImages')
      && publicVehicle.includes('vehicle.images.length > 1'),
  ],
  [
    'public vehicle SEO does not inject fake image fallback',
    publicVehicleSeo.includes('images: row.photos?.filter(Boolean) || []')
      && !publicVehicleSeo.includes("['/placeholder.jpg']"),
  ],
  [
    'QR print link is not rendered when no vehicle is selected',
    qrPage.includes('validSelectedVehicleIds.length > 0 ?')
      && qrPage.includes('Yazdır (0)')
      && !qrPage.includes('asChild\n            className="bg-accent hover:bg-accent/90 text-accent-foreground"\n            disabled'),
  ],
  [
    'QR select-all only toggles filtered visible vehicles',
    qrPage.includes('filteredVehicleIds')
      && qrPage.includes('validSelectedVehicleIds')
      && qrPage.includes('isAllFilteredSelected')
      && qrPage.includes('new Set([...current, ...filteredVehicleIds])'),
  ],
  [
    'panel setup placeholders do not use the real support phone as sample data',
    !settingsPage.includes("placeholder='0530 973 82 40'")
      && !onboardingPage.includes('placeholder="0530 973 82 40"')
      && settingsPage.includes("placeholder='0530 XXX XX XX'")
      && onboardingPage.includes('placeholder="0530 XXX XX XX"'),
  ],
  [
    'panel exposes each gallery public showroom entry',
    panelRepository.includes('getPanelGalleryShowroomSummary')
      && panelRepository.includes('ensureGallerySecureSlug')
      && panelRepository.includes('publicShowroomUrl: absoluteUrl(showroomPath)')
      && settingsRoute.includes('publicShowroomUrl: absoluteUrl(`/showroom/${safeSlug}`)')
      && settingsRoute.includes('if (!hasSecurePublicRouteToken(safeSlug))')
      && panelDashboard.includes('getPanelGalleryShowroomSummary(session.email)')
      && panelDashboard.includes('Herkese Açık Galeri Sayfanız')
      && panelDashboard.includes('Galeri Sayfamı Aç')
      && panelSidebar.includes('Galeri Sayfam'),
  ],
  [
    'public showroom renders as a gallery website with real details',
    showroom.includes('DealerLogoMark')
      && publicI18n.includes('Public galeri sitesi')
      && publicI18n.includes('Araç bilgileri')
      && publicI18n.includes('Logo, iletişim, konum ve çalışma saatleri tek sayfada')
      && showroom.includes('dealer.websiteUrl')
      && showroom.includes('getVehicleStats(vehicles)')
      && showroom.includes("t('activeVehicles')")
      && showroom.includes("t('vehicleDetails')"),
  ],
  [
    'public showroom strengthens gallery website conversion UX without fake data',
    showroom.includes("href: '#talep'")
      && showroom.includes('id="talep"')
      && showroom.includes('showroomFlowCards')
      && showroom.includes('showroomHighlights')
      && showroom.includes('realStockLabel')
      && showroom.includes('panelManagedLabel')
      && showroom.includes('mobileReadyLabel')
      && showroom.includes('languageReadyLabel')
      && showroom.includes('vehicleWhatsappHref')
      && showroom.includes("recordShowroomEvent('whatsapp_click'")
      && showroom.includes('showroomNoVehiclesTitle')
      && showroom.includes('showroomNoVehiclesCopy')
      && publicI18n.includes('QR okutan ziyaretçi araçtan galeriye kesintisiz ilerler')
      && publicI18n.includes('Gerçek stok kayıtları')
      && publicI18n.includes('This gallery has no published vehicles right now'),
  ],
  [
    'public QR visitor pages support phone-language localization',
    publicI18n.includes("PUBLIC_LOCALES = ['tr', 'en', 'de', 'ru', 'ar']")
      && publicI18n.includes('pickPublicLocale')
      && publicLanguageSwitcher.includes('navigator.languages')
      && publicLanguageSwitcher.includes('PUBLIC_LOCALE_STORAGE_KEY')
      && showroom.includes('usePublicLocale()')
      && showroom.includes('PublicLanguageSwitcher')
      && publicVehicle.includes('usePublicLocale()')
      && publicVehicle.includes('PublicLanguageSwitcher')
      && publicVehicle.includes('env(safe-area-inset-bottom)')
      && showroom.includes('env(safe-area-inset-bottom)'),
  ],
  [
    'public QR vehicle page exposes clear QR scan UX',
    publicVehicle.includes("routeSource === \"qr\"")
      && publicVehicle.includes("t(\"qrVisitTitle\")")
      && publicVehicle.includes("t(\"qrActionStepPanel\")")
      && publicVehicle.includes('canUseWhatsApp')
      && publicVehicle.includes('canCallGallery')
      && publicVehicle.includes('canOpenLocation')
      && publicVehicle.includes('source: routeSource')
      && publicI18n.includes('QR araç sayfası')
      && publicI18n.includes('Talep panelde bu araca bağlanır'),
  ],
  [
    'public vehicle conversion events track CTA intent without fake data',
    vehicleEventsRoute.includes("eventType: z")
      && vehicleEventsRoute.includes('public_vehicle_cta_click')
      && vehicleEventsRoute.includes("eventType !== 'view'")
      && vehicleEventsRoute.includes("if (eventType === 'view')")
      && publicVehicle.includes('recordVehicleEvent("whatsapp_click")')
      && publicVehicle.includes('recordVehicleEvent("call_click")')
      && publicVehicle.includes('recordVehicleEvent("form_open")')
      && publicVehicle.includes('continueOnWhatsapp'),
  ],
  [
    'public showroom conversion events track real CTA intent without fake data',
    showroomEventsRoute.includes('public_showroom_cta_click')
      && showroomEventsRoute.includes('public_showroom_event_api')
      && showroomEventsRoute.includes('lead_form_open')
      && showroomEventsRoute.includes('lead_form_submit')
      && showroomEventsRoute.includes('hasSecurePublicRouteToken')
      && showroomEventsRoute.includes('metadata: {')
      && showroomEventsRoute.includes('galleryId: gallery.id')
      && showroom.includes("recordShowroomEvent('whatsapp_click'")
      && showroom.includes("recordShowroomEvent('call_click'")
      && showroom.includes("recordShowroomEvent('location_click'")
      && showroom.includes("recordShowroomEvent('website_click'")
      && showroom.includes("recordShowroomEvent('social_click'")
      && showroom.includes("recordShowroomEvent('vehicle_detail_click'")
      && showroom.includes("recordShowroomEvent('lead_form_open'")
      && showroom.includes("recordShowroomEvent('lead_form_submit'")
      && showroom.includes('mobile_sticky_whatsapp'),
  ],
  [
    'public showroom lead form posts real selected vehicle lead to panel',
    showroom.includes('handleShowroomLeadSubmit')
      && showroom.includes('/api/vehicle-lead')
      && showroom.includes("source: 'showroom'")
      && showroom.includes('vehicleId: selectedLeadVehicle.routeId')
      && showroom.includes('referrerSlug: dealer.slug')
      && showroom.includes('showroomLeadTitle')
      && showroom.includes('showroomLeadValidation')
      && showroom.includes('showroomLeadNoVehicles')
      && publicI18n.includes('Talebiniz doğrudan galerinin paneline düşer')
      && publicI18n.includes('Your request goes directly to the gallery panel'),
  ],
  [
    'panel settings controls public showroom theme without fake metrics',
    settingsPage.includes('Herkese Açık Sayfa Tema ve Logo')
      && settingsPage.includes('publicThemeStorageReady')
      && settingsPage.includes('PUBLIC_SHOWROOM_THEME_VALUES')
      && settingsPage.includes('PUBLIC_SHOWROOM_BACKGROUND_VALUES')
      && settingsPage.includes('DEFAULT_PUBLIC_SHOWROOM_THEME')
      && settingsPage.includes('publicTheme.heroNote')
      && settingsPage.includes('Sahte başarı oranı veya doğrulanmamış metrik yazmayın')
      && settingsRoute.includes('publicTheme: z.object')
      && settingsRoute.includes('public_showroom_note')
      && settingsRoute.includes('Public tema kaydı için Supabase migration')
      && publicShowroomTheme.includes('isSafePublicAccentColor')
      && publicShowroomTheme.includes('normalizePublicShowroomTheme')
      && publicShowroomThemeMigration.includes('public_theme')
      && publicShowroomThemeMigration.includes('public_accent_color')
      && publicShowroomThemeMigration.includes('public_background_style')
      && publicShowroomThemeMigration.includes('galleries_public_showroom_note_length_check'),
  ],
  [
    'public showroom applies gallery-specific theme and keeps safe fallback',
    showroom.includes('var(--showroom-accent)')
      && showroom.includes('dealer.publicTheme.heroNote')
      && showroom.includes('getShowroomRootClass')
      && showroom.includes('getShowroomHeroClass')
      && publicShowroom.includes('THEME_GALLERY_SELECT')
      && publicShowroom.includes('normalizePublicShowroomTheme')
      && publicShowroom.includes('fetchPublicGalleryRows')
      && publicShowroom.includes('public_showroom_note')
      && publicShowroom.includes('BASE_GALLERY_SELECT'),
  ],
  [
    'panel analytics reports public showroom conversion from real audit and lead data',
    showroomAnalyticsRoute.includes('getShowroomCtaAnalytics')
      && showroomAnalyticsRoute.includes('requirePanelSessionOrThrow')
      && analyticsRepository.includes('public_showroom_cta_click')
      && analyticsRepository.includes('public_vehicle_cta_click')
      && analyticsRepository.includes('lead_form_open')
      && analyticsRepository.includes('lead_form_submit')
      && analyticsRepository.includes("source: 'eq.showroom'")
      && analyticsRepository.includes("readMetadataValue(row.metadata, 'source') !== 'showroom'")
      && analyticsRepository.includes("'metadata->>galleryId'")
      && analytics.includes('/api/panel/analytics/showroom')
      && analytics.includes('Galeri sayfası dönüşüm')
      && analytics.includes('showroom?.current')
      && analytics.includes('Sahte veri gösterilmiyor'),
  ],
  [
    'public showroom and vehicle pages expose real SEO structured data',
    publicShowroomSeo.includes(" '@type': 'AutoDealer'")
      && publicShowroomSeo.includes(" '@type': 'ItemList'")
      && publicShowroomSeo.includes(" '@type': 'BreadcrumbList'")
      && publicShowroomSeo.includes('vehicles.slice(0, 50)')
      && showroomPage.includes('buildShowroomAutoDealerJsonLd')
      && showroomPage.includes('buildShowroomVehicleItemListJsonLd')
      && showroomLayout.includes('getShowroomSeoTitle')
      && showroomLayout.includes('getShowroomSeoImage')
      && publicVehicleSeo.includes('buildVehicleBreadcrumbJsonLd')
      && publicVehicle.includes('vehicleBreadcrumbJsonLd')
      && vehicleLayout.includes('getVehicleSeoImage'),
  ],
  [
    'public sitemap includes only secure live showroom and vehicle routes',
    sitemap.includes('getPublicSitemapEntries')
      && publicSitemap.includes('hasSecurePublicRouteToken')
      && publicSitemap.includes('/rest/v1/galleries')
      && publicSitemap.includes('/rest/v1/vehicles')
      && publicSitemap.includes("status: 'eq.active'")
      && publicSitemap.includes('/showroom/')
      && publicSitemap.includes('/arac/')
      && publicSitemap.includes('dedupeByUrl'),
  ],
  [
    'package exposes panel quality contract',
    packageJson.includes('"quality:panel"'),
  ],
]

for (const [label, ok] of checks) {
  assert(ok, `${label}${label.includes('fake placeholder') ? `: ${filesWithFakePlaceholder.join(', ')}` : ''}`)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: checks.map(([label]) => label),
    },
    null,
    2,
  ),
)
