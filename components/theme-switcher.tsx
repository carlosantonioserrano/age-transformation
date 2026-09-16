"use client"

import { useEffect, useRef, useState } from "react"
import { Palette, PaintBucket } from "lucide-react"

const ACCENT_STORAGE_KEY = "agelab-theme-accent"
const BACKGROUND_STORAGE_KEY = "agelab-theme-background"
const DEFAULT_ACCENT_COLOR = "#e0a239" // aproximación del ámbar por defecto de la app
const DEFAULT_BACKGROUND_COLOR = "#2b2620" // aproximación del fondo oscuro por defecto

/** Convierte un color hex (#rrggbb) a su matiz (hue) en grados, 0-360. */
function hexToHue(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0

  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4

  h *= 60
  if (h < 0) h += 360
  return h
}

/**
 * A partir del matiz elegido para BOTONES/ACENTOS, calcula y aplica las
 * variables de color de primary/accent (botones, enlaces, anillos de foco,
 * gráficos, sidebar). El brillo/contraste de cada variable queda fijo (ya
 * calibrado para verse bien), solo cambia el tono.
 */
function applyAccentHue(hue: number) {
  const root = document.documentElement.style
  const accentHue = (hue + 130) % 360

  root.setProperty("--primary", `oklch(0.74 0.15 ${hue})`)
  root.setProperty("--primary-foreground", `oklch(0.15 0.02 ${hue})`)
  root.setProperty("--accent", `oklch(0.68 0.1 ${accentHue})`)
  root.setProperty("--accent-foreground", `oklch(0.14 0.02 ${accentHue})`)
  root.setProperty("--ring", `oklch(0.74 0.15 ${hue} / 0.5)`)
  root.setProperty("--chart-1", `oklch(0.74 0.15 ${hue})`)
  root.setProperty("--chart-2", `oklch(0.68 0.1 ${accentHue})`)
  root.setProperty("--sidebar-primary", `oklch(0.74 0.15 ${hue})`)
  root.setProperty("--sidebar-primary-foreground", `oklch(0.15 0.02 ${hue})`)
  root.setProperty("--sidebar-ring", `oklch(0.74 0.15 ${hue} / 0.5)`)
}

/**
 * A partir del matiz elegido para el FONDO, calcula y aplica las superficies
 * oscuras de la app (fondo general, tarjetas, popovers, sidebar) y sus
 * textos. La luminosidad se mantiene baja (para seguir siendo un tema
 * oscuro) y el texto se mantiene casi blanco con muy poco tinte, así el
 * contraste de lectura nunca se ve comprometido sin importar el color.
 */
function applyBackgroundHue(hue: number) {
  const root = document.documentElement.style

  root.setProperty("--background", `oklch(0.16 0.025 ${hue})`)
  root.setProperty("--foreground", `oklch(0.95 0.008 ${hue})`)
  root.setProperty("--card", `oklch(0.21 0.028 ${hue})`)
  root.setProperty("--card-foreground", `oklch(0.95 0.008 ${hue})`)
  root.setProperty("--popover", `oklch(0.21 0.028 ${hue})`)
  root.setProperty("--popover-foreground", `oklch(0.95 0.008 ${hue})`)
  root.setProperty("--secondary", `oklch(0.27 0.03 ${hue})`)
  root.setProperty("--secondary-foreground", `oklch(0.95 0.008 ${hue})`)
  root.setProperty("--muted", `oklch(0.24 0.028 ${hue})`)
  root.setProperty("--muted-foreground", `oklch(0.65 0.03 ${hue})`)
  root.setProperty("--sidebar", `oklch(0.19 0.026 ${hue})`)
  root.setProperty("--sidebar-foreground", `oklch(0.95 0.008 ${hue})`)
  root.setProperty("--sidebar-accent", `oklch(0.27 0.03 ${hue})`)
  root.setProperty("--sidebar-accent-foreground", `oklch(0.95 0.008 ${hue})`)
}

export function ThemeSwitcher() {
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR)
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND_COLOR)
  const accentInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  // Al montar, recupera los colores guardados del navegador y los aplica
  // (si no hay nada guardado, se queda con el tema por defecto de la app).
  useEffect(() => {
    const savedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY)
    if (savedAccent) {
      setAccentColor(savedAccent)
      applyAccentHue(hexToHue(savedAccent))
    }
    const savedBackground = window.localStorage.getItem(BACKGROUND_STORAGE_KEY)
    if (savedBackground) {
      setBackgroundColor(savedBackground)
      applyBackgroundHue(hexToHue(savedBackground))
    }
  }, [])

  const handleAccentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const hex = event.target.value
    setAccentColor(hex)
    applyAccentHue(hexToHue(hex))
    window.localStorage.setItem(ACCENT_STORAGE_KEY, hex)
  }

  const handleBackgroundChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const hex = event.target.value
    setBackgroundColor(hex)
    applyBackgroundHue(hexToHue(hex))
    window.localStorage.setItem(BACKGROUND_STORAGE_KEY, hex)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Palette className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <button
          type="button"
          onClick={() => accentInputRef.current?.click()}
          aria-label="Elegir color de botones y acentos"
          title="Color de botones y acentos"
          className="size-5 rounded-full border border-border transition-transform hover:scale-110"
          style={{ backgroundColor: accentColor }}
        />
        <input
          ref={accentInputRef}
          type="color"
          value={accentColor}
          onChange={handleAccentChange}
          aria-label="Selector de color de botones y acentos"
          className="sr-only"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <PaintBucket className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <button
          type="button"
          onClick={() => backgroundInputRef.current?.click()}
          aria-label="Elegir color de fondo"
          title="Color de fondo"
          className="size-5 rounded-full border border-border transition-transform hover:scale-110"
          style={{ backgroundColor }}
        />
        <input
          ref={backgroundInputRef}
          type="color"
          value={backgroundColor}
          onChange={handleBackgroundChange}
          aria-label="Selector de color de fondo"
          className="sr-only"
        />
      </div>
    </div>
  )
}
