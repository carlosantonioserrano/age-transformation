import { type NextRequest, NextResponse } from "next/server"
import { createJobId, isProviderConfigured, jobStore, runMockJob } from "@/lib/transform-store"
import type { StartTransformRequest, StartTransformResponse, TransformJob } from "@/lib/types"
import { getBackgroundTheme, type BackgroundThemeId } from "@/lib/particle-effects"

export const maxDuration = 30

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
    `Replace the background with a solid, seamless, evenly lit studio backdrop in the exact color ` +
    `${hex} — like a professional headshot backdrop, with no gradients, no shadows, no texture, and no ` +
    "objects of any kind, keeping the person's pose, clothing, and exact identity completely unchanged. " +
    "Blend the lighting on the person naturally with this solid-color backdrop."
  )
}

function buildAgeTransformPrompt(targetAge: number, background: BackgroundThemeId, backgroundColor?: string): string {
  const basePrompt =
    `Change the apparent age of the person in this photo so they look exactly ` +
    `${targetAge} years old — this may mean making them look older or younger ` +
    "than they currently appear. " +
    "Precisely preserve their exact facial identity, gender, ethnicity, face shape, " +
    "eye color, hairstyle (the general cut/style), facial expression, and any " +
    "distinctive features (e.g. moles, freckles, scars), as well as their clothing" +
    (background === "none" ? " and the original photo's background, pose, and lighting. " : ", and pose. ") +
    "Naturally adjust only the features that change with age to match a " +
    `${targetAge}-year-old appearance: skin texture and wrinkles (adding or smoothing ` +
    "them as needed), hair color (greying or restoring its natural color), hair " +
    "thickness and hairline, and other realistic signs of aging or youthfulness. " +
    "Do not change who the person is."

  const backgroundFragment =
    background === "solid" ? buildSolidColorPromptFragment(sanitizeHexColor(backgroundColor)) : getBackgroundTheme(background).promptFragment
  return backgroundFragment ? `${basePrompt} ${backgroundFragment}` : basePrompt
}

/** Splits a `data:image/png;base64,AAAA...` URL into its mime type and raw base64 payload. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

/**
 * Calls Gemini 2.5 Flash Image and returns the edited photo as a
 * `data:` URL, or null if the key is missing, the request fails, or the
 * model didn't return an image part.
 */
async function runGeminiTransform(
  image: string,
  targetAge: number,
  background: BackgroundThemeId,
  backgroundColor: string | undefined,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

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
            parts: [
              { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
              { text: buildAgeTransformPrompt(targetAge, background, backgroundColor) },
            ],
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
