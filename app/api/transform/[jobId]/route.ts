import { type NextRequest, NextResponse } from "next/server"
import { jobStore } from "@/lib/transform-store"
import type { JobStatusResponse } from "@/lib/types"

// Polls a real Replicate prediction and mutates the in-memory job to reflect
// its actual status/output, instead of relying on the mock timers.
async function syncWithReplicate(job: NonNullable<ReturnType<(typeof jobStore)["get"]>>) {
  const token = process.env.REPLICATE_API_KEY
  if (!job.externalId || !token) return job

  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${job.externalId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!response.ok) return job

    const prediction = await response.json()

    switch (prediction.status) {
      case "starting":
        job.status = "processing"
        job.progress = Math.max(job.progress, 15)
        break
      case "processing":
        job.status = "processing"
        job.progress = Math.max(job.progress, 60)
        break
      case "succeeded": {
        const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
        job.status = "succeeded"
        job.progress = 100
        job.resultImage = output ?? job.sourceImage
        break
      }
      case "failed":
      case "canceled":
        job.status = "failed"
        job.error = prediction.error ?? "La transformación falló en el proveedor."
        break
      default:
        break
    }

    jobStore.set(job.id, job)
  } catch {
    // Network hiccup polling Replicate — keep the job's last known state and
    // let the client retry on the next poll tick.
  }

  return job
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  let job = jobStore.get(jobId)

  if (!job) {
    return NextResponse.json({ error: "Job no encontrado." }, { status: 404 })
  }

  if (job.externalId && !job.simulated && job.status !== "succeeded" && job.status !== "failed") {
    job = await syncWithReplicate(job)
  }

  const payload: JobStatusResponse = {
    id: job.id,
    status: job.status,
    progress: job.progress,
    resultImage: job.resultImage,
    error: job.error,
    simulated: job.simulated,
  }

  return NextResponse.json(payload)
}
