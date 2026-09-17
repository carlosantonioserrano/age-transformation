export type BackgroundThemeId =
  | "none"
  | "snow"
  | "rain"
  | "leaves"
  | "waves"
  | "sakura"
  | "fireflies"
  | "confetti"
  | "stars"
  | "solid"

export interface BackgroundTheme {
  id: BackgroundThemeId
  label: string
  emoji: string
  /**
   * Fragmento que se agrega al prompt de Gemini para pedirle que coloque a
   * la persona sobre esta escena. `null` para "Ninguno" (no se toca el
   * fondo original de la foto).
   */
  promptFragment: string | null
}

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  { id: "none", label: "Original", emoji: "🚫", promptFragment: null },
  {
    id: "snow",
    label: "Nieve",
    emoji: "❄️",
    promptFragment:
      "Replace the background with a realistic snowy winter landscape (snow-covered ground, " +
      "snow-dusted trees, soft overcast winter light), keeping the person's pose, clothing, and " +
      "exact identity completely unchanged. Blend the lighting and color tone on the person " +
      "naturally with the new snowy scene.",
  },
  {
    id: "rain",
    label: "Lluvia",
    emoji: "🌧️",
    promptFragment:
      "Replace the background with a realistic rainy city street at dusk (wet reflective pavement, " +
      "gentle rain, glowing streetlights), keeping the person's pose, clothing, and exact identity " +
      "completely unchanged. Blend the lighting and color tone on the person naturally with the new " +
      "rainy scene.",
  },
  {
    id: "leaves",
    label: "Otoño",
    emoji: "🍂",
    promptFragment:
      "Replace the background with a realistic autumn forest path covered in fallen orange and red " +
      "leaves, keeping the person's pose, clothing, and exact identity completely unchanged. Blend " +
      "the lighting and color tone on the person naturally with the new autumn scene.",
  },
  {
    id: "waves",
    label: "Playa",
    emoji: "🌊",
    promptFragment:
      "Replace the background with a realistic sunny beach with a clear horizon and gentle ocean " +
      "waves, keeping the person's pose, clothing, and exact identity completely unchanged. Blend " +
      "the lighting and color tone on the person naturally with the new beach scene.",
  },
  {
    id: "sakura",
    label: "Sakura",
    emoji: "🌸",
    promptFragment:
      "Replace the background with a realistic park full of cherry blossom (sakura) trees in full " +
      "bloom under soft spring light, keeping the person's pose, clothing, and exact identity " +
      "completely unchanged. Blend the lighting and color tone on the person naturally with the new " +
      "cherry blossom scene.",
  },
  {
    id: "fireflies",
    label: "Luciérnagas",
    emoji: "✨",
    promptFragment:
      "Replace the background with a realistic magical forest clearing at night, softly lit by " +
      "moonlight, keeping the person's pose, clothing, and exact identity completely unchanged. " +
      "Blend the lighting and color tone on the person naturally with the new nighttime forest scene.",
  },
  {
    id: "confetti",
    label: "Confeti",
    emoji: "🎉",
    promptFragment:
      "Replace the background with a realistic festive celebration scene with warm bokeh string " +
      "lights out of focus in the distance, keeping the person's pose, clothing, and exact identity " +
      "completely unchanged. Blend the lighting and color tone on the person naturally with the new " +
      "celebration scene.",
  },
  {
    id: "stars",
    label: "Estrellas",
    emoji: "⭐",
    promptFragment:
      "Replace the background with a realistic clear night sky full of stars over a scenic landscape " +
      "silhouette, softly lit by moonlight, keeping the person's pose, clothing, and exact identity " +
      "completely unchanged. Blend the lighting and color tone on the person naturally with the new " +
      "starry night scene.",
  },
  {
    // El texto exacto del prompt se arma en el momento con el color elegido
    // por el usuario (ver buildSolidColorPromptFragment en route.ts), así
    // que aquí no hace falta un promptFragment fijo.
    id: "solid",
    label: "Color sólido",
    emoji: "🎨",
    promptFragment: null,
  },
]

export function getBackgroundTheme(id: BackgroundThemeId | undefined | null): BackgroundTheme {
  return BACKGROUND_THEMES.find((t) => t.id === id) ?? BACKGROUND_THEMES[0]
}

/**
 * Partícula genérica. No todos los campos se usan en todas las variantes
 * (p. ej. "rotation" solo importa para las hojas), pero compartir una sola
 * forma simplifica el step/draw genérico.
 */
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  rotation: number
  rotationSpeed: number
  hue: number
  phase: number
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function makeParticle(variant: BackgroundThemeId, width: number, height: number, spawnAnywhere: boolean): Particle {
  const x = randomBetween(0, width)
  const y = spawnAnywhere ? randomBetween(0, height) : -20

  switch (variant) {
    case "snow":
      return {
        x,
        y,
        vx: randomBetween(-8, 8),
        vy: randomBetween(18, 45),
        size: randomBetween(1.5, 4),
        opacity: randomBetween(0.4, 0.9),
        rotation: 0,
        rotationSpeed: 0,
        hue: 0,
        phase: randomBetween(0, Math.PI * 2),
      }
    case "rain":
      return {
        x,
        y,
        vx: -25,
        vy: randomBetween(450, 750),
        size: randomBetween(1, 1.8),
        opacity: randomBetween(0.25, 0.55),
        rotation: 0,
        rotationSpeed: 0,
        hue: 0,
        phase: 0,
      }
    case "leaves":
      return {
        x,
        y,
        vx: randomBetween(-15, 15),
        vy: randomBetween(20, 45),
        size: randomBetween(5, 10),
        opacity: randomBetween(0.55, 0.95),
        rotation: randomBetween(0, Math.PI * 2),
        rotationSpeed: randomBetween(-1.5, 1.5),
        hue: [25, 15, 40, 50][Math.floor(Math.random() * 4)], // naranja/rojo/ámbar/amarillo
        phase: randomBetween(0, Math.PI * 2),
      }
    case "sakura":
      return {
        x,
        y,
        vx: randomBetween(-6, 6),
        vy: randomBetween(12, 28),
        size: randomBetween(4, 7),
        opacity: randomBetween(0.6, 0.95),
        rotation: randomBetween(0, Math.PI * 2),
        rotationSpeed: 0, // el pétalo aletea (oscila), no gira sin parar como una hoja
        hue: [340, 350, 330][Math.floor(Math.random() * 3)], // rosados
        phase: randomBetween(0, Math.PI * 2),
      }
    case "fireflies":
      return {
        x,
        y,
        vx: randomBetween(-6, 6),
        vy: randomBetween(-14, -4), // flotan hacia arriba
        size: randomBetween(1.5, 3),
        opacity: randomBetween(0.3, 1),
        rotation: 0,
        rotationSpeed: 0,
        hue: 70, // amarillo-verdoso cálido
        phase: randomBetween(0, Math.PI * 2),
      }
    case "confetti":
      return {
        x,
        y,
        vx: randomBetween(-25, 25),
        vy: randomBetween(80, 160),
        size: randomBetween(3, 6),
        opacity: randomBetween(0.8, 1),
        rotation: randomBetween(0, Math.PI * 2),
        rotationSpeed: randomBetween(-6, 6),
        hue: Math.floor(Math.random() * 360), // multicolor
        phase: randomBetween(0, Math.PI * 2),
      }
    case "stars":
      return {
        x,
        y: randomBetween(0, height), // fijas: no caen ni suben
        vx: 0,
        vy: 0,
        size: randomBetween(0.8, 2.2),
        opacity: randomBetween(0.3, 1),
        rotation: 0,
        rotationSpeed: randomBetween(0.5, 1.5), // reutilizado como velocidad de titileo
        hue: 0,
        phase: randomBetween(0, Math.PI * 2),
      }
    case "waves":
      // Las "olas" no son partículas individuales sino unas pocas bandas
      // horizontales; reutilizamos el mismo tipo guardando la fase en cada una.
      return { x: 0, y: 0, vx: 0, vy: 0, size: 0, opacity: 0, rotation: 0, rotationSpeed: 0, hue: 0, phase: randomBetween(0, Math.PI * 2) }
    default:
      return { x, y, vx: 0, vy: 0, size: 0, opacity: 0, rotation: 0, rotationSpeed: 0, hue: 0, phase: 0 }
  }
}

export function createParticles(variant: BackgroundThemeId, width: number, height: number): Particle[] {
  if (variant === "none" || variant === "solid" || width <= 0 || height <= 0) return []

  const count =
    variant === "rain"
      ? 110
      : variant === "snow"
        ? 60
        : variant === "leaves" || variant === "sakura"
          ? 28
          : variant === "confetti"
            ? 70
            : variant === "fireflies"
              ? 25
              : variant === "stars"
                ? 90
                : 4 // waves: 4 bandas

  return Array.from({ length: count }, () => makeParticle(variant, width, height, true))
}

/** Avanza la simulación un `dt` (segundos) y devuelve el array actualizado (misma referencia, mutado in-place). */
export function stepParticles(
  variant: BackgroundThemeId,
  particles: Particle[],
  width: number,
  height: number,
  dt: number,
): Particle[] {
  if (variant === "none" || variant === "solid" || width <= 0 || height <= 0) return particles

  for (const p of particles) {
    switch (variant) {
      case "snow":
        p.phase += dt
        p.x += (p.vx + Math.sin(p.phase) * 12) * dt
        p.y += p.vy * dt
        if (p.y > height + 5 || p.x < -10 || p.x > width + 10) {
          p.y = -5
          p.x = randomBetween(0, width)
        }
        break
      case "rain":
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.y > height + 10) {
          p.y = -10
          p.x = randomBetween(0, width)
        }
        break
      case "leaves":
        p.phase += dt * 1.5
        p.x += (p.vx + Math.sin(p.phase) * 25) * dt
        p.y += p.vy * dt
        p.rotation += p.rotationSpeed * dt
        if (p.y > height + 10) {
          p.y = -10
          p.x = randomBetween(0, width)
        }
        break
      case "sakura":
        p.phase += dt * 1.2
        // aletea (oscila) en vez de girar sin parar como una hoja pesada
        p.rotation = Math.sin(p.phase) * 0.6
        p.x += (p.vx + Math.sin(p.phase * 0.7) * 20) * dt
        p.y += p.vy * dt
        if (p.y > height + 10) {
          p.y = -10
          p.x = randomBetween(0, width)
        }
        break
      case "fireflies":
        p.phase += dt * 2
        p.x += (p.vx + Math.sin(p.phase) * 8) * dt
        p.y += (p.vy + Math.cos(p.phase * 0.6) * 4) * dt
        // parpadeo: la opacidad "real" se calcula al dibujar a partir de phase
        if (p.y < -10) {
          p.y = height + 10
          p.x = randomBetween(0, width)
        }
        break
      case "confetti":
        p.phase += dt
        p.x += (p.vx + Math.sin(p.phase * 3) * 15) * dt
        p.y += p.vy * dt
        p.rotation += p.rotationSpeed * dt
        if (p.y > height + 10) {
          p.y = -10
          p.x = randomBetween(0, width)
        }
        break
      case "stars":
        // fijas en su lugar; solo titilan (ver drawParticles)
        p.phase += dt * p.rotationSpeed
        break
      case "waves":
        p.phase += dt * 0.8
        break
    }
  }
  return particles
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  variant: BackgroundThemeId,
  particles: Particle[],
  width: number,
  height: number,
): void {
  if (variant === "none" || variant === "solid") return

  switch (variant) {
    case "snow":
      ctx.fillStyle = "rgba(255,255,255,1)"
      for (const p of particles) {
        ctx.globalAlpha = p.opacity
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      break

    case "rain":
      ctx.strokeStyle = "rgba(200,220,255,1)"
      ctx.lineWidth = 1
      for (const p of particles) {
        ctx.globalAlpha = p.opacity
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x + p.vx * 0.02, p.y - 14)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      break

    case "leaves":
      for (const p of particles) {
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = `hsl(${p.hue}, 75%, 50%)`
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      ctx.globalAlpha = 1
      break

    case "sakura":
      for (const p of particles) {
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = `hsl(${p.hue}, 85%, 82%)`
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      ctx.globalAlpha = 1
      break

    case "fireflies":
      for (const p of particles) {
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.phase))
        const alpha = p.opacity * twinkle
        // resplandor suave alrededor del punto
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
        glow.addColorStop(0, `hsla(${p.hue}, 90%, 70%, ${alpha})`)
        glow.addColorStop(1, `hsla(${p.hue}, 90%, 70%, 0)`)
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
        ctx.fill()
        // punto brillante central
        ctx.globalAlpha = alpha
        ctx.fillStyle = `hsl(${p.hue}, 90%, 85%)`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      break

    case "confetti":
      for (const p of particles) {
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = `hsl(${p.hue}, 85%, 60%)`
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66)
        ctx.restore()
      }
      ctx.globalAlpha = 1
      break

    case "stars":
      ctx.fillStyle = "rgba(255,255,255,1)"
      for (const p of particles) {
        const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(p.phase))
        ctx.globalAlpha = p.opacity * twinkle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      break

    case "waves": {
      const bandHeight = height * 0.16
      particles.forEach((p, i) => {
        const baseY = height - bandHeight * (i + 1) * 0.8
        ctx.beginPath()
        ctx.moveTo(0, baseY)
        const step = 12
        for (let x = 0; x <= width; x += step) {
          const y = baseY + Math.sin(x * 0.025 + p.phase + i) * 6
          ctx.lineTo(x, y)
        }
        ctx.lineTo(width, height)
        ctx.lineTo(0, height)
        ctx.closePath()
        ctx.fillStyle = `rgba(255,255,255,${0.05 + i * 0.03})`
        ctx.fill()
      })
      break
    }
  }
}
