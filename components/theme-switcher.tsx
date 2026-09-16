"use client"

import { useEffect, useRef, useState } from "react"
import { Palette, PaintBucket, Layers } from "lucide-react"

const ACCENT_STORAGE_KEY = "agelab-theme-accent"
const MAIN_BG_STORAGE_KEY = "agelab-theme-main-bg"
const CARD_BG_STORAGE_KEY = "agelab-theme-card-bg"

const DEFAULT_ACCENT_COLOR = "#e0a239" // aproximación del ámbar por defecto de la app
const DEFAULT_MAIN_BG_COLOR = "#241f1a" // aproximación del fondo general (main) por defecto
const DEFAULT_CARD_BG_COLOR = "#332c24" // aproximación del fondo de tarjetas/divs por defecto

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
 * gráficos). El brillo/contraste de cada variable queda fijo (ya calibrado
 * para verse bien), solo cambia el tono.
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
 * A partir del matiz elegido para el FONDO GENERAL, colorea únicamente la
 * superficie más externa: el <main> / <body> de toda la página (y su texto).
 * No toca tarjetas ni contenedores internos — eso lo maneja applyCardHue.
 */
function applyMainBackgroundHue(hue: number) {
  const root = document.documentElement.style
  const bg = `oklch(0.18 0.07 ${hue})`

  root.setProperty("--background", bg)
  root.setProperty("--foreground", `oklch(0.96 0.01 ${hue})`)
  root.setProperty("--sidebar", `oklch(0.21 0.07 ${hue})`)
  root.setProperty("--sidebar-foreground", `oklch(0.96 0.01 ${hue})`)

  // Respaldo directo: además de la variable CSS (que ya alimenta bg-background
  // en <html>/<body>/<main>), pintamos el body directamente por si algún
  // navegador o build cachea la utilidad de forma distinta.
  document.body.style.backgroundColor = bg
}

/**
 * A partir del matiz elegido para TARJETAS/DIVS, colorea los contenedores
 * internos: las cajas de cada sección (bg-card), popovers, fondos
 * secundarios/muted y el acento de la barra lateral. No toca el fondo
 * general de la página — eso lo maneja applyMainBackgroundHue.
 */
function applyCardBackgroundHue(hue: number) {
  const root = document.documentElement.style

  root.setProperty("--card", `oklch(0.23 0.08 ${hue})`)
  root.setProperty("--card-foreground", `oklch(0.96 0.01 ${hue})`)
  root.setProperty("--popover", `oklch(0.23 0.08 ${hue})`)
  root.setProperty("--popover-foreground", `oklch(0.96 0.01 ${hue})`)
  root.setProperty("--secondary", `oklch(0.28 0.08 ${hue})`)
  root.setProperty("--secondary-foreground", `oklch(0.96 0.01 ${hue})`)
  root.setProperty("--muted", `oklch(0.25 0.07 ${hue})`)
  root.setProperty("--muted-foreground", `oklch(0.68 0.05 ${hue})`)
  root.setProperty("--sidebar-accent", `oklch(0.28 0.08 ${hue})`)
  root.setProperty("--sidebar-accent-foreground", `oklch(0.96 0.01 ${hue})`)
}

type Swatch = {
  key: string
  label: string
  icon: typeof Palette
  color: string
  setColor: (hex: string) => void
  apply: (hue: number) => void
  storageKey: string
}

export function ThemeSwitcher() {
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR)
  const [mainBgColor, setMainBgColor] = useState(DEFAULT_MAIN_BG_COLOR)
  const [cardBgColor, setCardBgColor] = useState(DEFAULT_CARD_BG_COLOR)

  const accentInputRef = useRef<HTMLInputElement>(null)
  const mainBgInputRef = useRef<HTMLInputElement>(null)
  const cardBgInputRef = useRef<HTMLInputElement>(null)

  // Al montar, recupera los 3 colores guardados del navegador y los aplica
  // (si no hay nada guardado para alguno, se queda con el valor por defecto).
  useEffect(() => {
    const savedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY)
    if (savedAccent) {
      setAccentColor(savedAccent)
      applyAccentHue(hexToHue(savedAccent))
    }
    const savedMainBg = window.localStorage.getItem(MAIN_BG_STORAGE_KEY)
    if (savedMainBg) {
      setMainBgColor(savedMainBg)
      applyMainBackgroundHue(hexToHue(savedMainBg))
    }
    const savedCardBg = window.localStorage.getItem(CARD_BG_STORAGE_KEY)
    if (savedCardBg) {
      setCardBgColor(savedCardBg)
      applyCardBackgroundHue(hexToHue(savedCardBg))
    }
  }, [])

  const swatches: Swatch[] = [
    {
      key: "accent",
      label: "Color de botones y acentos",
      icon: Palette,
      color: accentColor,
      setColor: setAccentColor,
      apply: applyAccentHue,
      storageKey: ACCENT_STORAGE_KEY,
    },
    {
      key: "main-bg",
      label: "Color de fondo general",
      icon: PaintBucket,
      color: mainBgColor,
      setColor: setMainBgColor,
      apply: applyMainBackgroundHue,
      storageKey: MAIN_BG_STORAGE_KEY,
    },
    {
      key: "card-bg",
      label: "Color de fondo de las tarjetas",
      icon: Layers,
      color: cardBgColor,
      setColor: setCardBgColor,
      apply: applyCardBackgroundHue,
      storageKey: CARD_BG_STORAGE_KEY,
    },
  ]

  const refs = {
    accent: accentInputRef,
    "main-bg": mainBgInputRef,
    "card-bg": cardBgInputRef,
  } as const

  const handleChange = (swatch: Swatch) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const hex = event.target.value
    swatch.setColor(hex)
    swatch.apply(hexToHue(hex))
    window.localStorage.setItem(swatch.storageKey, hex)
  }

  return (
    <div className="flex items-center gap-3">
      {swatches.map((swatch) => {
        const Icon = swatch.icon
        const ref = refs[swatch.key as keyof typeof refs]
        return (
          <div key={swatch.key} className="flex items-center gap-1.5">
            <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <button
              type="button"
              onClick={() => ref.current?.click()}
              aria-label={swatch.label}
              title={swatch.label}
              className="size-5 rounded-full border border-border transition-transform hover:scale-110"
              style={{ backgroundColor: swatch.color }}
            />
            <input
              ref={ref}
              type="color"
              value={swatch.color}
              onChange={handleChange(swatch)}
              aria-label={`Selector: ${swatch.label}`}
              className="sr-only"
            />
          </div>
        )
      })}
    </div>
  )
}
