import { Skeleton } from "@/components/ui/skeleton"

// Shown while the vehicle record is fetched. Visitors usually arrive from a QR
// code on mobile, so a structured placeholder beats a blank screen.
export default function VehicleLoading() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true">
      <span className="sr-only" role="status">
        Araç bilgileri yükleniyor…
      </span>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-9 w-40" />

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="aspect-square w-full rounded-lg" />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-8 w-40" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-xl" />
              ))}
            </div>

            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-10/12" />
        </div>
      </div>
    </div>
  )
}
