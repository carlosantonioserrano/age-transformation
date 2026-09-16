"use client"

import { useEffect, useRef, useState } from "react"
import { Palette } from "lucide-react"

const STORAGE_KEY = "agelab-theme-color"
const DEFAULT_COLOR = "#e0a239" // aproximación del ámbar por defecto de la app

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
 * A partir de un matiz (hue) elegido por el usuario, calcula y aplica todas
 * las variables de color derivadas (botones, acentos, anillos de foco,
 * gráficos, sidebar) como estilos en línea sobre <html>. El brillo/contraste
 * de cada variable queda fijo (ya calibrado para verse bien en fondo oscuro);
 * solo cambia el tono, así el resultado siempre es legible sea cual sea el
 * color elegido.
 */
function applyHue(hue: number) {
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

export function ThemeSwitcher() {
  const [color, setColor] = useState(DEFAULT_COLOR)
  const inputRef = useRef<HTMLInputElement>(null)

  // Al montar, recupera el color guardado del navegador y lo aplica
  // (si no hay ninguno guardado, se queda con el tema por defecto).
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setColor(saved)
      applyHue(hexToHue(saved))
    }
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const hex = event.target.value
    setColor(hex)
    applyHue(hexToHue(hex))
    window.localStorage.setItem(STORAGE_KEY, hex)
  }

  return (
    <div className="flex items-center gap-2">
      <Palette className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Elegir color del tema"
        className="size-5 rounded-full border border-border transition-transform hover:scale-110"
        style={{ backgroundColor: color }}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={handleChange}
        aria-label="Selector de color del tema"
        className="sr-only"
      />
    </div>
  )
}
