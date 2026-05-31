import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  className 
}: MetricCardProps) {
  return (
    <Card className={cn('p-5 bg-card border-border/50', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              'text-xs font-medium',
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}% son 7 gün
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-accent/10">
            <Icon className="h-5 w-5 text-accent" />
          </div>
        )}
      </div>
    </Card>
  )
}

// Large Metric Card for Hero Stats
interface LargeMetricCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  description?: string
  className?: string
}

export function LargeMetricCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  className 
}: LargeMetricCardProps) {
  return (
    <Card className={cn('p-6 bg-card border-border/50 text-center', className)}>
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
          <Icon className="h-6 w-6 text-accent" />
        </div>
      )}
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground mt-1">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </Card>
  )
}
