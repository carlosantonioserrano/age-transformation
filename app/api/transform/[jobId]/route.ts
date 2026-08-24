import { NextResponse } from "next/server"
import { jobStore } from "@/lib/transform-store"
import type { JobStatusResponse } from "@/lib/types"

const REPLICATE_STATUS_PROGRESS: Record<string, number> = {
  starting: 15,
  processing: 50,
  succeeded: 100,
  failed: 100,
  canceled: 100,
}

function normalizeOutput(output: unknown): string | undefined {
  if (typeof output === "string") return output
  if (Array.isArray(output)) {
    const first = output[0]
    if (typeof first === "string") return first
    if (first && typeof first === "object" && "file" in first && typeof first.file === "string") {
      return first.file
    }
  }
  if (output && typeof output === "object" && "file" in output && typeof output.file === "string") {
    return output.file
  }
  return undefined
}

async function syncReplicateJob(job: NonNullable<ReturnType<typeof jobStore.get>>) {
  const token = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY
  if (!token || !job.externalId) return

  const response = await fetch(`https://api.replicate.com/v1/predictions/${job.externalId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (!response.ok) throw new Error(`No se pudo consultar Replicate (${response.status}).`)

  const prediction = await response.json()
  job.progress = REPLICATE_STATUS_PROGRESS[prediction.status] ?? job.progress

  if (prediction.status === "succeeded") {
    const output = normalizeOutput(prediction.output)
    if (!output) throw new Error("Replicate terminó correctamente pero no devolvió una imagen.")
    job.resultImage = output
    job.status = "succeeded"
    job.simulated = false
  } else if (prediction.status === "failed" || prediction.status === "canceled") {
    job.status = "failed"
    job.error = prediction.error || `Replicate terminó con estado: ${prediction.status}.`
  } else {
    job.status = "processing"
  }

  jobStore.set(job.id, job)
}

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const job = jobStore.get(jobId)

  if (!job) {
    return NextResponse.json({ error: "Job no encontrado." }, { status: 404 })
  }

  try {
    if (job.externalId && (job.status === "queued" || job.status === "processing")) {
      await syncReplicateJob(job)
    }
  } catch (error) {
    job.status = "failed"
    job.progress = 100
    job.error = error instanceof Error ? error.message : "Error consultando Replicate."
    jobStore.set(jobId, job)
  }

  const payload: JobStatusResponse = {
    id: job.id,
    status: job.status,
    progress: job.progress,
    resultImage: job.resultImage,
    error: job.error,
    simulated: job.simulated,
  }

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } })
}
