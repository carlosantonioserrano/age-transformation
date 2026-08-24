import { NextResponse } from "next/server"
import { createJobId, isProviderConfigured, jobStore } from "@/lib/transform-store"
import type { StartTransformRequest, StartTransformResponse, TransformJob } from "@/lib/types"

export const maxDuration = 60

// Current published SAM version on Replicate.
const REPLICATE_MODEL_VERSION =
  "9222a21c181b707209ef12b5e0d7e94c994b58f01c7b2fec075d2e892362f13c"

async function startReplicateJob(image: string, targetAge: number): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
  if (!token) return null

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: REPLICATE_MODEL_VERSION,
      input: {
        image,
        target_age: String(targetAge),
      },
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(`Replicate ${response.status}: ${message}`)
  }

  const data = await response.json()
  if (!data?.id) throw new Error("Replicate no devolvió un prediction id.")
  return data.id
}

export async function POST(req: Request) {
  let body: StartTransformRequest

  try {
    body = (await req.json()) as StartTransformRequest
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 })
  }

  if (!body?.image) {
    return NextResponse.json({ error: "Falta la imagen de origen." }, { status: 400 })
  }

  const ageShift = Math.max(-50, Math.min(50, Number(body.ageShift ?? 20)))

  // SAM expects a target age, not a relative age shift. For this app we use
  // the slider around a reasonable current-age baseline; this can later be
  // replaced with face-age estimation for a truly personalized target age.
  const assumedCurrentAge = 30
  const targetAge = Math.max(0, Math.min(100, assumedCurrentAge + ageShift))
  const jobId = createJobId()

  const job: TransformJob = {
    id: jobId,
    status: "queued",
    ageShift,
    targetAge,
    sourceImage: body.image,
    progress: 5,
    createdAt: Date.now(),
    simulated: true,
  }
  jobStore.set(jobId, job)

  if (!isProviderConfigured()) {
    job.status = "failed"
    job.error = "No hay REPLICATE_API_TOKEN (o REPLICATE_API_KEY) configurado."
    job.progress = 100
    jobStore.set(jobId, job)
    return NextResponse.json({ jobId } satisfies StartTransformResponse)
  }

  try {
    const externalId = await startReplicateJob(body.image, targetAge)
    job.externalId = externalId
    job.status = "processing"
    job.progress = 10
    job.simulated = false
    jobStore.set(jobId, job)
  } catch (error) {
    job.status = "failed"
    job.progress = 100
    job.error = error instanceof Error ? error.message : "No se pudo iniciar Replicate."
    jobStore.set(jobId, job)
  }

  return NextResponse.json({ jobId } satisfies StartTransformResponse)
}
