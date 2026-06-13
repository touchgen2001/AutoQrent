export const VEHICLE_CSV_HEADERS = [
  'marka',
  'model',
  'paket',
  'yil',
  'fiyat',
  'km',
  'yakit',
  'vites',
  'renk',
  'kasa_tipi',
  'motor_hacmi',
  'beygir',
  'aciklama',
] as const

export type VehicleBulkImportRow = {
  brand: string
  model: string
  variant?: string
  year: number
  price: number
  mileage: number
  fuel: string
  transmission: string
  color?: string
  bodyType?: string
  engineSize?: string
  horsePower?: string
  description?: string
}

const HEADER_ALIASES: Record<string, keyof VehicleBulkImportRow> = {
  marka: 'brand',
  brand: 'brand',
  model: 'model',
  paket: 'variant',
  varyant: 'variant',
  variant: 'variant',
  yil: 'year',
  year: 'year',
  fiyat: 'price',
  price: 'price',
  km: 'mileage',
  kilometre: 'mileage',
  mileage: 'mileage',
  yakit: 'fuel',
  fuel: 'fuel',
  vites: 'transmission',
  transmission: 'transmission',
  renk: 'color',
  color: 'color',
  kasa_tipi: 'bodyType',
  body_type: 'bodyType',
  motor_hacmi: 'engineSize',
  engine_size: 'engineSize',
  beygir: 'horsePower',
  horse_power: 'horsePower',
  aciklama: 'description',
  description: 'description',
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replace(/\s+/g, '_')
}

function detectDelimiter(content: string) {
  let quoted = false
  let commas = 0
  let semicolons = 0
  for (const char of content) {
    if (char === '"') quoted = !quoted
    if (!quoted && (char === '\n' || char === '\r')) break
    if (!quoted && char === ',') commas += 1
    if (!quoted && char === ';') semicolons += 1
  }
  return semicolons > commas ? ';' : ','
}

function parseCsvMatrix(content: string) {
  const rows: string[][] = []
  const delimiter = detectDelimiter(content)
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
      continue
    }
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === delimiter && !quoted) {
      row.push(cell.trim())
      cell = ''
      continue
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
      continue
    }
    cell += char
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function parseInteger(value: string) {
  const normalized = value.replace(/[^\d-]/g, '')
  return Number(normalized)
}

export function parseVehicleCsv(content: string): VehicleBulkImportRow[] {
  const matrix = parseCsvMatrix(content.replace(/^\uFEFF/, ''))
  const [rawHeaders, ...rawRows] = matrix
  if (!rawHeaders || rawRows.length === 0) return []

  const headers = rawHeaders.map((header) => HEADER_ALIASES[normalizeHeader(header)])
  return rawRows.slice(0, 100).map((values) => {
    const row: Record<string, string | number | undefined> = {}
    headers.forEach((header, index) => {
      if (!header) return
      const value = values[index]?.trim() || ''
      row[header] = ['year', 'price', 'mileage'].includes(header) ? parseInteger(value) : value || undefined
    })
    return row as VehicleBulkImportRow
  })
}

export function getVehicleCsvTemplate() {
  return `${VEHICLE_CSV_HEADERS.join(',')}\nToyota,Corolla,Flame X-Pack,2022,1250000,42000,Benzin,Otomatik,Beyaz,Sedan,1.5,125,Bakımlı ve temiz araç`
}
