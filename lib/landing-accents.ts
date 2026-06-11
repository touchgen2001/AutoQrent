// Soft, rotating accent colours for landing-page icon tiles. Adds warmth/variety
// to the otherwise-monochrome marketing pages WITHOUT touching the global theme
// tokens (which stay a premium neutral grayscale for the app/panel).
export const LANDING_ACCENTS = [
  "bg-amber-500/10 text-amber-600",
  "bg-indigo-500/10 text-indigo-600",
  "bg-emerald-500/10 text-emerald-600",
  "bg-rose-500/10 text-rose-600",
  "bg-sky-500/10 text-sky-600",
  "bg-violet-500/10 text-violet-600",
] as const

export function landingAccent(index: number): string {
  return LANDING_ACCENTS[index % LANDING_ACCENTS.length]
}
