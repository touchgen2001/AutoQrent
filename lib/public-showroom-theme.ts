export const PUBLIC_SHOWROOM_THEME_VALUES = ['premium', 'classic', 'sport'] as const
export const PUBLIC_SHOWROOM_BACKGROUND_VALUES = ['warm', 'light', 'graphite'] as const

export type PublicShowroomTheme = (typeof PUBLIC_SHOWROOM_THEME_VALUES)[number]
export type PublicShowroomBackground = (typeof PUBLIC_SHOWROOM_BACKGROUND_VALUES)[number]

export type PublicShowroomThemeSettings = {
  theme: PublicShowroomTheme
  accentColor: string
  backgroundStyle: PublicShowroomBackground
  heroTagline: string
  heroNote: string
}

type PublicShowroomThemeInput = {
  theme?: unknown
  accentColor?: unknown
  backgroundStyle?: unknown
  heroTagline?: unknown
  heroNote?: unknown
}

export const PUBLIC_SHOWROOM_TAGLINE_MAX = 80

export const DEFAULT_PUBLIC_SHOWROOM_THEME: PublicShowroomThemeSettings = {
  theme: 'premium',
  accentColor: '#2f2d2c',
  backgroundStyle: 'warm',
  heroTagline: '',
  heroNote: '',
}

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i

export function isPublicShowroomTheme(value: unknown): value is PublicShowroomTheme {
  return typeof value === 'string' && PUBLIC_SHOWROOM_THEME_VALUES.includes(value as PublicShowroomTheme)
}

export function isPublicShowroomBackground(value: unknown): value is PublicShowroomBackground {
  return typeof value === 'string' && PUBLIC_SHOWROOM_BACKGROUND_VALUES.includes(value as PublicShowroomBackground)
}

export function isSafePublicAccentColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_REGEX.test(value.trim())
}

export function normalizePublicShowroomTheme(input: PublicShowroomThemeInput | null | undefined) {
  const theme = isPublicShowroomTheme(input?.theme)
    ? input.theme
    : DEFAULT_PUBLIC_SHOWROOM_THEME.theme
  const accentColor = isSafePublicAccentColor(input?.accentColor)
    ? input.accentColor.trim().toLowerCase()
    : DEFAULT_PUBLIC_SHOWROOM_THEME.accentColor
  const backgroundStyle = isPublicShowroomBackground(input?.backgroundStyle)
    ? input.backgroundStyle
    : DEFAULT_PUBLIC_SHOWROOM_THEME.backgroundStyle
  const heroTagline = typeof input?.heroTagline === 'string'
    ? input.heroTagline.trim().slice(0, PUBLIC_SHOWROOM_TAGLINE_MAX)
    : DEFAULT_PUBLIC_SHOWROOM_THEME.heroTagline
  const heroNote = typeof input?.heroNote === 'string'
    ? input.heroNote.trim().slice(0, 220)
    : DEFAULT_PUBLIC_SHOWROOM_THEME.heroNote

  return {
    theme,
    accentColor,
    backgroundStyle,
    heroTagline,
    heroNote,
  } satisfies PublicShowroomThemeSettings
}
