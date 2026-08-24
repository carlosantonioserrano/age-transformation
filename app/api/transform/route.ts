import { type NextRequest, NextResponse } from "next/server"
import { createJobId, isProviderConfigured, jobStore, runMockJob } from "@/lib/transform-store"
import type { StartTransformRequest, StartTransformResponse, TransformJob } from "@/lib/types"

export const maxDuration = 30

// Age-transformation model on Replicate (SAM-based face re-aging: "Only a
// Matter of Style"). Community models must be called via the versioned
// /v1/predictions endpoint with an explicit version hash — the model-scoped
// endpoint only works for official Replicate models and 404s otherwise.
const REPLICATE_MODEL_OWNER = "yuval-alaluf"
const REPLICATE_MODEL_NAME = "sam"
const REPLICATE_MODEL_VERSION = "9222a21c181b707209ef12b5e0d7e94c994b58f01c7b2fec075d2e892362f13c"

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

    if (!response.ok) {
      return null
    }
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
  let usingRealProvider = false

  if (providerConfigured) {
    const externalId = await startReplicateJob(body.image, ageShift)
    if (externalId) {
      job.status = "processing"
      job.progress = 10
      job.simulated = false
      job.externalId = externalId
      jobStore.set(jobId, job)
      usingRealProvider = true
    }
  }

  // Only fall back to the simulated pipeline when no provider key is
  // configured, or the real Replicate call failed to start. A running real
  // job is polled for its actual status/output by the GET route instead of
  // being overwritten by the mock timers.
  if (!usingRealProvider) {
    runMockJob(jobId)
  }

  const payload: StartTransformResponse = { jobId }
  return NextResponse.json(payload)
}
