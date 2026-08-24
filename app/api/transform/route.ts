import { type NextRequest, NextResponse } from "next/server"
import { createJobId, isProviderConfigured, jobStore, runMockJob } from "@/lib/transform-store"
import type { StartTransformRequest, StartTransformResponse, TransformJob } from "@/lib/types"

export const maxDuration = 30

// Age-transformation model on Replicate (SAM-based face re-aging). Swap for
// any other inpainting/age-transform model version as needed.
const REPLICATE_MODEL_VERSION = "9222a21c181b707209ef12b5e0d3b4bc46b6b8bd2ff2a58d09b3fecc21e3ab60"

async function startReplicateJob(image: string, ageShift: number): Promise<string | null> {
  const token = process.env.REPLICATE_API_KEY
  if (!token) return null

  try {
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION,
        input: { image, target_age: String(ageShift) },
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    return data?.id ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as StartTransformRequest

  if (!body?.image) {
    return NextResponse.json({ error: "Falta la imagen de origen." }, { status: 400 })
  }

  const ageShift = Math.max(-50, Math.min(50, body.ageShift ?? 20))
  const jobId = createJobId()

  const job: TransformJob = {
    id: jobId,
    status: "queued",
    ageShift,
    sourceImage: body.image,
    progress: 5,
    createdAt: Date.now(),
    simulated: true,
  }
  jobStore.set(jobId, job)

  const providerConfigured = isProviderConfigured()

  if (providerConfigured) {
    const externalId = await startReplicateJob(body.image, ageShift)
    if (externalId) {
      job.status = "processing"
      job.progress = 10
      job.simulated = false
      jobStore.set(jobId, job)
      // A real integration would poll Replicate's prediction endpoint using
      // `externalId` from the GET route below instead of the mock timers.
    }
  }

  // Always run the simulated pipeline as a safe fallback so the UI keeps
  // working end-to-end even without a configured provider key.
  runMockJob(jobId)

  const payload: StartTransformResponse = { jobId }
  return NextResponse.json(payload)
}
