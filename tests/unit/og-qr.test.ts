import { describe, expect, it } from 'vitest'

import { buildQrPath } from '../../lib/og-qr'

// Pack a boolean module matrix exactly the way the client packer
// (lib/client/qr-matrix.ts) does: row-major, MSB-first within each byte. The
// roundtrip tests below feed this into buildQrPath and check we get the same
// dark cells back, proving the encode/decode conventions are inverses.
function packMatrix(matrix: number[][]): { qr: string; n: number } {
  const size = matrix.length
  const total = size * size
  const bytes = new Uint8Array(Math.ceil(total / 8))
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / size)
    const col = i % size
    if (matrix[row][col]) bytes[i >> 3] |= 1 << (7 - (i & 7))
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return { qr: btoa(binary), n: size }
}

function makeMatrix(size: number, darkCells: Array<[number, number]>): number[][] {
  const matrix = Array.from({ length: size }, () => new Array<number>(size).fill(0))
  for (const [row, col] of darkCells) matrix[row][col] = 1
  return matrix
}

// Parse a buildQrPath result back into [row, col] dark cells.
function parsePath(d: string): Array<[number, number]> {
  const cells: Array<[number, number]> = []
  const re = /M(\d+) (\d+)h1v1h-1z/g
  let match: RegExpExecArray | null
  while ((match = re.exec(d))) {
    cells.push([Number(match[2]), Number(match[1])])
  }
  return cells
}

const sortCells = (cells: Array<[number, number]>) =>
  [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1])

describe('buildQrPath', () => {
  it('emits one M{col} {row}h1v1h-1z square per dark module, in row-major order', () => {
    const { qr, n } = packMatrix(makeMatrix(21, [[0, 0], [2, 3]]))
    expect(buildQrPath(qr, n)).toBe('M0 0h1v1h-1zM3 2h1v1h-1z')
  })

  it('round-trips an arbitrary set of dark cells', () => {
    const cells: Array<[number, number]> = [[0, 0], [2, 3], [5, 18], [20, 20], [11, 0]]
    const { qr, n } = packMatrix(makeMatrix(21, cells))
    const path = buildQrPath(qr, n)
    expect(path).toBeTruthy()
    expect(sortCells(parsePath(path as string))).toEqual(sortCells(cells))
  })

  it('returns null for empty or missing input', () => {
    expect(buildQrPath(null, 21)).toBeNull()
    expect(buildQrPath(undefined, 21)).toBeNull()
    expect(buildQrPath('', 21)).toBeNull()
  })

  it('returns null for an all-light matrix (no squares to draw)', () => {
    const { qr, n } = packMatrix(makeMatrix(21, []))
    expect(buildQrPath(qr, n)).toBeNull()
  })

  it('rejects sizes outside the valid QR range (21..177) and non-integers', () => {
    const { qr } = packMatrix(makeMatrix(21, [[0, 0]]))
    expect(buildQrPath(qr, 20)).toBeNull()
    expect(buildQrPath(qr, 178)).toBeNull()
    expect(buildQrPath(qr, 21.5)).toBeNull()
  })

  it('returns null when the packed payload is too short for the declared size', () => {
    // A 21×21 matrix needs ceil(441/8) = 56 bytes; "ab" is only 2.
    expect(buildQrPath(btoa('ab'), 21)).toBeNull()
  })

  it('round-trips a real client-generated matrix (lib/client/qr-matrix)', async () => {
    const { packQrMatrix } = await import('../../lib/client/qr-matrix')
    const packed = packQrMatrix('https://demo.cebindegaleri.com/arac/bmw-320i?src=qr')
    expect(packed).not.toBeNull()
    if (!packed) return

    expect(Number.isInteger(packed.n)).toBe(true)
    expect(packed.n).toBeGreaterThanOrEqual(21)
    expect(packed.n).toBeLessThanOrEqual(177)

    const path = buildQrPath(packed.qr, packed.n)
    expect(path).toBeTruthy()
    const squares = ((path as string).match(/h1v1h-1z/g) || []).length
    expect(squares).toBeGreaterThan(0)
  })
})
