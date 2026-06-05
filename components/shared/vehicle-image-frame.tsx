import Image from 'next/image'
import { Car } from 'lucide-react'

import { cn } from '@/lib/utils'

type VehicleImageFrameProps = {
  src?: string | null
  alt: string
  className?: string
  imageClassName?: string
  placeholderClassName?: string
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  quality?: number
  loading?: 'eager' | 'lazy'
  preload?: boolean
  placeholderLabel?: string
}

export function VehicleImageFrame({
  src,
  alt,
  className,
  imageClassName,
  placeholderClassName,
  fill = true,
  width,
  height,
  sizes,
  quality,
  loading = 'lazy',
  preload,
  placeholderLabel = 'Görsel yok',
}: VehicleImageFrameProps) {
  const imageSrc = src?.trim()

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-muted', className)}>
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill={fill}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          sizes={sizes}
          quality={quality}
          loading={loading}
          preload={preload}
          className={cn('object-cover', imageClassName)}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground',
            placeholderClassName,
          )}
          role="img"
          aria-label={placeholderLabel}
        >
          <Car className="h-10 w-10 opacity-45" />
          <span className="text-xs font-medium">{placeholderLabel}</span>
        </div>
      )}
    </div>
  )
}
