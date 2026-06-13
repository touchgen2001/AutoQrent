"use client"

import Image from "next/image"

import { cn } from "@/lib/utils"

type QrCodeImageProps = {
  value: string
  alt: string
  size?: number
  className?: string
  imageClassName?: string
}

export function QrCodeImage({
  value,
  alt,
  size = 256,
  className,
  imageClassName,
}: QrCodeImageProps) {
  const src = `/api/panel/qr-image?url=${encodeURIComponent(value)}&size=${size}`

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1 print:border-black/20",
        className,
      )}
      style={{ printColorAdjust: "exact" }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        unoptimized
        loading="eager"
        className={cn("block h-full w-full object-contain", imageClassName)}
      />
    </span>
  )
}
