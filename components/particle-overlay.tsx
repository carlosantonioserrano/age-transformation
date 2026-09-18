"use client"

import { useEffect, useRef } from "react"
import { type BackgroundThemeId, createParticles, drawParticles, stepParticles } from "@/lib/particle-effects"

interface ParticleOverlayProps {
  variant: BackgroundThemeId
}

/**
 * Canvas absolutamente posicionado (inset-0) que dibuja el efecto animado
 * (nieve/lluvia/hojas/olas) encima de lo que sea que tenga el padre. El
 * padre debe tener `position: relative` (o similar) para que el overlay se
 * ajuste correctamente. No intercepta clics (`pointer-events: none`).
 */
export function ParticleOverlay({ variant }: ParticleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (variant === "none" || variant === "solid") return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    let width = 0
    let height = 0
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      width = rect?.width ?? canvas.clientWidth ?? 0
      height = rect?.height ?? canvas.clientHeight ?? 0
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    let particles = createParticles(variant, width, height)

    const handleResize = () => {
      resize()
      particles = createParticles(variant, width, height)
    }
    window.addEventListener("resize", handleResize)

    let rafId = 0
    let lastTime = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      ctx.clearRect(0, 0, width, height)
      particles = stepParticles(variant, particles, width, height, dt)
      drawParticles(ctx, variant, particles, width, height)
      rafId = requestAnimationFrame(loop)
    }

    if (prefersReducedMotion) {
      // Respeta la preferencia de "menos movimiento": un solo fotograma estático, sin animar.
      drawParticles(ctx, variant, particles, width, height)
    } else {
      rafId = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", handleResize)
    }
  }, [variant])

  if (variant === "none" || variant === "solid") return null

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
}
