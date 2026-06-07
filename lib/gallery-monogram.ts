// Derives a 1–2 letter monogram from a gallery name, used as a branded fallback
// mark wherever a gallery has not uploaded a logo (showroom header, social/OG
// share cards). Turkish-aware casing (i → İ) so "istanbul oto" → "İO".
//
// Rules: two or more words → first letter of the first two words; a single word
// → its first two letters. Punctuation/symbols are ignored. Returns '' when the
// name yields nothing usable so callers can decide on their own fallback.
export function galleryInitials(name: string | null | undefined): string {
  const cleaned = (name || '').trim()
  if (!cleaned) return ''

  const words = cleaned
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)

  if (words.length === 0) return ''

  const upper = (value: string) => value.toLocaleUpperCase('tr-TR')

  if (words.length === 1) {
    return upper(words[0].slice(0, 2))
  }

  return upper(words[0][0] + words[1][0])
}

// Convenience for surfaces that always want a visible mark; falls back to the
// Cebindegaleri brand initials when a name is empty.
export function galleryInitialsWithFallback(name: string | null | undefined): string {
  return galleryInitials(name) || 'CG'
}
