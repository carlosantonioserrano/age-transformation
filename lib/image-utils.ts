/**
 * Baseline age used only to derive a purely cosmetic "older/younger"
 * direction for the simulated-mode filter below. It has no bearing on the
 * real provider call, which now sends the user's chosen target age directly.
 */
const SIMULATED_FILTER_BASELINE_AGE = 35

/**
 * Returns a CSS/canvas filter string that visually hints at an aging or
 * de-aging effect. Used only while the app runs in simulation mode (no
 * real age-transformation provider configured), so the demo still shows a
 * meaningfully different "after" image instead of an identical copy.
 */
export function getSimulatedFilter(targetAge: number): string {
  const ageShift = targetAge - SIMULATED_FILTER_BASELINE_AGE
  const t = Math.min(1, Math.abs(ageShift) / 50)
  if (t === 0) return "none"

  if (ageShift > 0) {
    // Aged look: warmer, higher contrast, slightly desaturated and dimmer.
    return `sepia(${(0.12 + 0.3 * t).toFixed(2)}) contrast(${(1 + 0.22 * t).toFixed(2)}) brightness(${(1 - 0.13 * t).toFixed(2)}) saturate(${(1 - 0.28 * t).toFixed(2)})`
  }

  // Younger look: brighter, softer, more saturated.
  return `brightness(${(1 + 0.1 * t).toFixed(2)}) saturate(${(1 + 0.22 * t).toFixed(2)}) contrast(${(1 - 0.08 * t).toFixed(2)}) blur(${(0.25 * t).toFixed(2)}px)`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Renders the before/after pair side by side onto a canvas with labels and
 * triggers a PNG download of the composite comparison image.
 */
export async function downloadComparisonImage(
  beforeSrc: string,
  afterSrc: string,
  afterFilter: string,
  filename = "agelab-comparacion.png",
) {
  const [before, after] = await Promise.all([loadImage(beforeSrc), loadImage(afterSrc)])

  const panelWidth = 480
  const panelHeight = Math.round((panelWidth * before.height) / before.width)
  const gap = 8
  const labelHeight = 40

  const canvas = document.createElement("canvas")
  canvas.width = panelWidth * 2 + gap
  canvas.height = panelHeight + labelHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No se pudo crear el contexto de canvas.")

  ctx.fillStyle = "#141311"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.filter = "none"
  ctx.drawImage(before, 0, labelHeight, panelWidth, panelHeight)

  ctx.filter = afterFilter
  ctx.drawImage(after, panelWidth + gap, labelHeight, panelWidth, panelHeight)
  ctx.filter = "none"

  ctx.fillStyle = "#f2c675"
  ctx.font = "600 20px sans-serif"
  ctx.textBaseline = "middle"
  ctx.fillText("ANTES", 12, labelHeight / 2)
  ctx.fillText("DESPUÉS", panelWidth + gap + 12, labelHeight / 2)

  const url = canvas.toDataURL("image/png")
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
}
