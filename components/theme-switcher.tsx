"use client"

import { useEffect, useRef, useState } from "react"
import { Palette, PaintBucket, Layers } from "lucide-react"

const ACCENT_STORAGE_KEY = "agelab-theme-accent"
const MAIN_BG_STORAGE_KEY = "agelab-theme-main-bg"
const CARD_BG_STORAGE_KEY = "agelab-theme-card-bg"

const DEFAULT_ACCENT_COLOR = "#e0a239" // aproximación del ámbar por defecto de la app
const DEFAULT_MAIN_BG_COLOR = "#fafaf9" // aproximación del fondo general (main) por defecto: claro
const DEFAULT_CARD_BG_COLOR = "#ffffff" // aproximación del fondo de tarjetas/divs por defecto: blanco

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Convierte un color hex (#rrggbb) a matiz (hue, 0-360), saturación (0-1) y
 * luminosidad (lightness, 0-1), usando la fórmula estándar de HSL.
 * - La saturación evita que blanco/gris/negro (sin matiz real) se vean con
 *   un tinte de color no deseado.
 * - La luminosidad es la pieza clave para que el color elegido controle de
 *   verdad si el resultado es claro u oscuro, en vez de forzar siempre un
 *   brillo fijo.
 */
function hexToHueSatLightness(hex: string): { hue: number; sat: number; lightness: number } {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2

  if (d === 0) return { hue: 0, sat: 0, lightness: l }

  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360

  const sat = d / (1 - Math.abs(2 * l - 1))
  return { hue: h, sat: Math.min(1, sat), lightness: l }
}

/** Texto legible: claro sobre fondos oscuros, oscuro sobre fondos claros. */
function contrastingTextLightness(surfaceLightness: number): number {
  return surfaceLightness < 0.5 ? 0.96 : 0.18
}

/**
 * A partir del color elegido para BOTONES/ACENTOS, calcula y aplica
 * primary/accent (botones, enlaces, anillos de foco, gráficos). El texto
 * sobre el botón (--primary-foreground) se ajusta según qué tan claro u
 * oscuro sea el color elegido, para que siempre sea legible.
 */
function applyAccentColor(hue: number, sat: number, lightness: number) {
  const root = document.documentElement.style
  const accentHue = (hue + 130) % 360
  const l = clamp(lightness, 0.25, 0.85) // un botón demasiado oscuro o casi blanco pierde su función de "acento"
  const c1 = 0.15 * sat
  const c2 = 0.1 * sat
  const textL = contrastingTextLightness(l)

  root.setProperty("--primary", `oklch(${l} ${c1} ${hue})`)
  root.setProperty("--primary-foreground", `oklch(${textL} ${0.02 * sat} ${hue})`)
  root.setProperty("--accent", `oklch(${l} ${c2} ${accentHue})`)
  root.setProperty("--accent-foreground", `oklch(${contrastingTextLightness(l)} ${0.02 * sat} ${accentHue})`)
  root.setProperty("--ring", `oklch(${l} ${c1} ${hue} / 0.5)`)
  root.setProperty("--chart-1", `oklch(${l} ${c1} ${hue})`)
  root.setProperty("--chart-2", `oklch(${l} ${c2} ${accentHue})`)
  root.setProperty("--sidebar-primary", `oklch(${l} ${c1} ${hue})`)
  root.setProperty("--sidebar-primary-foreground", `oklch(${textL} ${0.02 * sat} ${hue})`)
  root.setProperty("--sidebar-ring", `oklch(${l} ${c1} ${hue} / 0.5)`)
}

/**
 * A partir del color elegido para el FONDO GENERAL, colorea la superficie
 * más externa: el <main>/<body> de toda la página (y su texto). No toca
 * tarjetas ni contenedores internos — eso lo maneja applyCardBackgroundColor.
 * El brillo real del color elegido decide si el resultado es un tema claro
 * o uno oscuro.
 */
function applyMainBackgroundColor(hue: number, sat: number, lightness: number) {
  const root = document.documentElement.style
  const bgL = clamp(lightness, 0.05, 0.98)
  const textL = contrastingTextLightness(bgL)
  const c = 0.06 * sat
  const bg = `oklch(${bgL} ${c} ${hue})`

  root.setProperty("--background", bg)
  root.setProperty("--foreground", `oklch(${textL} ${0.015 * sat} ${hue})`)
  root.setProperty("--sidebar", `oklch(${bgL} ${c} ${hue})`)
  root.setProperty("--sidebar-foreground", `oklch(${textL} ${0.015 * sat} ${hue})`)
  root.setProperty("color-scheme", bgL < 0.5 ? "dark" : "light")

  // Respaldo directo: además de la variable CSS (que ya alimenta bg-background
  // en <html>/<body>/<main>), pintamos el body directamente por si algún
  // navegador o build cachea la utilidad de forma distinta.
  document.body.style.backgroundColor = bg
}

/**
 * A partir del color elegido para TARJETAS/DIVS, colorea los contenedores
 * internos: las cajas de cada sección (bg-card), popovers, fondos
 * secundarios/muted y el acento de la barra lateral. La tarjeta siempre
 * queda un poco más cerca del extremo "claro" que el color elegido — el
 * mismo criterio con el que ya se ven las tarjetas en modo oscuro (más
 * claras que el fondo) y en modo claro (blancas sobre un fondo apenas gris).
 */
function applyCardBackgroundColor(hue: number, sat: number, lightness: number) {
  const root = document.documentElement.style
  const baseL = clamp(lightness, 0.05, 0.98)
  const isDarkBase = baseL < 0.5

  const cardL = isDarkBase ? Math.min(0.97, baseL + 0.09) : Math.min(0.995, baseL + 0.02)
  const secondaryL = isDarkBase ? Math.min(0.97, baseL + 0.13) : Math.max(0.86, baseL - 0.05)
  const mutedL = isDarkBase ? Math.min(0.97, baseL + 0.11) : Math.max(0.88, baseL - 0.03)
  const mutedTextL = isDarkBase ? 0.68 : 0.42

  const c = 0.07 * sat
  const textL = contrastingTextLightness(cardL)

  root.setProperty("--card", `oklch(${cardL} ${c} ${hue})`)
  root.setProperty("--card-foreground", `oklch(${textL} ${0.015 * sat} ${hue})`)
  root.setProperty("--popover", `oklch(${cardL} ${c} ${hue})`)
  root.setProperty("--popover-foreground", `oklch(${textL} ${0.015 * sat} ${hue})`)
  root.setProperty("--secondary", `oklch(${secondaryL} ${c} ${hue})`)
  root.setProperty("--secondary-foreground", `oklch(${contrastingTextLightness(secondaryL)} ${0.015 * sat} ${hue})`)
  root.setProperty("--muted", `oklch(${mutedL} ${c * 0.85} ${hue})`)
  root.setProperty("--muted-foreground", `oklch(${mutedTextL} ${0.04 * sat} ${hue})`)
  root.setProperty("--sidebar-accent", `oklch(${secondaryL} ${c} ${hue})`)
  root.setProperty("--sidebar-accent-foreground", `oklch(${contrastingTextLightness(secondaryL)} ${0.015 * sat} ${hue})`)
}

type Swatch = {
  key: string
  label: string
  icon: typeof Palette
  color: string
  setColor: (hex: string) => void
  apply: (hue: number, sat: number, lightness: number) => void
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
  // (si no hay nada guardado para alguno, se queda con el valor por defecto
  // — que ahora es el tema claro definido en globals.css, sin tocar nada).
  useEffect(() => {
    const savedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY)
    if (savedAccent) {
      setAccentColor(savedAccent)
      const { hue, sat, lightness } = hexToHueSatLightness(savedAccent)
      applyAccentColor(hue, sat, lightness)
    }
    const savedMainBg = window.localStorage.getItem(MAIN_BG_STORAGE_KEY)
    if (savedMainBg) {
      setMainBgColor(savedMainBg)
      const { hue, sat, lightness } = hexToHueSatLightness(savedMainBg)
      applyMainBackgroundColor(hue, sat, lightness)
    }
    const savedCardBg = window.localStorage.getItem(CARD_BG_STORAGE_KEY)
    if (savedCardBg) {
      setCardBgColor(savedCardBg)
      const { hue, sat, lightness } = hexToHueSatLightness(savedCardBg)
      applyCardBackgroundColor(hue, sat, lightness)
    }
  }, [])

  const swatches: Swatch[] = [
    {
      key: "accent",
      label: "Color de botones y acentos",
      icon: Palette,
      color: accentColor,
      setColor: setAccentColor,
      apply: applyAccentColor,
      storageKey: ACCENT_STORAGE_KEY,
    },
    {
      key: "main-bg",
      label: "Color de fondo general",
      icon: PaintBucket,
      color: mainBgColor,
      setColor: setMainBgColor,
      apply: applyMainBackgroundColor,
      storageKey: MAIN_BG_STORAGE_KEY,
    },
    {
      key: "card-bg",
      label: "Color de fondo de las tarjetas",
      icon: Layers,
      color: cardBgColor,
      setColor: setCardBgColor,
      apply: applyCardBackgroundColor,
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
    const { hue, sat, lightness } = hexToHueSatLightness(hex)
    swatch.apply(hue, sat, lightness)
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
