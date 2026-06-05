import { Buffer } from 'node:buffer'

export type SafeImageKind = 'jpeg' | 'png' | 'webp'

export type SafeImageScan = {
  kind: SafeImageKind
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  extension: 'jpeg' | 'png' | 'webp'
  width: number | null
  height: number | null
}

export type SafeImageValidationOptions = {
  allowedKinds: readonly SafeImageKind[]
  maxBytes: number
  label: string
}

export type SafeImageValidationInput = {
  name: string
  type: string
  size: number
  buffer: Buffer
}

export type SafeImageValidationResult = SafeImageScan & {
  buffer: Buffer
}

export class ImageUploadValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageUploadValidationError'
  }
}

const MAX_IMAGE_WIDTH = 12_000
const MAX_IMAGE_HEIGHT = 12_000
const MAX_IMAGE_PIXELS = 60_000_000

const CONTENT_TYPE_BY_KIND: Record<SafeImageKind, SafeImageScan['contentType']> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const EXTENSION_BY_KIND: Record<SafeImageKind, SafeImageScan['extension']> = {
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
}

const EXTENSIONS_BY_KIND: Record<SafeImageKind, Set<string>> = {
  jpeg: new Set(['jpg', 'jpeg']),
  png: new Set(['png']),
  webp: new Set(['webp']),
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

const ACTIVE_PAYLOAD_PATTERNS = [
  /<\s*script[\s>]/i,
  /<\s*svg[\s>]/i,
  /<\s*html[\s>]/i,
  /<\s*iframe[\s>]/i,
  /<\?php/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /\son[a-z]+\s*=/i,
]

const BLOCKED_FILE_HEADER_SIGNATURES = [
  {
    signature: Buffer.from([0x4d, 0x5a]),
    label: 'Windows executable',
  },
  {
    signature: Buffer.from([0x7f, 0x45, 0x4c, 0x46]),
    label: 'ELF executable',
  },
  {
    signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    label: 'ZIP/JAR archive',
  },
]

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

function normalizeMimeType(value: string) {
  const normalized = value.trim().toLowerCase()
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized
}

function detectImageKind(buffer: Buffer): SafeImageKind | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg'
  }

  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a
  ) {
    return 'png'
  }

  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp'
  }

  return null
}

function assertNoBlockedFileHeader(buffer: Buffer, label: string) {
  for (const blockedSignature of BLOCKED_FILE_HEADER_SIGNATURES) {
    const { signature } = blockedSignature
    if (buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature)) {
      throw new ImageUploadValidationError(
        `${label} gerçek bir görsel dosyası gibi başlamıyor. Arşiv veya çalıştırılabilir dosya imzası bulundu.`,
      )
    }
  }
}

function assertNoActivePayload(buffer: Buffer, label: string) {
  const textView = buffer.subarray(0, Math.min(buffer.length, 12 * 1024 * 1024)).toString('latin1')

  for (const pattern of ACTIVE_PAYLOAD_PATTERNS) {
    if (pattern.test(textView)) {
      throw new ImageUploadValidationError(
        `${label} içinde aktif kod veya HTML/SVG benzeri içerik izi bulundu. Dosya kabul edilmedi.`,
      )
    }
  }
}

function assertSafeDimensions(width: number | null, height: number | null, label: string) {
  if (width === null || height === null) return

  if (width <= 0 || height <= 0) {
    throw new ImageUploadValidationError(`${label} boyut bilgisi geçersiz.`)
  }

  if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT || width * height > MAX_IMAGE_PIXELS) {
    throw new ImageUploadValidationError(
      `${label} boyutu güvenli sınırı aşıyor. Daha küçük bir görsel yükleyin.`,
    )
  }
}

function parsePngDimensions(buffer: Buffer, label: string) {
  if (buffer.length < 33) {
    throw new ImageUploadValidationError(`${label} PNG yapısı eksik.`)
  }

  let offset = 8
  let width: number | null = null
  let height: number | null = null
  let sawIend = false
  let isFirstChunk = true

  while (offset + 12 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset)
    const typeStart = offset + 4
    const dataStart = offset + 8
    const dataEnd = dataStart + chunkLength
    const chunkEnd = dataEnd + 4

    if (chunkEnd > buffer.length) {
      throw new ImageUploadValidationError(`${label} PNG chunk yapısı bozuk.`)
    }

    const chunkType = buffer.subarray(typeStart, typeStart + 4).toString('ascii')
    if (isFirstChunk && (chunkType !== 'IHDR' || chunkLength !== 13)) {
      throw new ImageUploadValidationError(`${label} geçerli bir PNG IHDR alanı içermiyor.`)
    }

    if (chunkType === 'IHDR') {
      width = buffer.readUInt32BE(dataStart)
      height = buffer.readUInt32BE(dataStart + 4)
    }

    if (chunkType === 'IEND') {
      sawIend = true
      if (chunkEnd !== buffer.length) {
        throw new ImageUploadValidationError(`${label} sonunda ek veri bulundu. Dosya kabul edilmedi.`)
      }
      break
    }

    isFirstChunk = false
    offset = chunkEnd
  }

  if (!sawIend) {
    throw new ImageUploadValidationError(`${label} geçerli PNG bitiş alanı içermiyor.`)
  }

  return { width, height }
}

function parseJpegDimensions(buffer: Buffer, label: string) {
  if (buffer.length < 4 || buffer[buffer.length - 2] !== 0xff || buffer[buffer.length - 1] !== 0xd9) {
    throw new ImageUploadValidationError(`${label} geçerli JPEG bitiş imzası içermiyor.`)
  }

  let offset = 2

  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }

    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1
    const marker = buffer[offset]
    offset += 1

    if (marker === 0xd9 || marker === 0xda) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue

    if (offset + 2 > buffer.length) {
      throw new ImageUploadValidationError(`${label} JPEG segment yapısı bozuk.`)
    }

    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      throw new ImageUploadValidationError(`${label} JPEG segment uzunluğu geçersiz.`)
    }

    const dataStart = offset + 2
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (segmentLength < 7) {
        throw new ImageUploadValidationError(`${label} JPEG boyut alanı eksik.`)
      }
      return {
        height: buffer.readUInt16BE(dataStart + 1),
        width: buffer.readUInt16BE(dataStart + 3),
      }
    }

    offset += segmentLength
  }

  throw new ImageUploadValidationError(`${label} JPEG boyut bilgisi okunamadı.`)
}

function readUInt24LE(buffer: Buffer, offset: number) {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16)
}

function parseWebpDimensions(buffer: Buffer, label: string) {
  if (buffer.length < 20) {
    throw new ImageUploadValidationError(`${label} WEBP yapısı eksik.`)
  }

  const declaredSize = buffer.readUInt32LE(4) + 8
  if (declaredSize !== buffer.length) {
    throw new ImageUploadValidationError(`${label} WEBP RIFF uzunluğu dosya boyutuyla uyumlu değil.`)
  }

  const chunkType = buffer.subarray(12, 16).toString('ascii')
  const chunkSize = buffer.readUInt32LE(16)
  const dataStart = 20

  if (dataStart + chunkSize > buffer.length) {
    throw new ImageUploadValidationError(`${label} WEBP chunk yapısı bozuk.`)
  }

  if (chunkType === 'VP8X') {
    if (chunkSize < 10) {
      throw new ImageUploadValidationError(`${label} WEBP VP8X boyut alanı eksik.`)
    }
    return {
      width: readUInt24LE(buffer, dataStart + 4) + 1,
      height: readUInt24LE(buffer, dataStart + 7) + 1,
    }
  }

  if (chunkType === 'VP8L') {
    if (chunkSize < 5 || buffer[dataStart] !== 0x2f) {
      throw new ImageUploadValidationError(`${label} WEBP VP8L boyut alanı eksik.`)
    }
    const b1 = buffer[dataStart + 1]
    const b2 = buffer[dataStart + 2]
    const b3 = buffer[dataStart + 3]
    const b4 = buffer[dataStart + 4]
    return {
      width: 1 + b1 + ((b2 & 0x3f) << 8),
      height: 1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
    }
  }

  if (chunkType === 'VP8 ') {
    if (chunkSize < 10 || buffer[dataStart + 3] !== 0x9d || buffer[dataStart + 4] !== 0x01 || buffer[dataStart + 5] !== 0x2a) {
      throw new ImageUploadValidationError(`${label} WEBP VP8 boyut alanı eksik.`)
    }
    return {
      width: buffer.readUInt16LE(dataStart + 6) & 0x3fff,
      height: buffer.readUInt16LE(dataStart + 8) & 0x3fff,
    }
  }

  throw new ImageUploadValidationError(`${label} desteklenen WEBP görüntü chunk'ı içermiyor.`)
}

function parseImageDimensions(kind: SafeImageKind, buffer: Buffer, label: string) {
  if (kind === 'png') return parsePngDimensions(buffer, label)
  if (kind === 'jpeg') return parseJpegDimensions(buffer, label)
  return parseWebpDimensions(buffer, label)
}

export function validateImageBufferForUpload(
  input: SafeImageValidationInput,
  options: SafeImageValidationOptions,
): SafeImageValidationResult {
  const { label, maxBytes } = options

  if (input.size <= 0 || input.buffer.length <= 0) {
    throw new ImageUploadValidationError(`${label} boş olamaz.`)
  }

  if (input.size > maxBytes || input.buffer.length > maxBytes) {
    throw new ImageUploadValidationError(`${label} boyutu en fazla ${Math.floor(maxBytes / (1024 * 1024))}MB olmalıdır.`)
  }

  assertNoBlockedFileHeader(input.buffer, label)

  const detectedKind = detectImageKind(input.buffer)
  if (!detectedKind || !options.allowedKinds.includes(detectedKind)) {
    throw new ImageUploadValidationError(`${label} sadece PNG, JPG veya WEBP formatında olmalıdır.`)
  }

  const expectedContentType = CONTENT_TYPE_BY_KIND[detectedKind]
  const normalizedMime = normalizeMimeType(input.type)
  if (normalizedMime && normalizedMime !== expectedContentType) {
    throw new ImageUploadValidationError(`${label} MIME tipi dosya imzasıyla uyumlu değil.`)
  }

  const extension = getFileExtension(input.name)
  if (!EXTENSIONS_BY_KIND[detectedKind].has(extension)) {
    throw new ImageUploadValidationError(`${label} uzantısı dosya imzasıyla uyumlu değil.`)
  }

  assertNoActivePayload(input.buffer, label)
  const dimensions = parseImageDimensions(detectedKind, input.buffer, label)
  assertSafeDimensions(dimensions.width, dimensions.height, label)

  return {
    buffer: input.buffer,
    kind: detectedKind,
    contentType: expectedContentType,
    extension: EXTENSION_BY_KIND[detectedKind],
    width: dimensions.width,
    height: dimensions.height,
  }
}

export async function validateImageFileForUpload(
  file: File,
  options: SafeImageValidationOptions,
): Promise<SafeImageValidationResult> {
  const buffer = Buffer.from(await file.arrayBuffer())

  return validateImageBufferForUpload(
    {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer,
    },
    options,
  )
}
