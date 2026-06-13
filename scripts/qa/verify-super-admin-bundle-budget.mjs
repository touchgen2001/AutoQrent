#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const projectRoot = process.cwd()
const assetsDir = path.join(projectRoot, 'apps/super-admin/dist/assets')

const kilobyte = 1024
const budgets = {
  entryRaw: 380 * kilobyte,
  entryGzip: 130 * kilobyte,
  dashboardRaw: 40 * kilobyte,
  dashboardGzip: 16 * kilobyte,
  lazyChartRaw: 450 * kilobyte,
  lazyChartGzip: 130 * kilobyte,
  largestRaw: 460 * kilobyte,
  pageRaw: 90 * kilobyte,
}

function fail(message, detail = {}) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message,
        ...detail,
      },
      null,
      2,
    ),
  )
  process.exit(1)
}

function formatKb(bytes) {
  return Number((bytes / kilobyte).toFixed(2))
}

function readChunk(fileName) {
  const filePath = path.join(assetsDir, fileName)
  const content = fs.readFileSync(filePath)
  return {
    fileName,
    rawBytes: content.length,
    gzipBytes: gzipSync(content).length,
  }
}

function assertBudget(label, actual, limit) {
  if (actual > limit) {
    fail(`${label} budget exceeded`, {
      actualKb: formatKb(actual),
      limitKb: formatKb(limit),
    })
  }
}

if (!fs.existsSync(assetsDir)) {
  fail('Super Admin dist assets not found. Run pnpm super-admin:prepare-public before bundle budget.')
}

const jsFiles = fs
  .readdirSync(assetsDir)
  .filter((fileName) => fileName.endsWith('.js'))
  .sort()

if (jsFiles.length === 0) {
  fail('Super Admin dist has no JavaScript chunks.')
}

const chunks = jsFiles.map(readChunk)
const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
const findChunk = (prefix) => chunks.find((chunk) => chunk.fileName.startsWith(prefix))

const entryChunk = findChunk('index-')
const dashboardChunk = findChunk('dashboard-page-')
const chartChunk = findChunk('dashboard-trend-grid-')

if (!entryChunk) fail('Super Admin entry chunk not found.', { jsFiles })
if (!dashboardChunk) fail('Dashboard page chunk not found.', { jsFiles })
if (!chartChunk) fail('Dashboard chart lazy chunk not found.', { jsFiles })

const requiredLazyPrefixes = [
  'dashboard-page-',
  'dashboard-trend-grid-',
  'tenant-management-page-',
  'user-management-page-',
  'admin-accounts-page-',
  'support-operations-page-',
  'finance-page-',
  'audit-log-page-',
  'settings-page-',
]

const missingLazyChunks = requiredLazyPrefixes.filter((prefix) => !findChunk(prefix))
if (missingLazyChunks.length > 0) {
  fail('Required Super Admin lazy chunks are missing.', { missingLazyChunks, jsFiles })
}

assertBudget('entry raw', entryChunk.rawBytes, budgets.entryRaw)
assertBudget('entry gzip', entryChunk.gzipBytes, budgets.entryGzip)
assertBudget('dashboard raw', dashboardChunk.rawBytes, budgets.dashboardRaw)
assertBudget('dashboard gzip', dashboardChunk.gzipBytes, budgets.dashboardGzip)
assertBudget('dashboard chart raw', chartChunk.rawBytes, budgets.lazyChartRaw)
assertBudget('dashboard chart gzip', chartChunk.gzipBytes, budgets.lazyChartGzip)

const oversizedChunk = chunks.find((chunk) => chunk.rawBytes > budgets.largestRaw)
if (oversizedChunk) {
  fail('A Super Admin chunk is larger than the global chunk budget.', {
    fileName: oversizedChunk.fileName,
    rawKb: formatKb(oversizedChunk.rawBytes),
    limitKb: formatKb(budgets.largestRaw),
  })
}

const pageChunkPrefixes = [
  'dashboard-page-',
  'tenant-management-page-',
  'user-management-page-',
  'admin-accounts-page-',
  'support-operations-page-',
  'finance-page-',
  'audit-log-page-',
  'settings-page-',
  'access-control-page-',
]

for (const prefix of pageChunkPrefixes) {
  const chunk = findChunk(prefix)
  if (chunk) {
    assertBudget(`${prefix} raw`, chunk.rawBytes, budgets.pageRaw)
  }
}

const publicAssetsDir = path.join(projectRoot, 'public/super-admin/assets')
const publicAssetsReady = fs.existsSync(publicAssetsDir)
const publicJsFiles = publicAssetsReady
  ? fs
      .readdirSync(publicAssetsDir)
      .filter((fileName) => fileName.endsWith('.js'))
      .sort()
  : []

if (publicAssetsReady) {
  const missingPublicFiles = jsFiles.filter((fileName) => !publicJsFiles.includes(fileName))
  if (missingPublicFiles.length > 0) {
    fail('public/super-admin is stale compared with apps/super-admin/dist.', { missingPublicFiles })
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      chunks: chunks.map((chunk) => ({
        fileName: chunk.fileName,
        rawKb: formatKb(chunk.rawBytes),
        gzipKb: formatKb(chunk.gzipBytes),
      })),
      budgetsKb: Object.fromEntries(Object.entries(budgets).map(([key, value]) => [key, formatKb(value)])),
      publicAssetsChecked: publicAssetsReady,
      entryChunk: entryChunk.fileName,
      dashboardChunk: dashboardChunk.fileName,
      chartChunk: chartChunk.fileName,
      totalJsChunks: byName.size,
    },
    null,
    2,
  ),
)
