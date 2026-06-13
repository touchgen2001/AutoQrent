// Minimal store-only (no compression) ZIP writer for the browser. The vehicle
// share images are PNGs — already compressed — so storing them as-is is fine and
// lets us bundle a whole showroom's images without pulling in a deflate library.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2)
  new DataView(out.buffer).setUint16(0, value & 0xffff, true)
  return out
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, value >>> 0, true)
  return out
}

function concat(parts: Uint8Array[]): Uint8Array {
  let length = 0
  for (const part of parts) length += part.length
  const out = new Uint8Array(length)
  let pos = 0
  for (const part of parts) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

export type ZipEntry = { name: string; data: Uint8Array }

export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder()
  const localChunks: Uint8Array[] = []
  const centralChunks: Uint8Array[] = []

  // Fixed DOS date/time (1980-01-01) — share packs don't need real timestamps.
  const dosTime = u16(0)
  const dosDate = u16(0x21)
  // General-purpose bit 11 (0x0800) = filenames are UTF-8.
  const flag = u16(0x0800)

  let offset = 0
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const localHeader = concat([
      u32(0x04034b50), // local file header signature
      u16(20), // version needed
      flag,
      u16(0), // compression method: store
      dosTime,
      dosDate,
      u32(crc),
      u32(size), // compressed size
      u32(size), // uncompressed size
      u16(nameBytes.length),
      u16(0), // extra field length
      nameBytes,
      entry.data,
    ])
    localChunks.push(localHeader)

    const centralHeader = concat([
      u32(0x02014b50), // central directory header signature
      u16(20), // version made by
      u16(20), // version needed
      flag,
      u16(0), // compression method: store
      dosTime,
      dosDate,
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0), // extra field length
      u16(0), // comment length
      u16(0), // disk number start
      u16(0), // internal attributes
      u32(0), // external attributes
      u32(offset), // relative offset of local header
      nameBytes,
    ])
    centralChunks.push(centralHeader)

    offset += localHeader.length
  }

  const centralStart = offset
  let centralSize = 0
  for (const chunk of centralChunks) centralSize += chunk.length

  const endRecord = concat([
    u32(0x06054b50), // end of central directory signature
    u16(0), // disk number
    u16(0), // disk with central directory
    u16(entries.length),
    u16(entries.length),
    u32(centralSize),
    u32(centralStart),
    u16(0), // comment length
  ])

  return new Blob([...localChunks, ...centralChunks, endRecord], { type: "application/zip" })
}
