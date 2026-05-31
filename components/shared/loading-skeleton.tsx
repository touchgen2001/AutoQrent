import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export function VehicleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-44 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </Card>
  )
}

export function LeadListSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-10 w-10 rounded-lg mb-3" />
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <Skeleton className="h-6 w-1/4 mb-4" />
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-1/4 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
