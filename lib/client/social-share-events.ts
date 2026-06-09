// Best-effort client helper that tells the panel a dealer downloaded one or more
// vehicle share images. Powers the "en çok indirilen araç görselleri" card. It
// never throws and never blocks the download UX — analytics failures are silently
// ignored, and `keepalive` lets the request finish even if the dialog closes.
export async function recordVehicleShareDownloads(
  items: Array<{ vehicleId?: string | null; vehicleTitle?: string | null }>,
  options: { format?: string; scope?: 'single' | 'zip' } = {},
): Promise<void> {
  const valid = items
    .filter((item): item is { vehicleId: string; vehicleTitle?: string | null } => Boolean(item.vehicleId))
    .map((item) => ({ vehicleId: item.vehicleId, vehicleTitle: item.vehicleTitle ?? undefined }))

  if (valid.length === 0) return

  try {
    await fetch('/api/panel/social-image-events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: valid, format: options.format, scope: options.scope ?? 'single' }),
      cache: 'no-store',
      keepalive: true,
    })
  } catch {
    // Best-effort analytics: a tracking hiccup must never disrupt the download.
  }
}
