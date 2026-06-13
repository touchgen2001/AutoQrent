import { mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { chromium } from "@playwright/test"
import QRCode from "qrcode"

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000"
const outputDir = path.join(process.cwd(), "public", "product-tour")
const now = new Date()
const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
const qrImage = await QRCode.toBuffer("https://cebindegaleri.com/arac/demo", {
  width: 180,
  margin: 1,
  color: { dark: "#171717", light: "#ffffff" },
})

const session = {
  userId: "demo-user",
  email: "demo@cebindegaleri.com",
  fullName: "Demo Galeri",
  galleryId: "demo-gallery",
  galleryName: "Cebindegaleri Demo",
  expiresAt,
}

const vehicles = [
  {
    vehicleId: "veh-001",
    routeId: "bmw-320i-m-sport",
    publicUrl: "https://cebindegaleri.com/arac/demo",
    vehicleTitle: "BMW 320i M Sport",
    brand: "BMW",
    model: "320i",
    variant: "M Sport",
    year: 2024,
    mileage: 12800,
    fuel: "Benzin",
    transmission: "Otomatik",
    price: 3450000,
    qrCode: "CG-BMW-320I",
    scans: 128,
    lastScanAt: now.toISOString(),
    image: "/vehicles/demo-mercedes-amg-gt-1.jpg",
    status: "active",
    createdAt: now.toISOString(),
    priceDroppedAt: null,
    previousPrice: null,
  },
  {
    vehicleId: "veh-002",
    routeId: "mercedes-c200-amg",
    publicUrl: "https://cebindegaleri.com/arac/demo",
    vehicleTitle: "Mercedes C200 AMG",
    brand: "Mercedes-Benz",
    model: "C200",
    variant: "AMG",
    year: 2023,
    mileage: 22500,
    fuel: "Benzin",
    transmission: "Otomatik",
    price: 4190000,
    qrCode: "CG-MERC-C200",
    scans: 86,
    lastScanAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
    image: "/vehicles/demo-mercedes-amg-gt-2.jpg",
    status: "active",
    createdAt: now.toISOString(),
    priceDroppedAt: null,
    previousPrice: null,
  },
  {
    vehicleId: "veh-003",
    routeId: "volvo-xc60",
    publicUrl: "https://cebindegaleri.com/arac/demo",
    vehicleTitle: "Volvo XC60",
    brand: "Volvo",
    model: "XC60",
    variant: "Plus",
    year: 2024,
    mileage: 9400,
    fuel: "Hibrit",
    transmission: "Otomatik",
    price: 5250000,
    qrCode: "CG-VOLVO-XC60",
    scans: 64,
    lastScanAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    image: "/vehicles/demo-mercedes-amg-gt-1.jpg",
    status: "reserved",
    createdAt: now.toISOString(),
    priceDroppedAt: null,
    previousPrice: null,
  },
]

const leads = [
  {
    id: "lead-001",
    vehicleId: "veh-001",
    vehicleTitle: "BMW 320i M Sport",
    customerName: "Demo Müşteri 01",
    customerPhone: "05XX XXX XX 01",
    customerEmail: "demo01@example.com",
    source: "qr",
    status: "yeni",
    notes: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "lead-002",
    vehicleId: "veh-002",
    vehicleTitle: "Mercedes C200 AMG",
    customerName: "Demo Müşteri 02",
    customerPhone: "05XX XXX XX 02",
    customerEmail: "demo02@example.com",
    source: "whatsapp",
    status: "gorusuluyor",
    notes: ["Fiyat ve takas seçenekleri görüşüldü."],
    createdAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "lead-003",
    vehicleId: "veh-003",
    vehicleTitle: "Volvo XC60",
    customerName: "Demo Müşteri 03",
    customerPhone: "05XX XXX XX 03",
    customerEmail: "demo03@example.com",
    source: "test-surusu",
    status: "test-surusu",
    notes: [],
    followUpDate: now.toISOString().slice(0, 10),
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "lead-004",
    vehicleId: "veh-001",
    vehicleTitle: "BMW 320i M Sport",
    customerName: "Demo Müşteri 04",
    customerPhone: "05XX XXX XX 04",
    customerEmail: "demo04@example.com",
    source: "showroom",
    status: "satisa-dondu",
    notes: [],
    createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now.toISOString(),
  },
]

async function fulfillJson(route, body) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  })
}

async function seedDemoRoutes(page) {
  await page.route("**/api/auth/session", (route) => fulfillJson(route, { ok: true, session }))
  await page.route("**/api/panel/subscription", (route) =>
    fulfillJson(route, {
      ok: true,
      subscription: { requiresPlanSelection: false, isTrialExpired: false },
    }),
  )
  await page.route("**/api/panel/settings", (route) =>
    fulfillJson(route, {
      ok: true,
      settings: {
        name: "Cebindegaleri Demo",
        slug: "demo",
        vehicleCount: vehicles.length,
        activeVehicleCount: 2,
      },
    }),
  )
  await page.route("**/api/panel/alerts", (route) =>
    fulfillJson(route, {
      ok: true,
      source: "supabase",
      generatedAt: now.toISOString(),
      summary: { open: 0, critical: 0, high: 0, medium: 0, low: 0 },
      alerts: [],
    }),
  )
  await page.route("**/api/panel/vehicles**", (route) =>
    fulfillJson(route, {
      ok: true,
      source: "supabase",
      items: vehicles.map((vehicle) => ({
        id: vehicle.vehicleId,
        ...vehicle,
        status: vehicle.status,
        scans: vehicle.scans,
        leads: leads.filter((lead) => lead.vehicleId === vehicle.vehicleId).length,
        photos: vehicle.image ? [vehicle.image] : [],
      })),
    }),
  )
  await page.route("**/api/panel/leads**", (route) => fulfillJson(route, { ok: true, items: leads }))
  await page.route("**/api/panel/qr-codes**", (route) =>
    fulfillJson(route, {
      ok: true,
      vehicles,
      recentScans: vehicles.map((vehicle) => ({
        vehicleId: vehicle.vehicleId,
        vehicleTitle: vehicle.vehicleTitle,
        scannedAt: vehicle.lastScanAt,
        source: "qr",
      })),
      topShared: [],
      shareCount: 0,
      gallery: {
        name: "Cebindegaleri Demo",
        logo: "/demo-gallery-logo.svg",
        phone: "0530 973 82 40",
        whatsapp: "0530 973 82 40",
      },
    }),
  )
  await page.route("**/api/panel/qr-image**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: qrImage,
    }),
  )
  await page.route("**/api/panel/gallery-identity", (route) =>
    fulfillJson(route, {
      ok: true,
      gallery: {
        id: "demo-gallery",
        name: "Cebindegaleri Demo",
        logo: "/demo-gallery-logo.svg",
        slug: "demo",
      },
    }),
  )
  await page.route("**/api/panel/uploads/vehicle-images/quota", (route) =>
    fulfillJson(route, {
      ok: true,
      source: "supabase",
      galleryId: "demo-gallery",
      quota: {
        dailyLimit: 100,
        dailyUsed: 12,
        dailyRemaining: 88,
        dailyWindowHours: 24,
        dailyWindowStartedAt: now.toISOString(),
        totalActiveLimit: 1000,
        totalActive: 86,
        totalRemaining: 914,
        maxFilesPerRequest: 10,
        maxFileSizeBytes: 10_000_000,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      },
    }),
  )
}

async function openPanelPage(page, pathname, heading) {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" })
  await page.getByRole("heading", { name: heading }).waitFor()
  await page.waitForTimeout(800)
}

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  serviceWorkers: "block",
  recordVideo: {
    dir: outputDir,
    size: { width: 1280, height: 720 },
  },
})
const page = await context.newPage()
await seedDemoRoutes(page)
const video = page.video()

await openPanelPage(page, "/panel/qr-kodlar", "QR Kodlar")
await page.screenshot({
  path: path.join(outputDir, "panel-qr-codes.png"),
  type: "png",
})
await page.waitForTimeout(1400)

await openPanelPage(page, "/panel/leadler", "Müşteri Talepleri")
await page.screenshot({
  path: path.join(outputDir, "panel-customer-requests.png"),
  type: "png",
})
await page.waitForTimeout(1400)

await openPanelPage(page, "/panel/araclar/ekle", "Yeni Araç Ekle")
await page.screenshot({
  path: path.join(outputDir, "panel-vehicle-create.png"),
  type: "png",
})
await page.waitForTimeout(1600)

await context.close()
await video.saveAs(path.join(outputDir, "cebindegaleri-product-tour.webm"))
await rm(await video.path(), { force: true })
await browser.close()

console.log(`[capture-product-tour] wrote screenshots and video to ${outputDir}`)
