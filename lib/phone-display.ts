// Format a stored Turkish phone number (normalized to `0XXXXXXXXXX`) for display
// as `0XXX XXX XX XX`. Falls back to the trimmed raw value when it can't be
// confidently parsed, so we never render obviously-broken output on a share card.
export function formatTrPhoneDisplay(raw: string | null | undefined): string {
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""

  let local = digits
  if (local.startsWith("90") && local.length === 12) local = local.slice(2)
  if (local.length === 10) local = `0${local}` // missing the leading 0

  if (local.length !== 11 || !local.startsWith("0")) return raw.trim()

  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7, 9)} ${local.slice(9, 11)}`
}
