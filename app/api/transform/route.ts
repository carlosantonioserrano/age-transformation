import { type NextRequest, NextResponse } from "next/server"
import { createJobId, isProviderConfigured, jobStore, runMockJob } from "@/lib/transform-store"
import type { StartTransformRequest, StartTransformResponse, TransformJob } from "@/lib/types"
import { getBackgroundTheme, type BackgroundThemeId } from "@/lib/particle-effects"

export const maxDuration = 60

// Identity-preserving age-transformation via Gemini 2.5 Flash Image
// ("nano banana"), Google's instruction-guided image editing model. This
// replaced Replicate/Flux Kontext Pro. Unlike Replicate, the Gemini API is
// synchronous: a single generateContent call returns the edited image
// directly, so there's no external job id to poll — we just run the call
// inside the POST handler and store the finished result right away.
const GEMINI_MODEL_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent"

/** Valida un color hex (#rgb o #rrggbb); si no es válido, cae a un gris neutro. */
function sanitizeHexColor(hex: string | undefined): string {
  if (hex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return hex
  return "#f5f5f5"
}

function buildSolidColorPromptFragment(hex: string): string {
  return (
    `a solid, seamless, evenly lit studio backdrop in the exact color ${hex} — like a professional ` +
    "headshot backdrop, with no gradients, no shadows, no texture, and no objects of any kind"
  )
}

/**
 * Prompt de UN SOLO trabajo: solo cambia la edad, preservando el fondo
 * original tal cual. Esta es la fórmula probada que siempre funcionó bien
 * antes de agregar los fondos temáticos — se usa siempre como primer paso,
 * sin importar el fondo elegido, para no arriesgar su fiabilidad mezclándola
 * con otra instrucción en la misma llamada.
 */
function buildAgeOnlyPrompt(targetAge: number): string {
  return (
    `Change the apparent age of the person in this photo so they look exactly ` +
    `${targetAge} years old — this may mean making them look older or younger ` +
    "than they currently appear. " +
    "Precisely preserve their exact facial identity, gender, ethnicity, face shape, " +
    "eye color, hairstyle (the general cut/style), facial expression, and any " +
    "distinctive features (e.g. moles, freckles, scars), as well as their clothing " +
    "and the original photo's background, pose, and lighting. " +
    "Naturally adjust only the features that change with age to match a " +
    `${targetAge}-year-old appearance: skin texture and wrinkles (adding or smoothing ` +
    "them as needed), hair color (greying or restoring its natural color), hair " +
    "thickness and hairline, and other realistic signs of aging or youthfulness. " +
    "Do not change who the person is."
  )
}

/**
 * Prompt de UN SOLO trabajo: solo reemplaza el fondo de una foto ya
 * transformada. Se aplica en un segundo paso, sobre el resultado de
 * buildAgeOnlyPrompt, nunca junto con el cambio de edad — así el modelo no
 * tiene que repartir su atención entre dos instrucciones a la vez.
 */
function buildBackgroundReplacePrompt(sceneDescription: string): string {
  return (
    `Replace ONLY the background of this photo with ${sceneDescription}. ` +
    "The person must remain exactly as they appear in this photo — same face, exact age, expression, " +
    "pose, and clothing, completely unchanged. The person must stay fully visible, in sharp focus, and " +
    "entirely in the foreground: do not place any background element (such as waves, leaves, snow, " +
    "rain, lights, or anything else) in front of, overlapping, or obscuring any part of the person. " +
    "Only the scene behind them changes."
  )
}

function getBackgroundSceneDescription(background: BackgroundThemeId, backgroundColor: string | undefined): string | null {
  if (background === "solid") return buildSolidColorPromptFragment(sanitizeHexColor(backgroundColor))
  const theme = getBackgroundTheme(background)
  return theme.promptFragment
}

/** Splits a `data:image/png;base64,AAAA...` URL into its mime type and raw base64 payload. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

/** Llamada genérica de un solo paso a Gemini: una imagen + un prompt, devuelve la imagen editada. */
async function callGeminiEdit(image: string, prompt: string, apiKey: string): Promise<string | null> {
  const parsed = parseDataUrl(image)
  if (!parsed) {
    console.error("Gemini: la imagen de origen no tiene el formato data URL esperado.")
    return null
  }

  try {
    const response = await fetch(GEMINI_MODEL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: parsed.mimeType, data: parsed.data } }, { text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("Gemini: fallo al generar la imagen", response.status, detail)
      return null
    }

    const data = await response.json()
    const parts = data?.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData?.data)

    if (!imagePart?.inlineData?.data) {
      console.error("Gemini: la respuesta no incluyó ninguna imagen.")
      return null
    }

    const outMimeType = imagePart.inlineData.mimeType ?? "image/png"
    return `data:${outMimeType};base64,${imagePart.inlineData.data}`
  } catch (err) {
    console.error("Gemini: error de red al generar la imagen", err)
    return null
  }
}

/**
 * Orquesta la transformación completa en hasta 2 pasos secuenciales:
 *   1. Cambio de edad únicamente (prompt de un solo trabajo, el que siempre
 *      funcionó bien).
 *   2. Si se eligió un fondo temático, una SEGUNDA llamada que solo
 *      reemplaza el fondo de la foto ya envejecida/rejuvenecida.
 * Separarlo en 2 llamadas evita que el modelo tenga que repartir su
 * atención entre "cambiar la edad" y "cambiar el fondo" en una sola
 * instrucción, que es lo que causaba resultados inconsistentes (edad sin
 * aplicar, o elementos del fondo tapando a la persona).
 */
async function runGeminiTransform(
  image: string,
  targetAge: number,
  background: BackgroundThemeId,
  backgroundColor: string | undefined,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const agedImage = await callGeminiEdit(image, buildAgeOnlyPrompt(targetAge), apiKey)
  if (!agedImage) return null

  const sceneDescription = getBackgroundSceneDescription(background, backgroundColor)
  if (!sceneDescription) return agedImage // "none": no hay segundo paso

  const finalImage = await callGeminiEdit(agedImage, buildBackgroundReplacePrompt(sceneDescription), apiKey)
  // Si el segundo paso falla, mejor entregar la foto con la edad ya cambiada
  // (y el fondo original) que no entregar nada.
  return finalImage ?? agedImage
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as StartTransformRequest

  if (!body?.image) {
    return NextResponse.json({ error: "Falta la imagen de origen." }, { status: 400 })
  }

  const targetAge = Math.max(1, Math.min(100, body.targetAge ?? 50))
  const background = getBackgroundTheme(body.background as BackgroundThemeId).id
  const jobId = createJobId()

  const job: TransformJob = {
    id: jobId,
    status: "queued",
    targetAge,
    sourceImage: body.image,
    progress: 5,
    createdAt: Date.now(),
    simulated: true,
  }
  jobStore.set(jobId, job)

  const providerConfigured = isProviderConfigured()
  let usingRealProvider = false

  if (providerConfigured) {
    job.status = "processing"
    job.progress = 40
    jobStore.set(jobId, job)

    const resultImage = await runGeminiTransform(body.image, targetAge, background, body.backgroundColor)
    if (resultImage) {
      job.status = "succeeded"
      job.progress = 100
      job.simulated = false
      job.resultImage = resultImage
      jobStore.set(jobId, job)
      usingRealProvider = true
      // Gemini responde en la misma llamada, así que el job ya queda
      // resuelto aquí. GET /api/transform/[jobId] solo lee este estado.
    }
  }

  // Only fall back to the simulated pipeline when the real provider didn't
  // produce a result (no key configured, or Gemini failed/errored).
  if (!usingRealProvider) {
    runMockJob(jobId)
  }

  const payload: StartTransformResponse = { jobId }
  return NextResponse.json(payload)
}
