import { type NextRequest, NextResponse } from "next/server"
import { createJobId, isProviderConfigured, jobStore, runMockJob } from "@/lib/transform-store"
import type { StartTransformRequest, StartTransformResponse, TransformJob } from "@/lib/types"

export const maxDuration = 30

// Identity-preserving age-transformation via Flux Kontext Pro (Black Forest
// Labs), an instruction-guided image editing model. This replaced the
// yuval-alaluf/sam model, which frequently failed to preserve the subject's
// identity (and sometimes even apparent gender) because it reconstructs the
// whole face from a StyleGAN latent instead of editing the original pixels.
//
// Flux Kontext Pro is an "official model" on Replicate, so it's called via
// POST /v1/models/{owner}/{name}/predictions and does NOT take a `version`
// field (unlike community models such as SAM).
const FLUX_KONTEXT_MODEL_ENDPOINT = "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions"

function buildAgeTransformPrompt(targetAge: number): string {
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

async function startReplicateJob(image: string, targetAge: number): Promise<string | null> {
  const token = process.env.REPLICATE_API_KEY
  if (!token) return null

  try {
    const response = await fetch(FLUX_KONTEXT_MODEL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=0", // return immediately with status "starting"; we poll ourselves
      },
      body: JSON.stringify({
        input: {
          prompt: buildAgeTransformPrompt(targetAge),
          input_image: image,
          aspect_ratio: "match_input_image",
          output_format: "png",
          safety_tolerance: 2, // 2 is the max allowed by Replicate when an input image is used
        },
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("Replicate: fallo al crear la predicción", response.status, detail)
      return null
    }

    const data = await response.json()
    return data?.id ?? null
  } catch (err) {
    console.error("Replicate: error de red al crear la predicción", err)
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as StartTransformRequest

  if (!body?.image) {
    return NextResponse.json({ error: "Falta la imagen de origen." }, { status: 400 })
  }

  const targetAge = Math.max(1, Math.min(100, body.targetAge ?? 50))
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
    const externalId = await startReplicateJob(body.image, targetAge)
    if (externalId) {
      job.status = "processing"
      job.progress = 10
      job.simulated = false
      job.externalId = externalId
      jobStore.set(jobId, job)
      usingRealProvider = true
      // The GET /api/transform/[jobId] route polls Replicate directly using
      // `externalId` and updates this job's status/resultImage as it advances.
    }
  }

  // Only fall back to the simulated pipeline when there is no real provider
  // job running (no key configured, or Replicate failed to accept the job).
  if (!usingRealProvider) {
    runMockJob(jobId)
  }

  const payload: StartTransformResponse = { jobId }
  return NextResponse.json(payload)
}
