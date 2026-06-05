#!/usr/bin/env node

import { Buffer } from 'node:buffer'
import {
  ImageUploadValidationError,
  validateImageBufferForUpload,
} from '../../lib/server/safe-image-upload.ts'

function objectPathFromStoragePublicUrl(publicUrl, bucket = 'vehicle-images') {
  try {
    const parsed = new URL(publicUrl)
    const marker = `/storage/v1/object/public/${bucket}/`
    const markerIndex = parsed.pathname.indexOf(marker)
    if (markerIndex < 0) return null

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length))
  } catch {
    return null
  }
}

function isGalleryVehicleImagePath(objectPath, galleryId) {
  return objectPath.startsWith(`panel/${galleryId}/vehicle-images/`)
}

function isLegacyOwnedVehicleImagePath(objectPath) {
  return objectPath.startsWith('panel/') && !objectPath.startsWith('panel/gallery-logos/')
}

function normalizeGalleryVehicleImagePath(input) {
  const rawPath = input.path?.trim() || (input.publicUrl ? objectPathFromStoragePublicUrl(input.publicUrl) : null)
  if (!rawPath) return null

  const normalizedPath = rawPath.replace(/^\/+/, '')
  if (!isGalleryVehicleImagePath(normalizedPath, input.galleryId)) {
    if (!input.allowOwnedLegacyPanelPaths || !isLegacyOwnedVehicleImagePath(normalizedPath)) {
      return null
    }
  }

  return normalizedPath
}

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
)

function crc32(buffer) {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const chunk = Buffer.alloc(12 + data.length)

  chunk.writeUInt32BE(data.length, 0)
  typeBuffer.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length)

  return chunk
}

function pngWithTextChunk(textData) {
  const pngSignatureLength = 8
  const ihdrChunkLength = 4 + 4 + 13 + 4
  const ihdrEnd = pngSignatureLength + ihdrChunkLength

  return Buffer.concat([
    onePixelPng.subarray(0, ihdrEnd),
    pngChunk('tEXt', textData),
    onePixelPng.subarray(ihdrEnd),
  ])
}

function validate(input, options = {}) {
  return validateImageBufferForUpload(
    {
      name: input.name,
      type: input.type,
      size: input.buffer.length,
      buffer: input.buffer,
    },
    {
      allowedKinds: ['jpeg', 'png', 'webp'],
      maxBytes: 10 * 1024 * 1024,
      label: input.name,
      ...options,
    },
  )
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function expectRejected(name, fn) {
  try {
    fn()
  } catch (error) {
    if (error instanceof ImageUploadValidationError) {
      return error.message
    }
    throw error
  }

  throw new Error(`${name} should have been rejected`)
}

const accepted = validate({
  name: 'safe-photo.png',
  type: 'image/png',
  buffer: onePixelPng,
})

assert(accepted.kind === 'png', 'Valid PNG should be detected as png')
assert(accepted.width === 1 && accepted.height === 1, 'Valid PNG dimensions should be parsed')

const pngWithArchiveLikeMetadata = validate({
  name: 'clean-metadata.png',
  type: 'image/png',
  buffer: pngWithTextChunk(Buffer.from('Comment\x00normal PK\x03\x04 bytes in valid PNG metadata', 'latin1')),
})

assert(
  pngWithArchiveLikeMetadata.kind === 'png',
  'PNG containing archive-like bytes inside valid metadata should be accepted',
)

const svgRejection = expectRejected('svg payload', () => {
  validate({
    name: 'logo.svg',
    type: 'image/svg+xml',
    buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
  })
})

const spoofRejection = expectRejected('mime spoof', () => {
  validate({
    name: 'spoof.jpg',
    type: 'image/jpeg',
    buffer: onePixelPng,
  })
})

const scriptRejection = expectRejected('active payload', () => {
  validate({
    name: 'payload.png',
    type: 'image/png',
    buffer: Buffer.concat([onePixelPng, Buffer.from('<script>alert(1)</script>')]),
  })
})

const zipHeaderRejection = expectRejected('zip file header', () => {
  validate({
    name: 'zip-as-image.png',
    type: 'image/png',
    buffer: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), onePixelPng]),
  })
})

const executableHeaderRejection = expectRejected('executable file header', () => {
  validate({
    name: 'exe-as-image.png',
    type: 'image/png',
    buffer: Buffer.concat([Buffer.from([0x4d, 0x5a]), onePixelPng]),
  })
})

const trailingZipRejection = expectRejected('trailing archive', () => {
  validate({
    name: 'archive.png',
    type: 'image/png',
    buffer: Buffer.concat([onePixelPng, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])]),
  })
})

const ownPublicUrl =
  'https://example.supabase.co/storage/v1/object/public/vehicle-images/panel/gal_1/vehicle-images/photo-1.png'
const otherPublicUrl =
  'https://example.supabase.co/storage/v1/object/public/vehicle-images/panel/gal_2/vehicle-images/photo-1.png'
const legacyPublicUrl =
  'https://example.supabase.co/storage/v1/object/public/vehicle-images/panel/1740000000000.jpeg'

const extractedPath = objectPathFromStoragePublicUrl(ownPublicUrl)
const ownPath = normalizeGalleryVehicleImagePath({ publicUrl: ownPublicUrl, galleryId: 'gal_1' })
const otherPath = normalizeGalleryVehicleImagePath({ publicUrl: otherPublicUrl, galleryId: 'gal_1' })
const legacyRejectedByDefault = normalizeGalleryVehicleImagePath({ publicUrl: legacyPublicUrl, galleryId: 'gal_1' })
const legacyAcceptedForOwnedVehicle = normalizeGalleryVehicleImagePath({
  publicUrl: legacyPublicUrl,
  galleryId: 'gal_1',
  allowOwnedLegacyPanelPaths: true,
})

assert(extractedPath === 'panel/gal_1/vehicle-images/photo-1.png', 'Public URL should extract object path')
assert(ownPath === 'panel/gal_1/vehicle-images/photo-1.png', 'Own gallery vehicle path should be accepted')
assert(otherPath === null, 'Other gallery vehicle path should be rejected')
assert(legacyRejectedByDefault === null, 'Legacy path should be rejected for direct user delete')
assert(legacyAcceptedForOwnedVehicle === 'panel/1740000000000.jpeg', 'Owned vehicle legacy path should be accepted')

console.log(
  JSON.stringify(
    {
      ok: true,
      accepted: {
        kind: accepted.kind,
        contentType: accepted.contentType,
        width: accepted.width,
        height: accepted.height,
      },
      acceptedArchiveLikeMetadata: {
        kind: pngWithArchiveLikeMetadata.kind,
        contentType: pngWithArchiveLikeMetadata.contentType,
        width: pngWithArchiveLikeMetadata.width,
        height: pngWithArchiveLikeMetadata.height,
      },
      rejected: {
        svg: svgRejection,
        mimeSpoof: spoofRejection,
        activePayload: scriptRejection,
        zipHeader: zipHeaderRejection,
        executableHeader: executableHeaderRejection,
        trailingArchive: trailingZipRejection,
      },
      storageDeleteScope: {
        ownPathAccepted: ownPath,
        otherGalleryRejected: otherPath === null,
        legacyDirectDeleteRejected: legacyRejectedByDefault === null,
        legacyOwnedVehicleDeleteAccepted: legacyAcceptedForOwnedVehicle,
      },
    },
    null,
    2,
  ),
)
