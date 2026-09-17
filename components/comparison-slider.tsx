"use client"

import { useCallback, useRef, useState } from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { ParticleOverlay } from "@/components/particle-overlay"
import type { BackgroundThemeId } from "@/lib/particle-effects"

interface ComparisonSliderProps {
  beforeImage: string
  afterImage: string
  afterFilter?: string
  className?: string
  particleVariant?: BackgroundThemeId
}

export function ComparisonSlider({
  beforeImage,
  afterImage,
  afterFilter,
  className,
  particleVariant = "none",
}: ComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const draggingRef = useRef(false)

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, ratio)))
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      draggingRef.current = true
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      updateFromClientX(e.clientX)
    },
    [updateFromClientX],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return
      updateFromClientX(e.clientX)
    },
    [updateFromClientX],
  )

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 5))
    if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 5))
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-lg border border-border",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={beforeImage} alt="Foto original" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterImage}
          alt="Foto transformada por IA"
          className="h-full w-full object-cover"
          style={{ filter: afterFilter }}
        />
      </div>

      <div className="absolute inset-y-0" style={{ left: `${position}%` }}>
        <div className="absolute inset-y-0 -translate-x-1/2 w-0.5 bg-primary" />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Deslizador de comparación antes y después"
          aria-valuenow={Math.round(position)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={handleKeyDown}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex size-9 cursor-ew-resize items-center justify-center rounded-full border-2 border-primary bg-card text-primary shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </div>
      </div>

      <span className="absolute left-2 top-2 rounded-md bg-background/70 px-2 py-1 text-xs font-mono text-foreground backdrop-blur-sm">
        Antes
      </span>
      <span className="absolute right-2 top-2 rounded-md bg-background/70 px-2 py-1 text-xs font-mono text-foreground backdrop-blur-sm">
        Después
      </span>

      <ParticleOverlay variant={particleVariant} />
    </div>
  )
}
